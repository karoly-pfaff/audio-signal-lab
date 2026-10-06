import { audioEngine } from '../audio/AudioEngine';
import { loadAudioResources } from '../audio/audioLoadResources';
import { audioFileLimitError, decodedAudioLimitError } from '../audio/audioFileLimits';
import { detectBpm } from '../audio/bpm';
import { revokeArtworkUrl } from '../audio/metadata';
import type { TrackMetadata } from '../audio/types';
import { buildFileIdentity } from '../utils/fileIdentity';
import { applyReorder } from '../utils/layerOrder';
import type { FileActions } from './audioLabStoreTypes';
import { releaseArtworkIfUnreferenced } from './artworkLifecycle';
import { fileStateAfterLoadFailure, type FileLoadFailure } from './fileLoadFailure';
import { createDropFiles } from './fileDropActions';
import { captureFileMainIntent, syncFileToMainIntent } from './fileMainIntent';
import { pruneUnusedMedia } from './mediaRetention';
import { storeAudioFile } from './mediaStorage';
import { generateFileId, MAX_FILE_COUNT } from './persistence';
import { portableFilenameError } from './portableSession';
import type { StoreContext } from './storeContext';
import { createEmptyFile, createEmptyMainTrack } from './storeState';

function clearActiveFile(context: StoreContext, fileId: string): boolean {
  if (context.get().activeFileId !== fileId) {
    return false;
  }
  context.loads.nextMainGeneration();
  audioEngine.stop();
  audioEngine.clearMainBuffer();
  audioEngine.setMainLoop(false);
  audioEngine.setMainLoopPoints(0, 0);
  return true;
}

function createAddFile(context: StoreContext): FileActions['addFile'] {
  return () => {
    const { files } = context.get();
    if (files.length >= MAX_FILE_COUNT) {
      context.status.show(`File limit reached (${MAX_FILE_COUNT})`, 4000);
      return;
    }
    context.set((state) => ({
      files: [...state.files, createEmptyFile(files.length, generateFileId())],
    }));
  };
}

function acceptsEncodedFile(context: StoreContext, file: File): boolean {
  const error = portableFilenameError(file.name) ?? audioFileLimitError(file);
  if (!error) {
    return true;
  }
  context.status.show(error, 5000);
  return false;
}

function markFileLoading(context: StoreContext, fileId: string): void {
  context.set((state) => ({
    files: state.files.map((entry) =>
      entry.id === fileId ? { ...entry, loadingState: 'loading' as const, analysis: null } : entry,
    ),
  }));
}

function applyLoadedFile(
  context: StoreContext,
  loaded: {
    fileId: string;
    file: File;
    buffer: AudioBuffer;
    metadata: TrackMetadata;
    artworkUrl: string | null;
    assetId: string | null;
  },
): void {
  context.set((state) => ({
    files: state.files.map((entry) =>
      entry.id === loaded.fileId
        ? {
            ...entry,
            name: loaded.file.name,
            assetId: loaded.assetId,
            buffer: loaded.buffer,
            thumbnailUrl: loaded.artworkUrl,
            loadingState: 'loaded' as const,
            metadata: loaded.metadata,
            bpmAnalyzing: true,
            bpm: null,
            bpmConfidence: null,
            analysis: null,
            fileIdentity: buildFileIdentity(loaded.file, loaded.buffer),
          }
        : entry,
    ),
  }));
}

function startBpmDetection(
  context: StoreContext,
  fileId: string,
  generation: number,
  buffer: AudioBuffer,
): void {
  void detectBpm(buffer, context.loads.fileSignal?.(fileId)).then((result) => {
    if (!context.loads.isFileCurrent(fileId, generation)) {
      return;
    }
    context.set((state) => ({
      mainTrack:
        state.activeFileId === fileId && state.mainTrack.buffer === buffer
          ? {
              ...state.mainTrack,
              bpm: result?.bpm ?? null,
              bpmConfidence: result?.confidence ?? null,
              bpmAnalyzing: false,
            }
          : state.mainTrack,
      files: state.files.map((entry) =>
        entry.id === fileId
          ? {
              ...entry,
              bpm: result?.bpm ?? null,
              bpmConfidence: result?.confidence ?? null,
              bpmAnalyzing: false,
            }
          : entry,
      ),
    }));
  });
}

function markFileFailed(context: StoreContext, failure: FileLoadFailure): void {
  const { fileId, generation, previous, message = 'Failed to decode audio' } = failure;
  if (!context.loads.isFileCurrent(fileId, generation)) {
    return;
  }
  context.set((state) => ({
    files: state.files.map((entry) =>
      entry.id === fileId ? fileStateAfterLoadFailure(entry, previous) : entry,
    ),
  }));
  if (previous?.buffer && previous.bpmAnalyzing) {
    startBpmDetection(context, fileId, generation, previous.buffer);
  }
  context.status.show(message, message === 'Failed to decode audio' ? 4000 : 5000);
}

function createLoadFile(context: StoreContext): FileActions['loadFile'] {
  return async (fileId, file) => {
    if (!acceptsEncodedFile(context, file)) {
      return;
    }
    const state = context.get();
    const current = state.files.find((candidate) => candidate.id === fileId);
    const mainIntent = captureFileMainIntent(context, fileId, current);
    const generation = context.loads.nextFileGeneration(fileId);
    markFileLoading(context, fileId);
    try {
      const decode = (value: File) => audioEngine.decodeFile(value);
      const { buffer, metadata: result } = await loadAudioResources(file, decode);
      if (!context.loads.isFileCurrent(fileId, generation)) {
        revokeArtworkUrl(result.artworkUrl ?? null);
        return;
      }
      const decodedLimit = decodedAudioLimitError(buffer);
      if (decodedLimit) {
        revokeArtworkUrl(result.artworkUrl ?? null);
        markFileFailed(context, { fileId, generation, previous: current, message: decodedLimit });
        return;
      }
      const assetId = await storeAudioFile(file);
      if (!context.loads.isFileCurrent(fileId, generation)) {
        revokeArtworkUrl(result.artworkUrl ?? null);
        pruneUnusedMedia(context);
        return;
      }
      const metadata = { title: result.title, artist: result.artist, album: result.album };
      applyLoadedFile(context, {
        fileId,
        file,
        buffer,
        metadata,
        artworkUrl: result.artworkUrl ?? null,
        assetId,
      });
      syncFileToMainIntent(context, fileId, mainIntent);
      releaseArtworkIfUnreferenced(current?.thumbnailUrl ?? null, context.get());
      pruneUnusedMedia(context);
      if (!assetId) {
        context.status.show('Audio loaded, but it could not be saved for reload', 5000);
      }
      startBpmDetection(context, fileId, generation, buffer);
    } catch {
      markFileFailed(context, { fileId, generation, previous: current });
    }
  };
}

function createRemoveFile(context: StoreContext): FileActions['removeFile'] {
  return (fileId) => {
    const file = context.get().files.find((candidate) => candidate.id === fileId);
    if (!file) {
      return;
    }
    audioEngine.removeFileBuffer(fileId);
    context.loads.removeFile(fileId);
    const wasActive = clearActiveFile(context, fileId);
    context.set((state) => {
      const files = state.files
        .filter((entry) => entry.id !== fileId)
        .map((entry, order) => ({ ...entry, order }));
      if (!wasActive) {
        return { files };
      }
      return {
        files,
        activeFileId: null,
        transport: { ...state.transport, playing: false },
        mainTrack: createEmptyMainTrack({ volume: state.mainTrack.volume, loop: false }),
      };
    });
    releaseArtworkIfUnreferenced(file.thumbnailUrl, context.get());
    pruneUnusedMedia(context);
  };
}

export function createFileActions(context: StoreContext): FileActions {
  return {
    addFile: createAddFile(context),
    loadFile: createLoadFile(context),
    removeFile: createRemoveFile(context),
    reorderFile: (fileId, targetOrder) => {
      context.set((state) => ({ files: applyReorder(state.files, fileId, targetOrder) }));
    },
    setFileVolume: (fileId, volume) => {
      audioEngine.setFileVolume(fileId, volume);
      const isActive = context.get().activeFileId === fileId;
      if (isActive) {
        audioEngine.setMainVolume(volume);
      }
      context.set((state) => ({
        files: state.files.map((file) => (file.id === fileId ? { ...file, volume } : file)),
        ...(isActive ? { mainTrack: { ...state.mainTrack, volume } } : {}),
      }));
    },
    dropFiles: createDropFiles(context),
  };
}
