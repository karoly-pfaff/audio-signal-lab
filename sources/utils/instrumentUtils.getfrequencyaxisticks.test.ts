import { it, expect } from 'vitest';
import { getFrequencyAxisTicks } from './instrumentUtils';
// Suite: getFrequencyAxisTicks
const SR = 44100;
const BINS = 256;
it('returns an array of ticks', () => {
  const ticks = getFrequencyAxisTicks(SR, BINS);
  expect(ticks.length).toBeGreaterThan(0);
});
it('all xRatio values are in [0, 1)', () => {
  const ticks = getFrequencyAxisTicks(SR, BINS);
  for (const t of ticks) {
    expect(t.xRatio).toBeGreaterThanOrEqual(0);
    expect(t.xRatio).toBeLessThan(1);
  }
});
it('labels use "k" suffix for kHz values', () => {
  const ticks = getFrequencyAxisTicks(SR, BINS);
  const khzTick = ticks.find((t) => t.hz >= 1000);
  expect(khzTick).toBeDefined();
  expect(khzTick!.label).toMatch(/k$/);
});
it('labels use plain number for sub-kHz values', () => {
  const ticks = getFrequencyAxisTicks(SR, BINS);
  const hzTick = ticks.find((t) => t.hz < 1000);
  expect(hzTick).toBeDefined();
  expect(hzTick!.label).not.toMatch(/k/);
});
it('ticks are ordered by xRatio', () => {
  const ticks = getFrequencyAxisTicks(SR, BINS);
  for (let i = 1; i < ticks.length; i++) {
    expect(ticks[i].xRatio).toBeGreaterThan(ticks[i - 1].xRatio);
  }
});
it('excludes ticks above the available frequency range', () => {
  const ticks = getFrequencyAxisTicks(SR, BINS);
  const binHz = SR / 2048;
  const maxHz = BINS * binHz;
  for (const t of ticks) {
    expect(t.hz).toBeLessThan(maxHz);
  }
});
it('returns empty array for zero bins', () => {
  expect(getFrequencyAxisTicks(SR, 0)).toEqual([]);
});
it('returns empty array for zero sampleRate', () => {
  expect(getFrequencyAxisTicks(0, BINS)).toEqual([]);
});
it('1 kHz tick xRatio is greater than 200 Hz tick xRatio', () => {
  const ticks = getFrequencyAxisTicks(SR, BINS);
  const t200 = ticks.find((t) => t.hz === 200);
  const t1k = ticks.find((t) => t.hz === 1000);
  expect(t200).toBeDefined();
  expect(t1k).toBeDefined();
  expect(t1k!.xRatio).toBeGreaterThan(t200!.xRatio);
});
