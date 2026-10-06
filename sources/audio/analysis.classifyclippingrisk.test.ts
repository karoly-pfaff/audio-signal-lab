import { it, expect } from 'vitest';
import { classifyClippingRisk } from './analysis';
// Suite: classifyClippingRisk
it('returns none for zero count', () => {
  expect(classifyClippingRisk(0, 0)).toBe('none');
});
it('returns low for count > 0 with ratio below 0.001%', () => {
  expect(classifyClippingRisk(1, 0.000005)).toBe('low');
});
it('returns medium for ratio at or above 0.001% and below 0.01%', () => {
  expect(classifyClippingRisk(1, 0.00005)).toBe('medium');
});
it('returns high for ratio at or above 0.01%', () => {
  expect(classifyClippingRisk(1, 0.001)).toBe('high');
});
it('boundary: 0.00001 is medium, not low', () => {
  expect(classifyClippingRisk(1, 0.00001)).toBe('medium');
});
it('boundary: 0.0001 is high, not medium', () => {
  expect(classifyClippingRisk(1, 0.0001)).toBe('high');
});
