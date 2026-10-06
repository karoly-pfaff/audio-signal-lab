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
// Suite: analyzeAudioBuffer — silent regions
it('reports 0 regions and 0 longest for a constant non-silent signal', () => {
  const buf = makeMono(new Float32Array(1000).fill(0.5), 1000);
  const result = analyzeAudioBuffer(buf);
  expect(result.silentRegionCount).toBe(0);
  expect(result.longestSilentRegionSeconds).toBe(0);
});
it('reports 1 region spanning the whole file for a fully silent buffer', () => {
  const buf = makeMono(new Float32Array(1000), 1000);
  const result = analyzeAudioBuffer(buf);
  expect(result.silentRegionCount).toBe(1);
  expect(result.longestSilentRegionSeconds).toBeCloseTo(1.0, 5);
});
it('detects one silent region in the middle of a signal', () => {
  // Windows: 2 non-silent (0-99) | 4 silent (100-299) | 2 non-silent (300-399)
  const data = new Float32Array(400);
  data.fill(0.5, 0, 100);
  data.fill(0.5, 300, 400);
  const result = analyzeAudioBuffer(makeMono(data, 1000));
  expect(result.silentRegionCount).toBe(1);
  expect(result.longestSilentRegionSeconds).toBeCloseTo(0.2, 5); // 4 windows × 50 / 1000
});
it('counts multiple silent regions', () => {
  // Windows: 2 non-silent | 2 silent | 2 non-silent | 2 silent | 2 non-silent
  const data = new Float32Array(500);
  data.fill(0.5, 0, 100);
  data.fill(0.5, 200, 300);
  data.fill(0.5, 400, 500);
  const result = analyzeAudioBuffer(makeMono(data, 1000));
  expect(result.silentRegionCount).toBe(2);
});
it('reports the longest silent region correctly when regions differ in length', () => {
  // windows: 1 non-silent | 2 silent (region 1) | 1 non-silent | 3 silent (region 2, longest) | 1 non-silent
  const data = new Float32Array(400);
  data.fill(0.5, 0, 50);
  data.fill(0.5, 150, 200);
  data.fill(0.5, 350, 400);
  const result = analyzeAudioBuffer(makeMono(data, 1000));
  expect(result.silentRegionCount).toBe(2);
  expect(result.longestSilentRegionSeconds).toBeCloseTo(0.15, 5); // 3 windows × 50 / 1000
});
