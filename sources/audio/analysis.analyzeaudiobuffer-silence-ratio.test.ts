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
// Suite: analyzeAudioBuffer — silence ratio
it('reports silence ratio 1.0 for a fully silent buffer', () => {
  const buf = makeMono(new Float32Array(1000));
  expect(analyzeAudioBuffer(buf).silentSampleRatio).toBe(1);
});
it('reports silence ratio 0 for a constant 0.5 signal', () => {
  const buf = makeMono(new Float32Array(1000).fill(0.5));
  expect(analyzeAudioBuffer(buf).silentSampleRatio).toBe(0);
});
it('reports silence ratio 0.5 for a half-silent buffer', () => {
  const data = new Float32Array(1000);
  data.fill(0.5, 0, 500); // first 500 samples non-silent; second 500 remain 0
  const result = analyzeAudioBuffer(makeMono(data));
  expect(result.silentSampleRatio).toBeCloseTo(0.5, 5);
});
