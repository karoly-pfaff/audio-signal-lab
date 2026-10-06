import { it, expect } from 'vitest';
import { normalizeBpm } from './bpm';
// Suite: normalizeBpm boundary conditions
it('returns 119.9 unchanged (just below 120)', () => {
  expect(normalizeBpm(119.9)).toBeCloseTo(119.9);
});
it('folds 120 down to 60 (boundary inclusive)', () => {
  expect(normalizeBpm(120)).toBe(60);
});
it('handles very high BPM via repeated halving (480 → 60)', () => {
  expect(normalizeBpm(480)).toBe(60);
});
it('handles very low BPM via repeated doubling (15 → 60)', () => {
  expect(normalizeBpm(15)).toBe(60);
});
it('handles 300 BPM correctly (300 → 75)', () => {
  expect(normalizeBpm(300)).toBeCloseTo(75);
});
