import { useCallback, useEffect, useRef, useState } from 'react';
import type { SelectionRange } from '../audio/types';
import { clampRatio } from '../utils/playbackNavigation';
import { isTinySelection } from '../utils/selectionUtils';

interface InteractionOptions {
  buffer: AudioBuffer | null;
  variant: 'active' | 'compact';
  onSeek?: (ratio: number) => void;
  onSelection?: (start: number, end: number) => void;
  onClearSelection?: () => void;
  externalHoverRatio?: number | null;
  onHoverChange?: (ratio: number | null) => void;
  playhead?: number;
  selection?: SelectionRange | null;
}

function keyboardTarget(event: React.KeyboardEvent, current: number): number | null {
  const step = event.key.startsWith('Page') ? 0.1 : 0.01;
  if (event.key === 'Home') {
    return 0;
  }
  if (event.key === 'End') {
    return 1;
  }
  if (event.key === 'ArrowLeft' || event.key === 'ArrowDown' || event.key === 'PageDown') {
    return clampRatio(current - step);
  }
  if (event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'PageUp') {
    return clampRatio(current + step);
  }
  return null;
}

function useKeyboardInteraction(options: InteractionOptions) {
  const anchorRef = useRef<number | null>(null);
  const positionRef = useRef<number | null>(null);
  useEffect(() => {
    positionRef.current = clampRatio(options.playhead ?? 0);
  }, [options.buffer, options.playhead]);
  useEffect(() => {
    anchorRef.current = null;
  }, [options.buffer]);
  useEffect(() => {
    if (!options.selection) {
      anchorRef.current = null;
      positionRef.current = clampRatio(options.playhead ?? 0);
    }
  }, [options.playhead, options.selection]);
  return useCallback(
    (event: React.KeyboardEvent<HTMLCanvasElement>) => {
      if (!options.buffer) {
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        anchorRef.current = null;
        options.onClearSelection?.();
        return;
      }
      const current = positionRef.current ?? clampRatio(options.playhead ?? 0);
      const target = keyboardTarget(event, current);
      if (target === null) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      positionRef.current = target;
      if (event.shiftKey && options.onSelection) {
        anchorRef.current ??= current;
        options.onSelection(
          Math.min(anchorRef.current, target) * options.buffer.duration,
          Math.max(anchorRef.current, target) * options.buffer.duration,
        );
      } else {
        anchorRef.current = null;
        options.onSeek?.(target);
      }
    },
    [options],
  );
}

function pointerRatio(event: React.PointerEvent<HTMLCanvasElement>): number {
  const rect = event.currentTarget.getBoundingClientRect();
  return clampRatio((event.clientX - rect.left) / rect.width);
}

function usePointerDown(
  buffer: AudioBuffer | null,
  startRef: React.MutableRefObject<number | null>,
  clear: () => void,
) {
  return useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!buffer) {
        return;
      }
      event.currentTarget.setPointerCapture(event.pointerId);
      startRef.current = pointerRatio(event);
      clear();
    },
    [buffer, clear, startRef],
  );
}

function usePointerUp(
  options: InteractionOptions,
  startRef: React.MutableRefObject<number | null>,
  clear: () => void,
) {
  return useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!options.buffer || startRef.current === null) {
        return;
      }
      const ratio = pointerRatio(event);
      if (isTinySelection(startRef.current, ratio)) {
        options.onSeek?.(ratio);
      } else {
        options.onSelection?.(
          Math.min(startRef.current, ratio) * options.buffer.duration,
          Math.max(startRef.current, ratio) * options.buffer.duration,
        );
      }
      clear();
      startRef.current = null;
    },
    [clear, options, startRef],
  );
}

function usePointerMotion(
  options: InteractionOptions,
  startRef: React.MutableRefObject<number | null>,
  setLiveSelection: React.Dispatch<
    React.SetStateAction<{ startRatio: number; endRatio: number } | null>
  >,
  setInternalHover: React.Dispatch<React.SetStateAction<number | null>>,
) {
  const pointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const ratio = pointerRatio(event);
      if (
        event.buttons === 1 &&
        startRef.current !== null &&
        options.onSelection &&
        options.buffer &&
        !isTinySelection(startRef.current, ratio)
      ) {
        setLiveSelection({
          startRatio: Math.min(startRef.current, ratio),
          endRatio: Math.max(startRef.current, ratio),
        });
      }
      if (options.variant === 'active') {
        if (options.onHoverChange) {
          options.onHoverChange(ratio);
        } else {
          setInternalHover(ratio);
        }
      }
    },
    [options, setInternalHover, setLiveSelection, startRef],
  );
  const pointerLeave = useCallback(() => {
    if (options.variant !== 'active') {
      return;
    }
    if (options.onHoverChange) {
      options.onHoverChange(null);
    } else {
      setInternalHover(null);
    }
  }, [options, setInternalHover]);
  return { pointerMove, pointerLeave };
}

export function useWaveformInteraction(options: InteractionOptions) {
  const startRef = useRef<number | null>(null);
  const [internalHover, setInternalHover] = useState<number | null>(null);
  const [liveSelection, setLiveSelection] = useState<{
    startRatio: number;
    endRatio: number;
  } | null>(null);
  const clearLive = useCallback(() => setLiveSelection(null), []);
  const pointerDown = usePointerDown(options.buffer, startRef, clearLive);
  const pointerUp = usePointerUp(options, startRef, clearLive);
  const motion = usePointerMotion(options, startRef, setLiveSelection, setInternalHover);
  const keyDown = useKeyboardInteraction(options);
  return {
    hoverRatio: options.externalHoverRatio ?? internalHover,
    liveSelection,
    pointerDown,
    pointerMove: motion.pointerMove,
    pointerUp,
    pointerLeave: motion.pointerLeave,
    doubleClick: options.onClearSelection,
    keyDown,
  };
}
