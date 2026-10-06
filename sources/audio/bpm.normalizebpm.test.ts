import { it, expect } from 'vitest';
import { normalizeBpm } from './bpm';
// Suite: normalizeBpm
it('returns value already in [60, 120) unchanged', () => {
  expect(normalizeBpm(90)).toBe(90);
  expect(normalizeBpm(60)).toBe(60);
});
it('halves values at or above 120', () => {
  expect(normalizeBpm(120)).toBe(60);
  expect(normalizeBpm(140)).toBeCloseTo(70);
});
it('doubles values below 60', () => {
  expect(normalizeBpm(40)).toBe(80);
  expect(normalizeBpm(30)).toBe(60);
});
it('handles 240 (two halvings)', () => {
  expect(normalizeBpm(240)).toBe(60);
});
