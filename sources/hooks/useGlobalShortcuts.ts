import { useEffect, useRef } from 'react';
import type { AudioLabState } from '../store/audioLabStoreTypes';
import { useAudioLabStore } from '../store/useAudioLabStore';

type ShortcutActions = Pick<
  AudioLabState,
  | 'play'
  | 'pause'
  | 'stop'
  | 'toggleMasterMute'
  | 'seekToStart'
  | 'jumpBack'
  | 'jumpForward'
  | 'clearMainSelection'
>;

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return true;
  }
  return (
    target.isContentEditable ||
    ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA'].includes(target.tagName) ||
    target.getAttribute('role') === 'slider'
  );
}

function isMasterMuteShortcut(event: KeyboardEvent): boolean {
  return (
    event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === 'm'
  );
}

function handleShortcut(
  event: KeyboardEvent,
  actions: ShortcutActions,
  playing: boolean,
  selected: boolean,
) {
  if (event.defaultPrevented || isInteractiveTarget(event.target)) {
    return;
  }
  if (event.code === 'Space') {
    event.preventDefault();
    if (playing) {
      actions.pause();
    } else {
      actions.play();
    }
  } else if (event.code === 'Escape') {
    if (selected) {
      actions.clearMainSelection();
    } else {
      actions.stop();
    }
  } else if (isMasterMuteShortcut(event)) {
    event.preventDefault();
    actions.toggleMasterMute();
  } else if (event.code === 'Home') {
    event.preventDefault();
    actions.seekToStart();
  } else if (event.code === 'ArrowLeft') {
    event.preventDefault();
    actions.jumpBack();
  } else if (event.code === 'ArrowRight') {
    event.preventDefault();
    actions.jumpForward();
  }
}

export function useGlobalShortcuts() {
  const store = useAudioLabStore();
  const playing = useRef(store.transport.playing);
  useEffect(() => {
    playing.current = store.transport.playing;
  }, [store.transport.playing]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) =>
      handleShortcut(event, store, playing.current, Boolean(store.mainTrack.selection));
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [store]);
}
