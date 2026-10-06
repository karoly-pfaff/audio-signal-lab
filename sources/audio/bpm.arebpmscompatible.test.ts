import { it, expect } from 'vitest';
import { areBpmsCompatible } from './bpm';
// Suite: areBpmsCompatible
it('is true for compatible', () => {
  expect(areBpmsCompatible(120, 121)).toBe(true);
});
it('is true for close', () => {
  expect(areBpmsCompatible(120, 124)).toBe(true);
});
it('is true for halfDouble', () => {
  expect(areBpmsCompatible(70, 140)).toBe(true);
});
it('is false for mismatch', () => {
  expect(areBpmsCompatible(90, 130)).toBe(false);
});
