import { audioEngine } from '../audio/AudioEngine';
import { loadAudioResources, type AudioLoadResources } from '../audio/audioLoadResources';
import { audioFileLimitError, decodedAudioLimitError } from '../audio/audioFileLimits';
import { detectBpm } from '../audio/bpm';
import { revokeArtworkUrl } from '../audio/metadata';
import type { MainTrackState, Marker, SelectionRange, TrackMetadata } from '../audio/types';
import { reconcileAnnotationsForDuration } from '../utils/annotationReconciliation';
import { isLoopableSelection } from '../utils/selectionUtils';
import {
  buildFileIdentity,
  compareFileIdentity,
  formatIdentityWarning,
} from '../utils/fileIdentity';
import type { MainTrackActions } from './audioLabStoreTypes';
import { releaseArtworkIfUnreferenced } from './artworkLifecycle';
import {
  activeFileIdForMainTrack,
  mainTrackAfterLoadFailure,
  shouldRestoreMainAnnotations,
} from './mainTrackLoadState';
import { pruneUnusedMedia } from './mediaRetention';
import { storeAudioFile } from './mediaStorage';
import { portableFilenameError } from './portableSession';
import type { StoreContext } from './storeContext';

interface RestoredAnnotations {
  selection: SelectionRange | null;
  markers: Marker[];
  statusMessage: string | null;
}

function restoreAnnotations(
  previousTrack: MainTrackState,
  duration: number,
  shouldRestore: boolean,
): RestoredAnnotations {
  if (!shouldRestore || (previousTrack.selection === null && previousTrack.markers.length === 0)) {
    return { selection: null, markers: [], statusMessage: null };
  }
  const result = reconcileAnnotationsForDuration(
    previousTrack.selection,
    previousTrack.markers,
    duration,
  );
  const statusMessage =
    result.droppedCount > 0
      ? 'Some session annotations were outside the loaded file and were removed.'
      : result.adjustedCount > 0
        ? 'Session annotations adjusted to match the loaded file.'
        : null;
  return { selection: result.selection, markers: result.markers, statusMessage };
}

function applyLoadedTrack(
  context: StoreContext,
  loaded: {
    file: File;
    buffer: AudioBuffer;
    metadata: TrackMetadata;
    artworkUrl: string | null;
    restored: RestoredAnnotations;
    assetId: string | null;
  },
): void {
  context.set((state) => ({
    activeFileId: null,
    transport: { ...state.transport, playing: false },
    mainTrack: {
      ...state.mainTrack,
      name: loaded.file.name,
      assetId: loaded.assetId,
      buffer: loaded.buffer,
      thumbnailUrl: loaded.artworkUrl,
      loadingState: 'loaded',
      metadata: loaded.metadata,
      analysis: null,
      bpmAnalyzing: true,
      bpm: null,
      bpmConfidence: null,
      selection: loaded.restored.selection,
      markers: loaded.restored.markers,
      fileIdentity: buildFileIdentity(loaded.file, loaded.buffer),
    },
  }));
}

function showRestoreStatus(
  context: StoreContext,
  previousIdentity: MainTrackState['fileIdentity'],
  currentIdentity: NonNullable<MainTrackState['fileIdentity']>,
  restored: RestoredAnnotations,
): void {
  const match = previousIdentity ? compareFileIdentity(currentIdentity, previousIdentity) : null;
  const warning = match ? formatIdentityWarning(match) : null;
  if (warning) {
    context.status.show(warning, 7000);
  } else if (restored.statusMessage) {
    context.status.show(restored.statusMessage, 5000);
  }
}

function startBpmDetection(context: StoreContext, generation: number, buffer: AudioBuffer): void {
  void detectBpm(buffer, context.loads.mainSignal?.()).then((result) => {
    if (!context.loads.isMainCurrent(generation)) {
      return;
    }
    context.set((state) => ({
      mainTrack: {
        ...state.mainTrack,
        bpm: result?.bpm ?? null,
        bpmConfidence: result?.confidence ?? null,
        bpmAnalyzing: false,
      },
    }));
  });
}

interface MainLoadAttempt {
  generation: number;
  previous: MainTrackState;
  previousActiveId: string | null;
  shouldRestore: boolean;
}

function applyLoadedLoop(loop: boolean, selection: SelectionRange | null): void {
  audioEngine.setMainLoop(loop);
  if (loop && selection && isLoopableSelection(selection)) {
    audioEngine.setMainLoopPoints(selection.startSeconds, selection.endSeconds);
    return;
  }
  audioEngine.setMainLoopPoints(0, 0);
}

function markLoadFailed(
  context: StoreContext,
  attempt: MainLoadAttempt,
  message = 'Failed to decode audio',
): void {
  if (!context.loads.isMainCurrent(attempt.generation)) {
    return;
  }
  const current = context.get();
  const restored = mainTrackAfterLoadFailure(current.mainTrack, attempt.previous);
  const activeFileId = activeFileIdForMainTrack(attempt.previousActiveId, current.files, restored);
  context.set({
    activeFileId,
    transport: { ...current.transport, playing: false },
    mainTrack: restored,
  });
  context.loads.restoreMainIntent(attempt.generation, activeFileId);
  if (restored.buffer) {
    audioEngine.setMainBuffer(restored.buffer);
    audioEngine.setMainVolume(restored.volume);
    applyLoadedLoop(restored.loop, restored.selection);
    if (!restored.analysis) {
      context.loads.analyzeMainBuffer(restored.buffer, attempt.generation);
    }
    if (restored.bpmAnalyzing) {
      startBpmDetection(context, attempt.generation, restored.buffer);
    }
  }
  context.status.show(message, message === 'Failed to decode audio' ? 4000 : 5000);
}

function beginMainLoad(context: StoreContext): MainLoadAttempt {
  const state = context.get();
  const previous =
    state.mainTrack.buffer && state.mainTrack.loadingState === 'loading'
      ? { ...state.mainTrack, loadingState: 'loaded' as const }
      : state.mainTrack;
  const attempt = {
    generation: context.loads.nextMainGeneration(),
    previous,
    previousActiveId: state.activeFileId,
    shouldRestore: shouldRestoreMainAnnotations(state.mainTrack),
  };
  audioEngine.stop();
  context.set((current) => ({
    transport: { ...current.transport, playing: false },
    mainTrack: { ...current.mainTrack, loadingState: 'loading', analysis: null },
  }));
  return attempt;
}

async function completeMainLoad(
  context: StoreContext,
  file: File,
  attempt: MainLoadAttempt,
  loaded: AudioLoadResources,
): Promise<void> {
  const { buffer, metadata: result } = loaded;
  if (!context.loads.isMainCurrent(attempt.generation)) {
    revokeArtworkUrl(result.artworkUrl ?? null);
    return;
  }
  const decodedLimit = decodedAudioLimitError(buffer);
  if (decodedLimit) {
    revokeArtworkUrl(result.artworkUrl ?? null);
    markLoadFailed(context, attempt, decodedLimit);
    return;
  }
  const assetId = await storeAudioFile(file);
  if (!context.loads.isMainCurrent(attempt.generation)) {
    revokeArtworkUrl(result.artworkUrl ?? null);
    pruneUnusedMedia(context);
    return;
  }
  audioEngine.setMainBuffer(buffer);
  const metadata = { title: result.title, artist: result.artist, album: result.album };
  const annotationSource = context.get().mainTrack;
  const restored = restoreAnnotations(annotationSource, buffer.duration, attempt.shouldRestore);
  applyLoadedLoop(context.get().mainTrack.loop, restored.selection);
  const identity = buildFileIdentity(file, buffer);
  applyLoadedTrack(context, {
    file,
    buffer,
    metadata,
    artworkUrl: result.artworkUrl ?? null,
    restored,
    assetId,
  });
  releaseArtworkIfUnreferenced(attempt.previous.thumbnailUrl, context.get());
  pruneUnusedMedia(context);
  if (!assetId) {
    context.status.show('Audio loaded, but it could not be saved for reload', 5000);
  }
  const previousIdentity = attempt.shouldRestore ? annotationSource.fileIdentity : null;
  showRestoreStatus(context, previousIdentity, identity, restored);
  context.loads.analyzeMainBuffer(buffer, attempt.generation);
  startBpmDetection(context, attempt.generation, buffer);
}

export function createLoadMainTrack(context: StoreContext): MainTrackActions['loadMainTrack'] {
  return async (file) => {
    const fileLimit = portableFilenameError(file.name) ?? audioFileLimitError(file);
    if (fileLimit) {
      context.status.show(fileLimit, 5000);
      return;
    }
    const attempt = beginMainLoad(context);
    try {
      const loaded = await loadAudioResources(file, (value) => audioEngine.decodeFile(value));
      await completeMainLoad(context, file, attempt, loaded);
    } catch {
      markLoadFailed(context, attempt);
    }
  };
}
