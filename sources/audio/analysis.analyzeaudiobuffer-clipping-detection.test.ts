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
function makeStereo(left: Float32Array, right: Float32Array, sampleRate = 44100): AudioBuffer {
  return makeBuffer([left, right], sampleRate);
}
// Suite: analyzeAudioBuffer — clipping detection
it('reports 0 clipped samples and none risk for a silent buffer', () => {
  const buf = makeMono(new Float32Array(1000));
  const result = analyzeAudioBuffer(buf);
  expect(result.clippedSampleCount).toBe(0);
  expect(result.clippedSampleRatio).toBe(0);
  expect(result.clippingRisk).toBe('none');
});
it('reports all samples clipped and high risk for a constant full-scale signal', () => {
  const data = new Float32Array(100).fill(1.0);
  const result = analyzeAudioBuffer(makeMono(data));
  expect(result.clippedSampleCount).toBe(100);
  expect(result.clippedSampleRatio).toBe(1);
  expect(result.clippingRisk).toBe('high');
});
it('reports no clipping for a 0.5 amplitude signal', () => {
  const data = new Float32Array(100).fill(0.5);
  const result = analyzeAudioBuffer(makeMono(data));
  expect(result.clippedSampleCount).toBe(0);
  expect(result.clippingRisk).toBe('none');
});
it('counts a single clipped sample at exactly the threshold', () => {
  const data = new Float32Array(100);
  data[50] = 0.999; // at threshold — should be counted
  const result = analyzeAudioBuffer(makeMono(data));
  expect(result.clippedSampleCount).toBe(1);
});
it('counts clipped samples across all channels for stereo', () => {
  const left = new Float32Array(100);
  left[10] = 1.0; // clipped positive
  const right = new Float32Array(100);
  right[20] = -1.0; // clipped negative
  right[30] = 0.999; // at threshold
  const result = analyzeAudioBuffer(makeStereo(left, right));
  expect(result.clippedSampleCount).toBe(3);
});
