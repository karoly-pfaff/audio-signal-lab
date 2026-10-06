import { it, expect } from 'vitest';
import { getBpmRelation } from './bpm';
// Suite: getBpmRelation boundary conditions
it('returns compatible for exact diff of 2', () => {
  expect(getBpmRelation(100, 102)).toBe('compatible');
});
it('returns close for exact diff of 5', () => {
  expect(getBpmRelation(100, 105)).toBe('close');
});
it('returns mismatch for diff of 6 with no half/double relation', () => {
  expect(getBpmRelation(100, 106)).toBe('mismatch');
});
it('returns halfDouble for triple-tempo relation (75 vs 300)', () => {
  // normalizeBpm(75) = 75, normalizeBpm(300) = 75 — exact match
  expect(getBpmRelation(75, 300)).toBe('halfDouble');
});
