import { audioEngine } from '../audio/AudioEngine';
import { JUMP_SECONDS } from '../utils/playbackNavigation';
import type { TransportActions } from './audioLabStoreTypes';
import type { StoreContext } from './storeContext';

function createPlayAction({ set, get, status }: StoreContext): TransportActions['play'] {
  return () => {
    const track = get().mainTrack;
    if (track.loadingState === 'loading' || !track.buffer) {
      return;
    }
    audioEngine
      .resumeContext()
      .then((current) => {
        const currentTrack = get().mainTrack;
        if (!current || currentTrack.loadingState === 'loading' || !currentTrack.buffer) {
          return;
        }
        audioEngine.play();
        set((state) => ({ transport: { ...state.transport, playing: true } }));
      })
      .catch(() => {
        status.show('Audio blocked — interact with the page first, then try again', 5000);
      });
  };
}

export function createTransportActions(context: StoreContext): TransportActions {
  const { set, get } = context;
  return {
    play: createPlayAction(context),

    pause: () => {
      audioEngine.pause();
      set((state) => ({ transport: { ...state.transport, playing: false } }));
    },

    stop: () => {
      audioEngine.stop();
      set((state) => ({ transport: { ...state.transport, playing: false } }));
    },

    seekTo: (seconds) => audioEngine.seek(seconds),
    seekToStart: () => audioEngine.seek(0),
    jumpBack: (seconds = JUMP_SECONDS) => {
      audioEngine.seek(Math.max(0, audioEngine.currentTime - seconds));
    },
    jumpForward: (seconds = JUMP_SECONDS) => {
      const duration = audioEngine.getMainDuration();
      const limit = duration > 0 ? duration : Infinity;
      audioEngine.seek(Math.min(audioEngine.currentTime + seconds, limit));
    },

    setMasterVolume: (volume) => {
      audioEngine.setMasterVolume(volume);
      set((state) => ({ transport: { ...state.transport, masterVolume: volume } }));
    },

    toggleMasterMute: () => {
      const masterMuted = !get().transport.masterMuted;
      audioEngine.setMasterMute(masterMuted);
      set((state) => ({ transport: { ...state.transport, masterMuted } }));
    },
  };
}
