import { it, expect } from 'vitest';
import { computeQuickIdentityHash } from './fileIdentity';
// Suite: computeQuickIdentityHash
const hash = (name: string, size: number, audioSamples: ReadonlyArray<number>) =>
  computeQuickIdentityHash({
    name,
    size,
    lastModified: 1700000000000,
    durationSeconds: 120,
    sampleRate: 44100,
    channelCount: 2,
    audioSamples,
  });
it('returns an 8-character lowercase hex string', () => {
  const h = hash('file.wav', 1000, [0.1, -0.2]);
  expect(h).toMatch(/^[0-9a-f]{8}$/);
});
it('is deterministic for identical inputs', () => {
  const samples = [0.1, -0.2, 0.3];
  const a = hash('file.wav', 1000, samples);
  const b = hash('file.wav', 1000, samples);
  expect(a).toBe(b);
});
it('differs when name changes', () => {
  const base = [0.1, -0.2];
  const a = hash('file-a.wav', 1000, base);
  const b = hash('file-b.wav', 1000, base);
  expect(a).not.toBe(b);
});
it('differs when size changes', () => {
  const base = [0.1, -0.2];
  const a = hash('file.wav', 1000, base);
  const b = hash('file.wav', 9999, base);
  expect(a).not.toBe(b);
});
it('differs when audio samples change', () => {
  const a = hash('file.wav', 1000, [0.1, 0.2]);
  const b = hash('file.wav', 1000, [0.9, 0.8]);
  expect(a).not.toBe(b);
});
it('handles empty samples array without throwing', () => {
  expect(() => hash('file.wav', 1000, [])).not.toThrow();
});
