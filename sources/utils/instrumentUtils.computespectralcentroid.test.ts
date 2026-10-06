import { it, expect } from 'vitest';
import { computeSpectralCentroid } from './instrumentUtils';
import type { SpectroFrames } from './instrumentUtils';
function makeFrames(
  numFrames: number,
  binsPerFrame: number,
  fill: number | ((f: number, b: number) => number) = 0,
  centroidBin = 0,
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
  return { flat, numFrames, binsPerFrame, centroidBin };
}
// Suite: computeSpectralCentroid
it('returns 0 for empty spectro frames', () => {
  const empty: SpectroFrames = {
    flat: new Float32Array(0),
    numFrames: 0,
    binsPerFrame: 0,
    centroidBin: 0,
  };
  expect(computeSpectralCentroid(empty, 44100)).toBe(0);
});
it('returns 0 for zero sampleRate', () => {
  const f = makeFrames(4, 64, 1, 10);
  expect(computeSpectralCentroid(f, 0)).toBe(0);
});
it('returns a positive value for non-zero magnitude frames', () => {
  const f = makeFrames(4, 64, 1, 10);
  expect(computeSpectralCentroid(f, 44100)).toBeGreaterThan(0);
});
it('centroid increases when energy is concentrated in higher bins', () => {
  // Low-energy frames: energy only in bin 0-15 (low freq)
  const lowFreq = makeFrames(4, 64, (_, b) => (b < 16 ? 1 : 0), 8);
  // High-energy frames: energy only in bins 48-63 (high freq)
  const highFreq = makeFrames(4, 64, (_, b) => (b >= 48 ? 1 : 0), 56);
  const centLow = computeSpectralCentroid(lowFreq, 44100);
  const centHigh = computeSpectralCentroid(highFreq, 44100);
  expect(centHigh).toBeGreaterThan(centLow);
});
it('all-zero magnitudes return 0', () => {
  const f = makeFrames(4, 64, 0);
  expect(computeSpectralCentroid(f, 44100)).toBe(0);
});
