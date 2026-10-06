import { it, expect } from 'vitest';
import { getBandFrequencyCoverage } from './instrumentUtils';
// Suite: getBandFrequencyCoverage
it('returns kHz string for typical 44100 Hz, 256 bins', () => {
  const label = getBandFrequencyCoverage(44100, 256);
  expect(label).toMatch(/^0–/);
  expect(label).toMatch(/kHz$/);
});
it('returns Hz string when range is below 1000 Hz', () => {
  const label = getBandFrequencyCoverage(44100, 4);
  expect(label).toMatch(/Hz$/);
  expect(label).not.toMatch(/kHz/);
});
it('returns empty string for zero bins', () => {
  expect(getBandFrequencyCoverage(44100, 0)).toBe('');
});
it('returns empty string for zero sampleRate', () => {
  expect(getBandFrequencyCoverage(0, 256)).toBe('');
});
