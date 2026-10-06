import type { SelectionRange } from '../audio/types';
export type { SelectionRange };

const CLICK_THRESHOLD_RATIO = 0.005;
const TIME_BOUNDARY_TOLERANCE_SECONDS = 1e-9;

export function clampSelectionRange(start: number, end: number, duration: number): SelectionRange {
  const d = Math.max(0, duration);
  return {
    startSeconds: Math.max(0, Math.min(start, d)),
    endSeconds: Math.max(0, Math.min(end, d)),
  };
}

export function normalizeSelectionRange(start: number, end: number): SelectionRange {
  return start <= end
    ? { startSeconds: start, endSeconds: end }
    : { startSeconds: end, endSeconds: start };
}

export function isTinySelection(
  startRatio: number,
  endRatio: number,
  threshold = CLICK_THRESHOLD_RATIO,
): boolean {
  return Math.abs(endRatio - startRatio) < threshold;
}

export function selectionDurationSeconds(range: SelectionRange): number {
  return Math.max(0, range.endSeconds - range.startSeconds);
}

export const MIN_LOOP_SELECTION_SECONDS = 0.1;

export function hasMinimumTimeSpan(
  startSeconds: number,
  endSeconds: number,
  minimumSeconds: number,
): boolean {
  const spanSeconds = Math.max(0, endSeconds - startSeconds);
  return spanSeconds + TIME_BOUNDARY_TOLERANCE_SECONDS >= minimumSeconds;
}

export function isLoopableSelection(range: SelectionRange): boolean {
  return hasMinimumTimeSpan(range.startSeconds, range.endSeconds, MIN_LOOP_SELECTION_SECONDS);
}

export function getHoverLabelEdge(ratio: number): 'left' | 'center' | 'right' {
  if (ratio < 0.08) {
    return 'left';
  }
  if (ratio > 0.92) {
    return 'right';
  }
  return 'center';
}
