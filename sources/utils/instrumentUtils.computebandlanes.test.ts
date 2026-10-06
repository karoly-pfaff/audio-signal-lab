import { it, expect } from 'vitest';
import { computeBandLanes, BAND_NAMES } from './instrumentUtils';
import type { SpectroFrames } from './instrumentUtils';
function makeFrames(
  numFrames: number,
  binsPerFrame: number,
  fill: number | ((f: number, b: number) => number) = 0,
): SpectroFrames {
  const flat = new Float32Array(numFrames * binsPerFrame);
  if (typeof fill === 'number') {
    flat.fill(fill);
  } else {
    for (let f = 0; f < numFrames; f++) {
      for (let b = 0; b < binsPerFrame; b++) {
        flat[f * binsPerFrame + b] = fill(f, b);
      }
    }
  }
  return { flat, numFrames, binsPerFrame, centroidBin: 0 };
}
// Suite: computeBandLanes
it('returns empty arrays for zero frames', () => {
  const spectro: SpectroFrames = {
    flat: new Float32Array(0),
    numFrames: 0,
    binsPerFrame: 256,
    centroidBin: 0,
  };
  const result = computeBandLanes(spectro, 44100);
  for (const name of BAND_NAMES) {
    expect(result[name].length).toBe(0);
  }
});
it('each band has numFrames entries', () => {
  const spectro = makeFrames(50, 256, 0.5);
  const result = computeBandLanes(spectro, 44100);
  for (const name of BAND_NAMES) {
    expect(result[name].length).toBe(50);
  }
});
it('all-zero frames produce zero band energy', () => {
  const spectro = makeFrames(10, 256, 0);
  const result = computeBandLanes(spectro, 44100);
  for (const name of BAND_NAMES) {
    for (const v of result[name]) {
      expect(v).toBe(0);
    }
  }
});
it('all-one frames produce non-zero band energy in every band', () => {
  const spectro = makeFrames(10, 256, 1);
  const result = computeBandLanes(spectro, 44100);
  for (const name of BAND_NAMES) {
    for (const v of result[name]) {
      expect(v).toBeGreaterThan(0);
    }
  }
});
it('band energy values are in [0, 1] for normalized [0,1] input', () => {
  const spectro = makeFrames(20, 256, (_, b) => b / 255);
  const result = computeBandLanes(spectro, 44100);
  for (const name of BAND_NAMES) {
    for (const v of result[name]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  }
});
it('band energy is consistent across frames for uniform input', () => {
  const spectro = makeFrames(5, 256, 0.75);
  const result = computeBandLanes(spectro, 44100);
  for (const name of BAND_NAMES) {
    const first = result[name][0];
    for (const v of result[name]) {
      expect(v).toBeCloseTo(first, 5);
    }
  }
});
