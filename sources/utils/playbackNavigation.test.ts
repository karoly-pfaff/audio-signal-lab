import { describe, it, expect } from 'vitest';
import {
  clampRatio,
  clampSeek,
  jumpOffset,
  filePlayhead,
  JUMP_SECONDS,
} from './playbackNavigation';

describe('JUMP_SECONDS', () => {
  it('is 5', () => {
    expect(JUMP_SECONDS).toBe(5);
  });
});

describe('clampSeek', () => {
  it('clamps negative to 0', () => {
    expect(clampSeek(-3, 120)).toBe(0);
  });

  it('clamps above duration to duration', () => {
    expect(clampSeek(200, 120)).toBe(120);
  });

  it('passes through value within range', () => {
    expect(clampSeek(60, 120)).toBe(60);
  });

  it('allows any positive value when duration is 0', () => {
    expect(clampSeek(5, 0)).toBe(5);
  });

  it('clamps to 0 for negative value regardless of duration', () => {
    expect(clampSeek(-1, 0)).toBe(0);
  });

  it('handles exact boundary: 0', () => {
    expect(clampSeek(0, 120)).toBe(0);
  });

  it('handles exact boundary: duration', () => {
    expect(clampSeek(120, 120)).toBe(120);
  });
});

describe('jumpOffset', () => {
  it('adds delta to current position', () => {
    expect(jumpOffset(10, 5, 120)).toBe(15);
  });

  it('clamps result to 0 when jumping back before start', () => {
    expect(jumpOffset(3, -5, 120)).toBe(0);
  });

  it('clamps result to duration when jumping forward past end', () => {
    expect(jumpOffset(118, 5, 120)).toBe(120);
  });

  it('handles zero duration gracefully', () => {
    expect(jumpOffset(0, 5, 0)).toBe(5);
  });

  it('negative delta jump back stays clamped at 0', () => {
    expect(jumpOffset(0, -5, 120)).toBe(0);
  });
});

describe('filePlayhead', () => {
  it('returns undefined when not playing', () => {
    expect(filePlayhead(10, 4, false)).toBeUndefined();
  });

  it('returns undefined when duration is 0', () => {
    expect(filePlayhead(10, 0, true)).toBeUndefined();
  });

  it('returns position ratio for mid-track position', () => {
    const result = filePlayhead(3, 4, true);
    expect(result).toBeCloseTo(0.75);
  });

  it('clamps to 1 past track end', () => {
    const result = filePlayhead(5, 4, true);
    expect(result).toBe(1);
  });

  it('returns 0 at track start', () => {
    expect(filePlayhead(0, 4, true)).toBe(0);
  });

  it('returns 1 at exact track end', () => {
    const result = filePlayhead(4, 4, true);
    expect(result).toBe(1);
  });

  it('clamps to 1 well beyond track end', () => {
    const result = filePlayhead(9, 4, true);
    expect(result).toBe(1);
  });
});

// ── clampRatio ────────────────────────────────────────────────────────────────

describe('clampRatio', () => {
  it('passes through value already in [0, 1]', () => {
    expect(clampRatio(0.5)).toBe(0.5);
  });

  it('clamps value below 0 to 0', () => {
    expect(clampRatio(-0.5)).toBe(0);
  });

  it('clamps value above 1 to 1', () => {
    expect(clampRatio(1.5)).toBe(1);
  });

  it('returns 0 exactly at boundary', () => {
    expect(clampRatio(0)).toBe(0);
  });

  it('returns 1 exactly at boundary', () => {
    expect(clampRatio(1)).toBe(1);
  });

  it('clamps large negative values', () => {
    expect(clampRatio(-100)).toBe(0);
  });

  it('clamps large positive values', () => {
    expect(clampRatio(100)).toBe(1);
  });
});
