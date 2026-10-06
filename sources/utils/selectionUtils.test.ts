import { describe, it, expect } from 'vitest';
import {
  clampSelectionRange,
  normalizeSelectionRange,
  isTinySelection,
  selectionDurationSeconds,
  hasMinimumTimeSpan,
  isLoopableSelection,
  getHoverLabelEdge,
  MIN_LOOP_SELECTION_SECONDS,
} from './selectionUtils';

describe('clampSelectionRange', () => {
  it('clamps start below 0 to 0', () => {
    const r = clampSelectionRange(-1, 5, 10);
    expect(r.startSeconds).toBe(0);
    expect(r.endSeconds).toBe(5);
  });

  it('clamps end above duration to duration', () => {
    const r = clampSelectionRange(2, 15, 10);
    expect(r.startSeconds).toBe(2);
    expect(r.endSeconds).toBe(10);
  });

  it('clamps both endpoints when both out of range', () => {
    const r = clampSelectionRange(-5, 100, 60);
    expect(r.startSeconds).toBe(0);
    expect(r.endSeconds).toBe(60);
  });

  it('leaves in-range values unchanged', () => {
    const r = clampSelectionRange(3, 7, 10);
    expect(r.startSeconds).toBe(3);
    expect(r.endSeconds).toBe(7);
  });

  it('treats zero duration as [0, 0]', () => {
    const r = clampSelectionRange(1, 5, 0);
    expect(r.startSeconds).toBe(0);
    expect(r.endSeconds).toBe(0);
  });

  it('treats negative duration as [0, 0]', () => {
    const r = clampSelectionRange(1, 5, -10);
    expect(r.startSeconds).toBe(0);
    expect(r.endSeconds).toBe(0);
  });
});

describe('normalizeSelectionRange', () => {
  it('keeps left-to-right selection as-is', () => {
    const r = normalizeSelectionRange(2, 8);
    expect(r.startSeconds).toBe(2);
    expect(r.endSeconds).toBe(8);
  });

  it('flips right-to-left selection so start < end', () => {
    const r = normalizeSelectionRange(8, 2);
    expect(r.startSeconds).toBe(2);
    expect(r.endSeconds).toBe(8);
  });

  it('handles equal start and end (collapsed range)', () => {
    const r = normalizeSelectionRange(5, 5);
    expect(r.startSeconds).toBe(5);
    expect(r.endSeconds).toBe(5);
  });
});

describe('isTinySelection', () => {
  it('returns true for a sub-threshold drag', () => {
    expect(isTinySelection(0.5, 0.502)).toBe(true);
  });

  it('returns false for a real drag beyond threshold', () => {
    expect(isTinySelection(0.1, 0.3)).toBe(false);
  });

  it('returns true for identical start and end positions', () => {
    expect(isTinySelection(0.4, 0.4)).toBe(true);
  });

  it('works the same regardless of drag direction', () => {
    expect(isTinySelection(0.5, 0.502)).toBe(isTinySelection(0.502, 0.5));
  });

  it('respects a custom threshold — just below is tiny', () => {
    expect(isTinySelection(0.1, 0.19, 0.1)).toBe(true);
  });

  it('respects a custom threshold — just above is not tiny', () => {
    expect(isTinySelection(0.1, 0.21, 0.1)).toBe(false);
  });
});

describe('selectionDurationSeconds', () => {
  it('returns the span between start and end', () => {
    expect(selectionDurationSeconds({ startSeconds: 2, endSeconds: 8 })).toBe(6);
  });

  it('returns 0 for a collapsed range', () => {
    expect(selectionDurationSeconds({ startSeconds: 5, endSeconds: 5 })).toBe(0);
  });

  it('returns 0 if end is somehow less than start (does not go negative)', () => {
    expect(selectionDurationSeconds({ startSeconds: 8, endSeconds: 2 })).toBe(0);
  });
});

describe('isLoopableSelection', () => {
  it('returns true for a selection well above the minimum', () => {
    expect(isLoopableSelection({ startSeconds: 0, endSeconds: 5 })).toBe(true);
  });

  it('returns false for a selection below the minimum', () => {
    expect(isLoopableSelection({ startSeconds: 0, endSeconds: 0.05 })).toBe(false);
  });

  it('returns false for a zero-length selection', () => {
    expect(isLoopableSelection({ startSeconds: 1, endSeconds: 1 })).toBe(false);
  });

  it('returns true for a selection exactly at the minimum threshold', () => {
    expect(isLoopableSelection({ startSeconds: 0, endSeconds: MIN_LOOP_SELECTION_SECONDS })).toBe(
      true,
    );
  });

  it('accepts a decimal boundary span despite binary floating-point error', () => {
    expect(isLoopableSelection({ startSeconds: 5, endSeconds: 5.1 })).toBe(true);
    expect(hasMinimumTimeSpan(3_599, 3_599.1, MIN_LOOP_SELECTION_SECONDS)).toBe(true);
  });

  it('returns false for a selection just under the minimum threshold', () => {
    expect(
      isLoopableSelection({ startSeconds: 0, endSeconds: MIN_LOOP_SELECTION_SECONDS - 0.001 }),
    ).toBe(false);
    expect(isLoopableSelection({ startSeconds: 5, endSeconds: 5.099_999 })).toBe(false);
  });
});

describe('getHoverLabelEdge', () => {
  it('returns left for ratio near the start', () => {
    expect(getHoverLabelEdge(0)).toBe('left');
    expect(getHoverLabelEdge(0.05)).toBe('left');
  });

  it('returns right for ratio near the end', () => {
    expect(getHoverLabelEdge(1)).toBe('right');
    expect(getHoverLabelEdge(0.95)).toBe('right');
  });

  it('returns center for mid-range ratios', () => {
    expect(getHoverLabelEdge(0.5)).toBe('center');
    expect(getHoverLabelEdge(0.1)).toBe('center');
    expect(getHoverLabelEdge(0.9)).toBe('center');
  });

  it('returns left for ratio exactly at the left boundary', () => {
    expect(getHoverLabelEdge(0.07)).toBe('left');
  });

  it('returns center for ratio just inside the left boundary', () => {
    expect(getHoverLabelEdge(0.08)).toBe('center');
  });

  it('returns center for ratio just inside the right boundary', () => {
    expect(getHoverLabelEdge(0.92)).toBe('center');
  });

  it('returns right for ratio just outside the right boundary', () => {
    expect(getHoverLabelEdge(0.93)).toBe('right');
  });
});
