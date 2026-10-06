import { it, expect } from 'vitest';
import { getSpectrumFrame } from './instrumentUtils';
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
// Suite: getSpectrumFrame
it('returns empty array for zero frames', () => {
  const spectro: SpectroFrames = {
    flat: new Float32Array(0),
    numFrames: 0,
    binsPerFrame: 256,
    centroidBin: 0,
  };
  expect(getSpectrumFrame(spectro, 0.5).length).toBe(0);
});
it('returns binsPerFrame values', () => {
  const spectro = makeFrames(10, 256, 0.5);
  const frame = getSpectrumFrame(spectro, 0.5);
  expect(frame.length).toBe(256);
});
it('returns first frame at ratio 0', () => {
  const spectro = makeFrames(5, 4, (f) => f * 0.1);
  const frame = getSpectrumFrame(spectro, 0);
  for (const v of frame) {
    expect(v).toBeCloseTo(0, 5);
  }
});
it('returns last frame at ratio 1', () => {
  // 5 frames, each bin = frameIndex * 0.1
  // ratio=1 → frameIdx = min(4, floor(5)) = 4 → frame value = 0.4
  const spectro = makeFrames(5, 4, (f) => f * 0.1);
  const frame = getSpectrumFrame(spectro, 1.0);
  for (const v of frame) {
    expect(v).toBeCloseTo(0.4, 5);
  }
});
it('returns midpoint frame at ratio 0.5', () => {
  const spectro = makeFrames(10, 4, (f) => f);
  // ratio=0.5 → frameIdx = floor(0.5 * 10) = 5 → frame value = 5
  const frame = getSpectrumFrame(spectro, 0.5);
  for (const v of frame) {
    expect(v).toBe(5);
  }
});
it('does not throw for ratio below 0', () => {
  const spectro = makeFrames(5, 4, 1);
  expect(() => getSpectrumFrame(spectro, -1)).not.toThrow();
});
it('does not throw for ratio above 1', () => {
  const spectro = makeFrames(5, 4, 1);
  expect(() => getSpectrumFrame(spectro, 2)).not.toThrow();
});
it('clamped ratio below 0 returns first frame', () => {
  const spectro = makeFrames(5, 4, (f) => f * 0.1);
  const frame = getSpectrumFrame(spectro, -5);
  for (const v of frame) {
    expect(v).toBeCloseTo(0, 5);
  }
});
