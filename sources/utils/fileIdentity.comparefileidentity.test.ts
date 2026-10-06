import { it, expect } from 'vitest';
import { compareFileIdentity } from './fileIdentity';
import type { FileIdentity } from './fileIdentity';
function makeIdentity(overrides: Partial<FileIdentity> = {}): FileIdentity {
  return {
    name: 'track.wav',
    size: 44100000,
    lastModified: 1700000000000,
    durationSeconds: 120.0,
    sampleRate: 44100,
    channelCount: 2,
    quickHash: 'abcd1234',
    ...overrides,
  };
}
// Suite: compareFileIdentity
it('returns unknown when reference is null', () => {
  expect(compareFileIdentity(makeIdentity(), null)).toBe('unknown');
});
it('returns unknown when reference is undefined', () => {
  expect(compareFileIdentity(makeIdentity(), undefined)).toBe('unknown');
});
it('returns likely when both hashes match', () => {
  const loaded = makeIdentity({ quickHash: 'aa112233' });
  const ref = makeIdentity({ quickHash: 'aa112233' });
  expect(compareFileIdentity(loaded, ref)).toBe('likely');
});
it('returns possible-mismatch when both hashes are present but differ', () => {
  const loaded = makeIdentity({ quickHash: 'aa112233' });
  const ref = makeIdentity({ quickHash: 'bb445566' });
  expect(compareFileIdentity(loaded, ref)).toBe('possible-mismatch');
});
it('returns likely when all metadata matches and no hash present', () => {
  const loaded = makeIdentity({ quickHash: undefined });
  const ref = makeIdentity({ quickHash: undefined });
  expect(compareFileIdentity(loaded, ref)).toBe('likely');
});
it('returns possible-mismatch when duration differs by more than 1 second', () => {
  const loaded = makeIdentity({ quickHash: undefined, durationSeconds: 120.0 });
  const ref = makeIdentity({ quickHash: undefined, durationSeconds: 121.5 });
  expect(compareFileIdentity(loaded, ref)).toBe('possible-mismatch');
});
it('returns likely when duration differs by less than 1 second and metadata matches', () => {
  const loaded = makeIdentity({ quickHash: undefined, durationSeconds: 120.0 });
  const ref = makeIdentity({ quickHash: undefined, durationSeconds: 120.4 });
  expect(compareFileIdentity(loaded, ref)).toBe('likely');
});
it('returns possible-mismatch when name differs even if duration matches', () => {
  const loaded = makeIdentity({ quickHash: undefined, name: 'other.wav' });
  const ref = makeIdentity({ quickHash: undefined, name: 'track.wav' });
  expect(compareFileIdentity(loaded, ref)).toBe('possible-mismatch');
});
it('returns possible-mismatch when size differs and no hash', () => {
  const loaded = makeIdentity({ quickHash: undefined, size: 99999 });
  const ref = makeIdentity({ quickHash: undefined, size: 44100000 });
  expect(compareFileIdentity(loaded, ref)).toBe('possible-mismatch');
});
it('returns likely when loaded has no hash but ref does and metadata matches', () => {
  const loaded = makeIdentity({ quickHash: undefined });
  const ref = makeIdentity({ quickHash: 'somevalue' });
  expect(compareFileIdentity(loaded, ref)).toBe('likely');
});
