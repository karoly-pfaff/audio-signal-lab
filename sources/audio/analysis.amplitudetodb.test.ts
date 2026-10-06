import { it, expect } from 'vitest';
import { amplitudeToDb } from './analysis';
// Suite: amplitudeToDb
it('returns 0 for amplitude 1.0 (full scale)', () => {
  expect(amplitudeToDb(1)).toBeCloseTo(0);
});
it('returns approximately -6 for amplitude 0.5', () => {
  expect(amplitudeToDb(0.5)).toBeCloseTo(-6.02, 1);
});
it('returns approximately -20 for amplitude 0.1', () => {
  expect(amplitudeToDb(0.1)).toBeCloseTo(-20, 1);
});
it('returns null for amplitude 0', () => {
  expect(amplitudeToDb(0)).toBeNull();
});
it('returns null for negative amplitude', () => {
  expect(amplitudeToDb(-1)).toBeNull();
});
