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
function makeStereo(left: Float32Array, right: Float32Array, sampleRate = 44100): AudioBuffer {
  return makeBuffer([left, right], sampleRate);
}
// Suite: analyzeAudioBuffer — stereo buffer
it('uses the louder channel for peak', () => {
  const left = new Float32Array(100).fill(0.3);
  const right = new Float32Array(100).fill(0.8);
  const result = analyzeAudioBuffer(makeStereo(left, right));
  expect(result.peakAmplitude).toBeCloseTo(0.8);
  expect(result.channelCount).toBe(2);
});
it('averages RMS across channels', () => {
  const left = new Float32Array(100).fill(0.5);
  const right = new Float32Array(100).fill(0.5);
  const result = analyzeAudioBuffer(makeStereo(left, right));
  expect(result.rmsAmplitude).toBeCloseTo(0.5, 5);
});
it('DC offset reflects average across both channels', () => {
  const left = new Float32Array(100).fill(0.4);
  const right = new Float32Array(100).fill(0.2);
  const result = analyzeAudioBuffer(makeStereo(left, right));
  expect(result.dcOffset).toBeCloseTo(0.3, 5);
});
