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
// Suite: analyzeAudioBuffer — silentRegions list
it('produces no silent regions for a fully non-silent buffer', () => {
  const buf = makeMono(new Float32Array(500).fill(0.5), 1000);
  expect(analyzeAudioBuffer(buf).silentRegions).toHaveLength(0);
});
it('produces one silent region spanning the full buffer for a silent buffer', () => {
  const buf = makeMono(new Float32Array(500), 1000); // 10 windows × 50 = 0.5 s
  const { silentRegions } = analyzeAudioBuffer(buf);
  expect(silentRegions).toHaveLength(1);
  expect(silentRegions[0].startSeconds).toBeCloseTo(0, 5);
  expect(silentRegions[0].endSeconds).toBeCloseTo(0.5, 5);
});
it('produces two regions with correct times for two separate silent sections', () => {
  // Windows: 2 non-silent | 2 silent | 2 non-silent | 2 silent | 2 non-silent
  const data = new Float32Array(500);
  data.fill(0.5, 0, 100);
  data.fill(0.5, 200, 300);
  data.fill(0.5, 400, 500);
  const { silentRegions } = analyzeAudioBuffer(makeMono(data, 1000));
  expect(silentRegions).toHaveLength(2);
  expect(silentRegions[0].startSeconds).toBeCloseTo(0.1, 5);
  expect(silentRegions[0].endSeconds).toBeCloseTo(0.2, 5);
  expect(silentRegions[1].startSeconds).toBeCloseTo(0.3, 5);
  expect(silentRegions[1].endSeconds).toBeCloseTo(0.4, 5);
});
it('silentRegions length matches silentRegionCount', () => {
  const data = new Float32Array(500);
  data.fill(0.5, 0, 100);
  data.fill(0.5, 200, 300);
  data.fill(0.5, 400, 500);
  const result = analyzeAudioBuffer(makeMono(data, 1000));
  expect(result.silentRegions).toHaveLength(result.silentRegionCount);
});
