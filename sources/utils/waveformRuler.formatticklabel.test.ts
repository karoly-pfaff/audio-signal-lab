import { it, expect } from 'vitest';
import { formatTickLabel } from './waveformRuler';
// Suite: formatTickLabel
it('formats zero', () => {
  expect(formatTickLabel(0)).toBe('0:00');
});
it('formats seconds only', () => {
  expect(formatTickLabel(5)).toBe('0:05');
  expect(formatTickLabel(59)).toBe('0:59');
});
it('formats minutes and seconds', () => {
  expect(formatTickLabel(60)).toBe('1:00');
  expect(formatTickLabel(90)).toBe('1:30');
  expect(formatTickLabel(125)).toBe('2:05');
});
it('pads seconds with leading zero', () => {
  expect(formatTickLabel(61)).toBe('1:01');
  expect(formatTickLabel(609)).toBe('10:09');
});
it('takes floor of fractional seconds', () => {
  expect(formatTickLabel(30.9)).toBe('0:30');
  expect(formatTickLabel(59.99)).toBe('0:59');
});
