import { it, expect } from 'vitest';
import { computeTransientActivity } from './instrumentUtils';
// Suite: computeTransientActivity
it('returns empty array for input shorter than 2 samples', () => {
  expect(computeTransientActivity(new Float32Array(0)).length).toBe(0);
  expect(computeTransientActivity(new Float32Array(1)).length).toBe(0);
});
it('output has same length as input', () => {
  const energy = new Float32Array(10).fill(0.5);
  expect(computeTransientActivity(energy).length).toBe(10);
});
it('all values are in [0, 1]', () => {
  const energy = Float32Array.from({ length: 20 }, (_, i) => Math.sin(i * 0.5) * 0.5 + 0.5);
  const result = computeTransientActivity(energy);
  for (const v of result) {
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  }
});
it('constant energy produces zero transient activity', () => {
  const energy = new Float32Array(10).fill(0.7);
  const result = computeTransientActivity(energy);
  for (const v of result) {
    expect(v).toBe(0);
  }
});
it('single rising step produces 1.0 at the step and 0 elsewhere', () => {
  const energy = new Float32Array([0, 0, 0, 1, 0]);
  const result = computeTransientActivity(energy);
  expect(result[3]).toBeCloseTo(1.0, 5);
  expect(result[0]).toBe(0);
  expect(result[1]).toBe(0);
  expect(result[2]).toBe(0);
  expect(result[4]).toBe(0);
});
it('negative differences produce zero (not negative values)', () => {
  const energy = Float32Array.from([1, 0.8, 0.5, 0.2]);
  const result = computeTransientActivity(energy);
  for (const v of result) {
    expect(v).toBeGreaterThanOrEqual(0);
  }
});
it('normalized max value is 1.0 when any positive diff exists', () => {
  const energy = Float32Array.from([0, 0.3, 0.8, 0.5]);
  const result = computeTransientActivity(energy);
  const max = Math.max(...result);
  expect(max).toBeCloseTo(1.0, 5);
});
