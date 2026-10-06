import { it, expect } from 'vitest';
import { computeEnergyTimeline } from './instrumentUtils';
// Suite: computeEnergyTimeline
it('returns empty array for empty channels', () => {
  expect(computeEnergyTimeline([], 100).length).toBe(0);
});
it('returns empty array for zero buckets', () => {
  const ch = [new Float32Array(1000)];
  expect(computeEnergyTimeline(ch, 0).length).toBe(0);
});
it('returns correct bucket count', () => {
  const ch = [new Float32Array(44100)];
  const result = computeEnergyTimeline(ch, 200);
  expect(result.length).toBe(200);
});
it('all-zero signal produces zero energy in every bucket', () => {
  const ch = [new Float32Array(1000)];
  const result = computeEnergyTimeline(ch, 10);
  for (const v of result) {
    expect(v).toBe(0);
  }
});
it('constant-amplitude mono signal produces constant RMS', () => {
  const data = new Float32Array(1000).fill(0.5);
  const result = computeEnergyTimeline([data], 10);
  for (const v of result) {
    expect(v).toBeCloseTo(0.5, 3);
  }
});
it('constant-amplitude stereo signal produces correct RMS', () => {
  const left = new Float32Array(1000).fill(0.5);
  const right = new Float32Array(1000).fill(0.5);
  const result = computeEnergyTimeline([left, right], 10);
  for (const v of result) {
    expect(v).toBeCloseTo(0.5, 3);
  }
});
it('energy values are always non-negative', () => {
  const data = Float32Array.from({ length: 1000 }, (_, i) => Math.sin(i));
  const result = computeEnergyTimeline([data], 20);
  for (const v of result) {
    expect(v).toBeGreaterThanOrEqual(0);
  }
});
it('single-sample channels still produce bucket count', () => {
  const ch = [new Float32Array([1])];
  const result = computeEnergyTimeline(ch, 4);
  expect(result.length).toBe(4);
});
it('energy is approximately 1/√2 for a 0.5 amplitude sine wave', () => {
  // RMS of A*sin = A/√2
  const size = 44100;
  const data = Float32Array.from(
    { length: size },
    (_, i) => 0.5 * Math.sin((2 * Math.PI * 440 * i) / 44100),
  );
  const result = computeEnergyTimeline([data], 1);
  expect(result[0]).toBeCloseTo(0.5 / Math.SQRT2, 1);
});

it('keeps every proportional bucket populated for non-divisible input lengths', () => {
  const result = computeEnergyTimeline([new Float32Array(401).fill(1)], 400);

  expect(Array.from(result).every((value) => value === 1)).toBe(true);
});
