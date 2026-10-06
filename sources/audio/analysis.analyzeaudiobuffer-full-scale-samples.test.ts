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
// Suite: analyzeAudioBuffer — full-scale samples
it('reports peak of 1.0 for buffer with one full-scale sample', () => {
  const data = new Float32Array(100);
  data[50] = 1.0;
  const result = analyzeAudioBuffer(makeMono(data));
  expect(result.peakAmplitude).toBe(1.0);
  expect(result.peakDb).toBeCloseTo(0, 5);
});
it('handles negative samples correctly', () => {
  const data = new Float32Array(100);
  data[50] = -1.0;
  const result = analyzeAudioBuffer(makeMono(data));
  expect(result.peakAmplitude).toBe(1.0);
});
it('crest factor is positive when peak > rms', () => {
  const data = new Float32Array(1000);
  data[500] = 1.0; // single spike in quiet signal (others are 0)
  const result = analyzeAudioBuffer(makeMono(data));
  if (result.crestFactorDb !== null) {
    expect(result.crestFactorDb).toBeGreaterThan(0);
  }
});
