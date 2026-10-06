import { it, expect } from 'vitest';
import { generateRulerTicks } from './waveformRuler';
// Suite: generateRulerTicks
it('returns a single 0:00 tick for sub-second duration', () => {
  const ticks = generateRulerTicks(0.5);
  expect(ticks).toHaveLength(1);
  expect(ticks[0]).toEqual({ ratio: 0, label: '0:00' });
});
it('returns a single 0:00 tick for zero duration', () => {
  const ticks = generateRulerTicks(0);
  expect(ticks).toHaveLength(1);
  expect(ticks[0]).toEqual({ ratio: 0, label: '0:00' });
});
it('always starts with a tick at ratio 0', () => {
  for (const d of [1, 5, 30, 120, 600, 3600]) {
    const ticks = generateRulerTicks(d);
    expect(ticks[0].ratio).toBe(0);
    expect(ticks[0].label).toBe('0:00');
  }
});
it('returns at most MAX_TICKS ticks', () => {
  for (const d of [10, 30, 60, 120, 300, 600, 3600]) {
    const ticks = generateRulerTicks(d);
    expect(ticks.length).toBeLessThanOrEqual(8);
  }
});
it('uses 1-second intervals for a 5-second file', () => {
  const ticks = generateRulerTicks(5);
  expect(ticks.length).toBe(6);
  expect(ticks[1]).toEqual({ ratio: 1 / 5, label: '0:01' });
  expect(ticks[5]).toEqual({ ratio: 1, label: '0:05' });
});
it('uses 5-second intervals for a 30-second file', () => {
  const ticks = generateRulerTicks(30);
  expect(ticks.length).toBe(7);
  expect(ticks[1]).toEqual({ ratio: 5 / 30, label: '0:05' });
});
it('uses 30-second intervals for a 2-minute file', () => {
  const ticks = generateRulerTicks(120);
  const labels = ticks.map((t) => t.label);
  expect(labels).toContain('0:30');
  expect(labels).toContain('1:00');
  expect(labels).toContain('1:30');
  expect(labels).toContain('2:00');
});
it('uses 60-second intervals for a 5-minute file', () => {
  const ticks = generateRulerTicks(300);
  const labels = ticks.map((t) => t.label);
  expect(labels).toContain('1:00');
  expect(labels).toContain('2:00');
  expect(labels).toContain('5:00');
});
it('ratio values are within [0, 1]', () => {
  for (const d of [5, 30, 120, 600, 3600]) {
    const ticks = generateRulerTicks(d);
    for (const tick of ticks) {
      expect(tick.ratio).toBeGreaterThanOrEqual(0);
      expect(tick.ratio).toBeLessThanOrEqual(1.001);
    }
  }
});
it('handles 1-hour file without exceeding tick limit', () => {
  const ticks = generateRulerTicks(3600);
  expect(ticks.length).toBeLessThanOrEqual(8);
  expect(ticks[0].label).toBe('0:00');
});
