import { it, expect } from 'vitest';
import { maybeHalfDoubleMatch } from './bpm';
// Suite: maybeHalfDoubleMatch
it('matches 70 vs 140 (exact double)', () => {
  expect(maybeHalfDoubleMatch(70, 140)).toBe(true);
});
it('matches 85 vs 170 (exact double)', () => {
  expect(maybeHalfDoubleMatch(85, 170)).toBe(true);
});
it('matches equal values', () => {
  expect(maybeHalfDoubleMatch(120, 120)).toBe(true);
});
it('matches values close after normalization', () => {
  expect(maybeHalfDoubleMatch(100, 102)).toBe(true);
});
it('returns false for unrelated tempos', () => {
  expect(maybeHalfDoubleMatch(80, 120)).toBe(false);
});
