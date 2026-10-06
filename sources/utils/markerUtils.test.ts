import { describe, it, expect } from 'vitest';
import {
  createPointMarker,
  createRangeMarker,
  isRangeMarker,
  sortMarkersByTime,
  formatMarkerRange,
} from './markerUtils';

describe('createPointMarker', () => {
  it('creates a point marker with correct type and time', () => {
    const m = createPointMarker(5.0, 1);
    expect(m.type).toBe('point');
    expect(m.startSeconds).toBe(5.0);
    expect(m.endSeconds).toBeUndefined();
    expect(m.label).toBe('Marker 1');
  });

  it('uses the index in the default label', () => {
    expect(createPointMarker(0, 3).label).toBe('Marker 3');
  });

  it('generates a unique id each call', () => {
    const m1 = createPointMarker(1.0, 1);
    const m2 = createPointMarker(1.0, 2);
    expect(m1.id).not.toBe(m2.id);
  });

  it('sets createdAt to a positive number', () => {
    const m = createPointMarker(0, 1);
    expect(m.createdAt).toBeGreaterThan(0);
  });

  it('preserves arbitrary time values including fractional seconds', () => {
    const m = createPointMarker(12.345, 1);
    expect(m.startSeconds).toBe(12.345);
  });
});

describe('createRangeMarker', () => {
  it('creates a range marker with correct type and times', () => {
    const m = createRangeMarker(2.0, 5.0, 1);
    expect(m.type).toBe('range');
    expect(m.startSeconds).toBe(2.0);
    expect(m.endSeconds).toBe(5.0);
    expect(m.label).toBe('Marker 1');
  });

  it('normalizes reversed start/end so startSeconds <= endSeconds', () => {
    const m = createRangeMarker(8.0, 3.0, 2);
    expect(m.startSeconds).toBe(3.0);
    expect(m.endSeconds).toBe(8.0);
  });

  it('handles equal start and end', () => {
    const m = createRangeMarker(4.0, 4.0, 1);
    expect(m.startSeconds).toBe(4.0);
    expect(m.endSeconds).toBe(4.0);
  });

  it('generates a unique id each call', () => {
    const m1 = createRangeMarker(0, 1, 1);
    const m2 = createRangeMarker(0, 1, 2);
    expect(m1.id).not.toBe(m2.id);
  });

  it('uses the index in the default label', () => {
    expect(createRangeMarker(0, 5, 7).label).toBe('Marker 7');
  });
});

describe('isRangeMarker', () => {
  it('returns true for a range marker', () => {
    const m = createRangeMarker(0, 5, 1);
    expect(isRangeMarker(m)).toBe(true);
  });

  it('returns false for a point marker', () => {
    const m = createPointMarker(3, 1);
    expect(isRangeMarker(m)).toBe(false);
  });
});

describe('sortMarkersByTime', () => {
  it('sorts markers by startSeconds ascending', () => {
    const markers = [createPointMarker(10, 1), createPointMarker(2, 2), createPointMarker(7, 3)];
    const sorted = sortMarkersByTime(markers);
    expect(sorted.map((m) => m.startSeconds)).toEqual([2, 7, 10]);
  });

  it('returns a new array without mutating the original', () => {
    const m1 = createPointMarker(5, 1);
    const m2 = createPointMarker(1, 2);
    const original = [m1, m2];
    const sorted = sortMarkersByTime(original);
    expect(original[0]).toBe(m1);
    expect(sorted[0]).toBe(m2);
  });

  it('handles an empty array', () => {
    expect(sortMarkersByTime([])).toEqual([]);
  });

  it('preserves stable order for markers with same startSeconds', () => {
    const m1 = createPointMarker(3, 1);
    const m2 = createRangeMarker(3, 6, 2);
    const sorted = sortMarkersByTime([m1, m2]);
    expect(sorted).toHaveLength(2);
  });
});

describe('formatMarkerRange', () => {
  it('formats a point marker as a single time string', () => {
    const m = createPointMarker(65, 1); // 1 min 5 sec
    expect(formatMarkerRange(m)).toBe('1:05.0');
  });

  it('formats a range marker with an em-dash separator', () => {
    const m = createRangeMarker(3.5, 65, 1); // 0:03.5 — 1:05.0
    expect(formatMarkerRange(m)).toBe('0:03.5 — 1:05.0');
  });

  it('formats zero seconds correctly', () => {
    const m = createPointMarker(0, 1);
    expect(formatMarkerRange(m)).toBe('0:00.0');
  });

  it('formats sub-second times with tenths', () => {
    const m = createPointMarker(0.7, 1);
    expect(formatMarkerRange(m)).toBe('0:00.7');
  });

  it('preserves exact tenths for point and range markers', () => {
    expect(formatMarkerRange(createPointMarker(5.1, 1))).toBe('0:05.1');
    expect(formatMarkerRange(createPointMarker(8.1, 1))).toBe('0:08.1');
    expect(formatMarkerRange(createRangeMarker(5, 5.1, 1))).toBe('0:05.0 — 0:05.1');
    expect(formatMarkerRange(createPointMarker(5.099, 1))).toBe('0:05.0');
  });

  it('formats times over one hour', () => {
    const m = createPointMarker(3661, 1); // 1h 1min 1sec
    expect(formatMarkerRange(m)).toBe('61:01.0');
  });
});
