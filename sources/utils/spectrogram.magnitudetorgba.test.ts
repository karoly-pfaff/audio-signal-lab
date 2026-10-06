import { it, expect } from 'vitest';
import { magnitudeToRGBA } from './spectrogram';
// Suite: magnitudeToRGBA
it('v=0 produces fully transparent (alpha=0)', () => {
  const out = new Uint8ClampedArray(4);
  magnitudeToRGBA(0, out, 0);
  expect(out[3]).toBe(0);
});
it('v=1 produces near-opaque (alpha≥250)', () => {
  const out = new Uint8ClampedArray(4);
  magnitudeToRGBA(1, out, 0);
  expect(out[3]).toBeGreaterThanOrEqual(250);
});
it('v=0.5 produces a mid-range alpha', () => {
  const out = new Uint8ClampedArray(4);
  magnitudeToRGBA(0.5, out, 0);
  expect(out[3]).toBeGreaterThan(100);
  expect(out[3]).toBeLessThan(256);
});
it('respects the pixel offset parameter', () => {
  const out = new Uint8ClampedArray(8);
  magnitudeToRGBA(0.5, out, 4);
  // First four bytes must be untouched
  expect(out[0]).toBe(0);
  expect(out[1]).toBe(0);
  expect(out[2]).toBe(0);
  expect(out[3]).toBe(0);
  // Alpha in second pixel must be non-zero
  expect(out[7]).toBeGreaterThan(0);
});
it('alpha is non-decreasing as v increases', () => {
  const out = new Uint8ClampedArray(4);
  const samples = [0, 0.1, 0.2, 0.4, 0.6, 0.8, 1.0];
  let prev = -1;
  for (const v of samples) {
    magnitudeToRGBA(v, out, 0);
    expect(out[3]).toBeGreaterThanOrEqual(prev);
    prev = out[3];
  }
});
