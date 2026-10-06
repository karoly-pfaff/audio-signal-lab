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
// Suite: analyzeAudioBuffer — silent buffer
const silent = makeMono(new Float32Array(44100));
it('reports zero peak amplitude', () => {
  expect(analyzeAudioBuffer(silent).peakAmplitude).toBe(0);
});
it('reports null peakDb for silence', () => {
  expect(analyzeAudioBuffer(silent).peakDb).toBeNull();
});
it('reports null rmsDb for silence', () => {
  expect(analyzeAudioBuffer(silent).rmsDb).toBeNull();
});
it('reports null crestFactorDb for silence', () => {
  expect(analyzeAudioBuffer(silent).crestFactorDb).toBeNull();
});
it('reports zero dcOffset for silence', () => {
  expect(analyzeAudioBuffer(silent).dcOffset).toBe(0);
});
it('reports correct metadata for silent buffer', () => {
  const result = analyzeAudioBuffer(silent);
  expect(result.durationSeconds).toBeCloseTo(1);
  expect(result.sampleRate).toBe(44100);
  expect(result.channelCount).toBe(1);
});
