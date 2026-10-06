import { it, expect } from 'vitest';
import { getBandBinRanges, BAND_NAMES } from './instrumentUtils';
// Suite: getBandBinRanges
it('sub.lo is 0', () => {
  const r = getBandBinRanges(44100, 256);
  expect(r.sub.lo).toBe(0);
});
it('ranges are non-overlapping at 44100 Hz', () => {
  const r = getBandBinRanges(44100, 256);
  expect(r.sub.hi).toBeLessThan(r.bass.lo);
  expect(r.bass.hi).toBeLessThan(r.lowMid.lo);
  expect(r.lowMid.hi).toBeLessThan(r.highMid.lo);
});
it('highMid.hi equals binsPerFrame - 1', () => {
  const r = getBandBinRanges(44100, 256);
  expect(r.highMid.hi).toBe(255);
});
it('all range bins are within [0, binsPerFrame-1]', () => {
  const r = getBandBinRanges(44100, 256);
  for (const name of BAND_NAMES) {
    expect(r[name].lo).toBeGreaterThanOrEqual(0);
    expect(r[name].hi).toBeLessThanOrEqual(255);
  }
});
it('ranges are non-overlapping at 48000 Hz', () => {
  const r = getBandBinRanges(48000, 256);
  expect(r.sub.hi).toBeLessThan(r.bass.lo);
  expect(r.bass.hi).toBeLessThan(r.lowMid.lo);
  expect(r.lowMid.hi).toBeLessThan(r.highMid.lo);
  expect(r.highMid.hi).toBe(255);
});
