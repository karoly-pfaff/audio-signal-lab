import { it, expect } from 'vitest';
import { formatBpm } from './bpm';
// Suite: formatBpm
it('returns empty string for null', () => {
  expect(formatBpm(null)).toBe('');
});
it('returns empty string for undefined', () => {
  expect(formatBpm(undefined)).toBe('');
});
it('formats integer BPM without prefix', () => {
  expect(formatBpm(120)).toBe('120 BPM');
});
it('rounds fractional BPM to nearest integer', () => {
  expect(formatBpm(124.7)).toBe('125 BPM');
  expect(formatBpm(92.3)).toBe('92 BPM');
});
it('adds ~ prefix for low confidence', () => {
  expect(formatBpm(92, 'low')).toBe('~92 BPM');
});
it('does not add prefix for high confidence', () => {
  expect(formatBpm(120, 'high')).toBe('120 BPM');
});
it('does not add prefix for medium confidence', () => {
  expect(formatBpm(120, 'medium')).toBe('120 BPM');
});
it('does not add prefix when confidence is undefined', () => {
  expect(formatBpm(120, undefined)).toBe('120 BPM');
});
