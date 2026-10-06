import { describe, it, expect } from 'vitest';
import { reconcileAnnotationsForDuration } from './annotationReconciliation';
import type { Marker, SelectionRange } from '../audio/types';

function pt(id: string, startSeconds: number, label = 'M'): Marker {
  return { id, type: 'point', startSeconds, label, createdAt: 0 };
}

function rng(id: string, startSeconds: number, endSeconds: number, label = 'R'): Marker {
  return { id, type: 'range', startSeconds, endSeconds, label, createdAt: 0 };
}

function sel(startSeconds: number, endSeconds: number): SelectionRange {
  return { startSeconds, endSeconds };
}

// ── empty input ───────────────────────────────────────────────────────────────

describe('reconcileAnnotationsForDuration — empty input', () => {
  it('returns null selection and empty markers unchanged', () => {
    const r = reconcileAnnotationsForDuration(null, [], 30);
    expect(r.selection).toBeNull();
    expect(r.markers).toEqual([]);
    expect(r.droppedCount).toBe(0);
    expect(r.adjustedCount).toBe(0);
  });
});

// ── selection ─────────────────────────────────────────────────────────────────

describe('reconcileAnnotationsForDuration — selection', () => {
  it('preserves a valid selection that fits within duration', () => {
    const r = reconcileAnnotationsForDuration(sel(2, 8), [], 30);
    expect(r.selection).toEqual({ startSeconds: 2, endSeconds: 8 });
    expect(r.droppedCount).toBe(0);
    expect(r.adjustedCount).toBe(0);
  });

  it('clamps selection endSeconds to duration', () => {
    const r = reconcileAnnotationsForDuration(sel(5, 20), [], 10);
    expect(r.selection).toEqual({ startSeconds: 5, endSeconds: 10 });
    expect(r.adjustedCount).toBe(1);
    expect(r.droppedCount).toBe(0);
  });

  it('discards selection when startSeconds >= duration', () => {
    const r = reconcileAnnotationsForDuration(sel(10, 15), [], 10);
    expect(r.selection).toBeNull();
    expect(r.droppedCount).toBe(1);
  });

  it('discards selection when clamped result is shorter than minimum (0.1s)', () => {
    // start=9.95, end=15 → clamp to 10, span=0.05 < 0.1
    const r = reconcileAnnotationsForDuration(sel(9.95, 15), [], 10);
    expect(r.selection).toBeNull();
    expect(r.droppedCount).toBe(1);
  });

  it('keeps selection exactly at duration boundary when span is sufficient', () => {
    // start=9, end=20 → clamp to 10, span=1.0 which is valid
    const r = reconcileAnnotationsForDuration(sel(9, 20), [], 10);
    expect(r.selection).toEqual({ startSeconds: 9, endSeconds: 10 });
    expect(r.adjustedCount).toBe(1);
  });

  it('preserves a decimal-boundary selection without reporting an adjustment', () => {
    const r = reconcileAnnotationsForDuration(sel(5, 5.1), [], 10);
    expect(r.selection).toEqual({ startSeconds: 5, endSeconds: 5.1 });
    expect(r.droppedCount).toBe(0);
    expect(r.adjustedCount).toBe(0);
  });

  it('null selection is not counted as dropped', () => {
    const r = reconcileAnnotationsForDuration(null, [], 10);
    expect(r.droppedCount).toBe(0);
  });
});

// ── point markers ─────────────────────────────────────────────────────────────

describe('reconcileAnnotationsForDuration — point markers', () => {
  it('preserves a point marker within duration', () => {
    const r = reconcileAnnotationsForDuration(null, [pt('a', 5)], 10);
    expect(r.markers).toHaveLength(1);
    expect(r.markers[0].id).toBe('a');
    expect(r.droppedCount).toBe(0);
  });

  it('preserves a point marker at exactly duration', () => {
    const r = reconcileAnnotationsForDuration(null, [pt('a', 10)], 10);
    expect(r.markers).toHaveLength(1);
  });

  it('discards a point marker beyond duration', () => {
    const r = reconcileAnnotationsForDuration(null, [pt('a', 10.001)], 10);
    expect(r.markers).toHaveLength(0);
    expect(r.droppedCount).toBe(1);
  });

  it('preserves id and label of kept point marker', () => {
    const r = reconcileAnnotationsForDuration(null, [pt('my-id', 3, 'Chorus hit')], 10);
    expect(r.markers[0].id).toBe('my-id');
    expect(r.markers[0].label).toBe('Chorus hit');
  });
});

// ── range markers ─────────────────────────────────────────────────────────────

describe('reconcileAnnotationsForDuration — range markers', () => {
  it('preserves a range marker that fits within duration', () => {
    const r = reconcileAnnotationsForDuration(null, [rng('r1', 2, 7)], 10);
    expect(r.markers).toHaveLength(1);
    expect(r.markers[0].endSeconds).toBe(7);
    expect(r.droppedCount).toBe(0);
    expect(r.adjustedCount).toBe(0);
  });

  it('clamps range marker endSeconds to duration', () => {
    const r = reconcileAnnotationsForDuration(null, [rng('r1', 3, 15)], 10);
    expect(r.markers).toHaveLength(1);
    expect(r.markers[0].startSeconds).toBe(3);
    expect(r.markers[0].endSeconds).toBe(10);
    expect(r.adjustedCount).toBe(1);
    expect(r.droppedCount).toBe(0);
  });

  it('discards a range marker completely beyond duration', () => {
    const r = reconcileAnnotationsForDuration(null, [rng('r1', 10, 15)], 10);
    expect(r.markers).toHaveLength(0);
    expect(r.droppedCount).toBe(1);
  });

  it('discards a range marker when clamped span is below 0.1s', () => {
    // start=9.95, end=15 → clamp to 10, span=0.05 < 0.1
    const r = reconcileAnnotationsForDuration(null, [rng('r1', 9.95, 15)], 10);
    expect(r.markers).toHaveLength(0);
    expect(r.droppedCount).toBe(1);
  });

  it('preserves a decimal-boundary range without reporting an adjustment', () => {
    const marker = rng('boundary', 5, 5.1);
    const r = reconcileAnnotationsForDuration(null, [marker], 10);
    expect(r.markers).toEqual([marker]);
    expect(r.droppedCount).toBe(0);
    expect(r.adjustedCount).toBe(0);
  });

  it('preserves id and label of clamped range marker', () => {
    const r = reconcileAnnotationsForDuration(null, [rng('r2', 3, 20, 'Verse')], 10);
    expect(r.markers[0].id).toBe('r2');
    expect(r.markers[0].label).toBe('Verse');
  });
});

// ── sorting ───────────────────────────────────────────────────────────────────

describe('reconcileAnnotationsForDuration — sort order', () => {
  it('sorts markers by startSeconds after reconciliation', () => {
    const markers = [pt('c', 8), pt('a', 1), pt('b', 5)];
    const r = reconcileAnnotationsForDuration(null, markers, 30);
    expect(r.markers.map((m) => m.id)).toEqual(['a', 'b', 'c']);
  });

  it('sorts markers when some are dropped', () => {
    const markers = [pt('far', 50), pt('near', 3), pt('mid', 7)];
    const r = reconcileAnnotationsForDuration(null, markers, 10);
    expect(r.markers.map((m) => m.id)).toEqual(['near', 'mid']);
  });
});

// ── mixed ─────────────────────────────────────────────────────────────────────

describe('reconcileAnnotationsForDuration — mixed annotations', () => {
  it('reconciles selection and markers together', () => {
    const markers = [pt('keep', 3), pt('drop', 20), rng('clamp', 5, 15)];
    const r = reconcileAnnotationsForDuration(sel(2, 8), markers, 10);
    expect(r.selection).toEqual({ startSeconds: 2, endSeconds: 8 });
    expect(r.markers).toHaveLength(2);
    expect(r.markers.find((m) => m.id === 'keep')).toBeDefined();
    expect(r.markers.find((m) => m.id === 'clamp')?.endSeconds).toBe(10);
    expect(r.droppedCount).toBe(1);
    expect(r.adjustedCount).toBe(1);
  });

  it('reports correct counts when both dropped and adjusted', () => {
    const markers = [pt('drop', 100), rng('adj', 5, 50)];
    const r = reconcileAnnotationsForDuration(sel(1, 200), markers, 10);
    // selection: clamped to [1,10] → adjustedCount++
    // pt('drop', 100): dropped → droppedCount++
    // rng('adj', 5, 50): clamped to [5,10] → adjustedCount++
    expect(r.droppedCount).toBe(1);
    expect(r.adjustedCount).toBe(2);
  });
});
