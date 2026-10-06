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
// Suite: analyzeAudioBuffer — clippingRegions list
it('produces no clipping regions for a silent buffer', () => {
  const buf = makeMono(new Float32Array(200), 1000);
  expect(analyzeAudioBuffer(buf).clippingRegions).toHaveLength(0);
});
it('produces one clipping region for a single clipped sample', () => {
  const data = new Float32Array(200);
  data[55] = 1.0; // window 5 (samples 50–59)
  const { clippingRegions } = analyzeAudioBuffer(makeMono(data, 1000));
  expect(clippingRegions).toHaveLength(1);
  expect(clippingRegions[0].startSeconds).toBeCloseTo(0.05, 5);
  expect(clippingRegions[0].endSeconds).toBeCloseTo(0.06, 5);
});
it('merges adjacent clipped windows into one region', () => {
  const data = new Float32Array(200);
  data[55] = 1.0; // window 5
  data[65] = 1.0; // window 6 (adjacent)
  const { clippingRegions } = analyzeAudioBuffer(makeMono(data, 1000));
  expect(clippingRegions).toHaveLength(1);
  expect(clippingRegions[0].startSeconds).toBeCloseTo(0.05, 5);
  expect(clippingRegions[0].endSeconds).toBeCloseTo(0.07, 5);
});
it('keeps separate regions for distant clipped windows', () => {
  const data = new Float32Array(200);
  data[25] = 1.0; // window 2 (samples 20–29)
  data[155] = 1.0; // window 15 (samples 150–159)
  const { clippingRegions } = analyzeAudioBuffer(makeMono(data, 1000));
  expect(clippingRegions).toHaveLength(2);
  expect(clippingRegions[0].startSeconds).toBeCloseTo(0.02, 5);
  expect(clippingRegions[0].endSeconds).toBeCloseTo(0.03, 5);
  expect(clippingRegions[1].startSeconds).toBeCloseTo(0.15, 5);
  expect(clippingRegions[1].endSeconds).toBeCloseTo(0.16, 5);
});
it('detects clipping on a non-primary channel in stereo', () => {
  const left = new Float32Array(200);
  const right = new Float32Array(200);
  right[55] = 1.0; // only right channel, window 5
  const { clippingRegions } = analyzeAudioBuffer(makeStereo(left, right, 1000));
  expect(clippingRegions).toHaveLength(1);
});
it('reports exact partial-window silence for a very short buffer', () => {
  const buf = makeMono(new Float32Array(3), 1000); // shorter than one 10-sample window
  const { silentRegions, clippingRegions } = analyzeAudioBuffer(buf);
  expect(silentRegions).toEqual([{ startSeconds: 0, endSeconds: 0.003 }]);
  expect(clippingRegions).toHaveLength(0);
});
