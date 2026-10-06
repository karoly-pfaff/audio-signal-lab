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
// Suite: analyzeAudioBuffer — constant signal at 0.5
const data = new Float32Array(44100).fill(0.5);
const buf = makeMono(data);
it('reports peak amplitude of 0.5', () => {
  expect(analyzeAudioBuffer(buf).peakAmplitude).toBeCloseTo(0.5);
});
it('reports peak dB approximately -6 dB', () => {
  expect(analyzeAudioBuffer(buf).peakDb).toBeCloseTo(-6.02, 1);
});
it('reports RMS equal to peak for constant signal', () => {
  const result = analyzeAudioBuffer(buf);
  expect(result.rmsAmplitude).toBeCloseTo(0.5, 5);
  expect(result.rmsDb).toBeCloseTo(-6.02, 1);
});
it('reports crest factor near 0 for constant signal', () => {
  expect(analyzeAudioBuffer(buf).crestFactorDb).toBeCloseTo(0, 3);
});
it('reports DC offset near 0.5 for constant 0.5 signal', () => {
  expect(analyzeAudioBuffer(buf).dcOffset).toBeCloseTo(0.5, 5);
});
