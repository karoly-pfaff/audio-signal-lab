import { create } from 'zustand';
import { audioEngine } from '../audio/AudioEngine';
import { createAnnotationActions } from './annotationActions';
import type { AudioLabState } from './audioLabStoreTypes';
import { createFileActions } from './fileActions';
import { LoadCoordinator } from './loadCoordinator';
import { createMainTrackActions } from './mainTrackActions';
import { restoreStoredAudio } from './mediaRestoration';
import { loadSession, saveSession } from './persistence';
import { createSessionActions } from './sessionActions';
import { createSnapshotActions } from './snapshotActions';
import { createStatusController } from './statusController';
import type { StoreContext } from './storeContext';
import {
  applySessionSettingsToEngine,
  buildPersistedSession,
  createInitialData,
} from './storeState';
import { createTransportActions } from './transportActions';

const initialSession = loadSession();
applySessionSettingsToEngine(initialSession);

export const useAudioLabStore = create<AudioLabState>((set, get) => {
  const status = createStatusController(set);
  const loads = new LoadCoordinator(set);
  const context: StoreContext = { set, get, loads, status };

  audioEngine.setMainEndedHandler(() => {
    set((state) => ({ transport: { ...state.transport, playing: false } }));
  });

  const state: AudioLabState = {
    ...createInitialData(initialSession),
    ...createMainTrackActions(context),
    ...createAnnotationActions(context),
    ...createFileActions(context),
    ...createTransportActions(context),
    ...createSessionActions(context),
    ...createSnapshotActions(context),
    dismissStatus: status.dismiss,
    canPlay: () => {
      const { mainTrack, files } = get();
      return (
        mainTrack.loadingState !== 'loading' &&
        (mainTrack.buffer !== null || files.some((file) => file.buffer !== null))
      );
    },
  };
  queueMicrotask(() => void restoreStoredAudio(context));
  return state;
});

let persistenceWarningShown = false;
useAudioLabStore.subscribe((state) => {
  if (saveSession(buildPersistedSession(state))) {
    persistenceWarningShown = false;
    return;
  }
  if (!persistenceWarningShown) {
    persistenceWarningShown = true;
    useAudioLabStore.setState({ statusMessage: 'Session changes could not be saved locally' });
  }
});
