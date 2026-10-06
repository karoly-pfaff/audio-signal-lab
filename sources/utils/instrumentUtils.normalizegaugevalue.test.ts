import { it, expect } from 'vitest';
import { normalizeGaugeValue } from './instrumentUtils';
// Suite: normalizeGaugeValue
it('returns 0 for value at minDb', () => {
  expect(normalizeGaugeValue(0, 0, 30)).toBe(0);
});
it('returns 1 for value at maxDb', () => {
  expect(normalizeGaugeValue(30, 0, 30)).toBe(1);
});
it('returns 0.5 for value at midpoint', () => {
  expect(normalizeGaugeValue(15, 0, 30)).toBeCloseTo(0.5, 5);
});
it('clamps below minDb to 0', () => {
  expect(normalizeGaugeValue(-5, 0, 30)).toBe(0);
});
it('clamps above maxDb to 1', () => {
  expect(normalizeGaugeValue(40, 0, 30)).toBe(1);
});
it('returns 0 when maxDb equals minDb', () => {
  expect(normalizeGaugeValue(15, 15, 15)).toBe(0);
});
it('works with negative dB range', () => {
  expect(normalizeGaugeValue(-10, -20, 0)).toBeCloseTo(0.5, 5);
});
