import { it, expect } from 'vitest';
import { getBpmRelation } from './bpm';
// Suite: getBpmRelation
it('returns compatible for values within 2 BPM', () => {
  expect(getBpmRelation(120, 121)).toBe('compatible');
  expect(getBpmRelation(120, 120)).toBe('compatible');
});
it('returns close for values within 5 BPM', () => {
  expect(getBpmRelation(120, 124)).toBe('close');
  expect(getBpmRelation(100, 95)).toBe('close');
});
it('returns halfDouble for half/double relations', () => {
  expect(getBpmRelation(70, 140)).toBe('halfDouble');
  expect(getBpmRelation(85, 170)).toBe('halfDouble');
});
it('returns mismatch for unrelated tempos', () => {
  expect(getBpmRelation(90, 130)).toBe('mismatch');
  expect(getBpmRelation(60, 95)).toBe('mismatch');
});
