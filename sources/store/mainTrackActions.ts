import { audioEngine } from '../audio/AudioEngine';
import type { SelectionRange } from '../audio/types';
import { isLoopableSelection } from '../utils/selectionUtils';
import type { MainTrackActions } from './audioLabStoreTypes';
import { releaseArtworkIfUnreferenced } from './artworkLifecycle';
import { createLoadMainTrack } from './mainTrackLoading';
import { pruneUnusedMedia } from './mediaRetention';
import type { StoreContext } from './storeContext';
import { createEmptyMainTrack } from './storeState';

function applySelectionLoop(selection: SelectionRange, context: StoreContext): void {
  if (isLoopableSelection(selection)) {
    audioEngine.setMainLoopPoints(selection.startSeconds, selection.endSeconds);
    return;
  }
  audioEngine.setMainLoopPoints(0, 0);
  context.status.show('Selection is too short to loop reliably.', 3000);
}

function createActivateFile(context: StoreContext): MainTrackActions['activateFile'] {
  return (fileId) => {
    const currentState = context.get();
    const file = currentState.files.find((candidate) => candidate.id === fileId);
    if (!file?.buffer) {
      return;
    }
    const alreadySynchronized =
      currentState.activeFileId === fileId &&
      currentState.mainTrack.buffer === file.buffer &&
      currentState.mainTrack.assetId === file.assetId &&
      currentState.mainTrack.loadingState !== 'loading';
    if (alreadySynchronized) {
      return;
    }
    audioEngine.stop();
    audioEngine.setMainBuffer(file.buffer);
    audioEngine.setMainVolume(file.volume);
    audioEngine.setMainLoop(false);
    audioEngine.setMainLoopPoints(0, 0);
    const generation = context.loads.nextMainGeneration(fileId);
    const previousArtworkUrl = currentState.mainTrack.thumbnailUrl;
    context.set((state) => ({
      activeFileId: fileId,
      transport: { ...state.transport, playing: false },
      mainTrack: {
        ...state.mainTrack,
        name: file.name,
        assetId: file.assetId ?? null,
        buffer: file.buffer,
        thumbnailUrl: file.thumbnailUrl,
        loadingState: 'loaded' as const,
        metadata: file.metadata,
        bpm: file.bpm ?? null,
        bpmConfidence: file.bpmConfidence ?? null,
        bpmAnalyzing: false,
        analysis: file.analysis ?? null,
        volume: file.volume,
        loop: false,
        selection: null,
        markers: [],
        fileIdentity: file.fileIdentity ?? null,
      },
    }));
    releaseArtworkIfUnreferenced(previousArtworkUrl, context.get());
    pruneUnusedMedia(context);
    context.loads.analyzeMainBuffer(file.buffer, generation);
  };
}

function createClearMainTrack(context: StoreContext): MainTrackActions['clearMainTrack'] {
  return () => {
    context.loads.nextMainGeneration();
    const current = context.get().mainTrack;
    audioEngine.stop();
    audioEngine.clearMainBuffer();
    audioEngine.setMainLoop(false);
    audioEngine.setMainLoopPoints(0, 0);
    context.set((state) => ({
      activeFileId: null,
      transport: { ...state.transport, playing: false },
      mainTrack: createEmptyMainTrack({ volume: current.volume, loop: false }),
    }));
    releaseArtworkIfUnreferenced(current.thumbnailUrl, context.get());
    pruneUnusedMedia(context);
  };
}

function createSetMainLoop(context: StoreContext): MainTrackActions['setMainLoop'] {
  return (loop) => {
    const { mainTrack } = context.get();
    if (mainTrack.loadingState === 'loading') {
      return;
    }
    if (loop && mainTrack.selection) {
      applySelectionLoop(mainTrack.selection, context);
    } else {
      audioEngine.setMainLoopPoints(0, 0);
    }
    audioEngine.setMainLoop(loop);
    context.set((state) => ({ mainTrack: { ...state.mainTrack, loop } }));
  };
}

function createSetMainSelection(context: StoreContext): MainTrackActions['setMainSelection'] {
  return (startSeconds, endSeconds) => {
    const selection = { startSeconds, endSeconds };
    if (context.get().mainTrack.loop) {
      applySelectionLoop(selection, context);
    }
    context.set((state) => ({ mainTrack: { ...state.mainTrack, selection } }));
  };
}

function createClearMainSelection(context: StoreContext): MainTrackActions['clearMainSelection'] {
  return () => {
    if (context.get().mainTrack.loop) {
      audioEngine.setMainLoopPoints(0, 0);
    }
    context.set((state) => ({ mainTrack: { ...state.mainTrack, selection: null } }));
  };
}

export function createMainTrackActions(context: StoreContext): MainTrackActions {
  return {
    activateFile: createActivateFile(context),
    loadMainTrack: createLoadMainTrack(context),
    clearMainTrack: createClearMainTrack(context),
    setMainVolume: (volume) => {
      audioEngine.setMainVolume(volume);
      context.set((state) => ({ mainTrack: { ...state.mainTrack, volume } }));
    },
    setMainLoop: createSetMainLoop(context),
    setMainSelection: createSetMainSelection(context),
    clearMainSelection: createClearMainSelection(context),
  };
}
