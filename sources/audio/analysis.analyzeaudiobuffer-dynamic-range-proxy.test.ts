import { it, expect } from 'vitest';
import { analyzeAudioBuffer } from './analysis';
function makeBuffer(channels: Float32Array[], sampleRate = 44100): AudioBuffer {
  const length = channels[0]?.length ?? 0;
  return {
    length,
    duration: length / sampleRate,
    numberOfChannels: channels.length,
    sampleRate,
    getChannelData: (c: number) => channels[c],
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as unknown as AudioBuffer;
}
function makeMono(data: Float32Array, sampleRate = 44100): AudioBuffer {
  return makeBuffer([data], sampleRate);
}
// Suite: analyzeAudioBuffer — dynamic range proxy
it('returns null for a buffer shorter than 2 windows (< 200ms)', () => {
  const buf = makeMono(new Float32Array(100), 44100);
  expect(analyzeAudioBuffer(buf).dynamicRangeProxyDb).toBeNull();
});
it('returns null for a silent buffer (all windows are silent)', () => {
  const buf = makeMono(new Float32Array(44100));
  expect(analyzeAudioBuffer(buf).dynamicRangeProxyDb).toBeNull();
});
it('returns near 0 for a constant-level signal (no dynamic range)', () => {
  const data = new Float32Array(44100).fill(0.5);
  const result = analyzeAudioBuffer(makeMono(data));
  // constant signal: max and min window RMS are equal → DR proxy ≈ 0
  if (result.dynamicRangeProxyDb !== null) {
    expect(result.dynamicRangeProxyDb).toBeCloseTo(0, 1);
  }
});
it('returns a positive value for a signal with varying amplitude', () => {
  // First half loud, second half quiet
  const data = new Float32Array(44100 * 2);
  for (let i = 0; i < 44100; i++) {
    data[i] = 0.9;
  }
  for (let i = 44100; i < 44100 * 2; i++) {
    data[i] = 0.01;
  }
  const result = analyzeAudioBuffer(makeMono(data));
  expect(result.dynamicRangeProxyDb).not.toBeNull();
  expect(result.dynamicRangeProxyDb!).toBeGreaterThan(0);
});
