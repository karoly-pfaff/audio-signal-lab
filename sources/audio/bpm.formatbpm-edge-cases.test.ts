import { it, expect } from 'vitest';
import { formatBpm } from './bpm';
// Suite: formatBpm edge cases
it('returns empty string for null confidence with null bpm', () => {
  expect(formatBpm(null, null)).toBe('');
});
it('adds ~ prefix for low confidence regardless of integer/fractional value', () => {
  expect(formatBpm(128.4, 'low')).toBe('~128 BPM');
});
it('does not add prefix for null confidence argument', () => {
  expect(formatBpm(110, null)).toBe('110 BPM');
});
