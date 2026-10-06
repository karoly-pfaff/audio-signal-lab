import { it, expect } from 'vitest';
import { sampleStereoPoints } from './instrumentUtils';
function makeFakeAudioBuffer(
  channels: number,
  length: number,
  fill: number | ((c: number, i: number) => number) = 0,
): AudioBuffer {
  const channelData: Float32Array[] = [];
  for (let c = 0; c < channels; c++) {
    const arr = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      arr[i] = typeof fill === 'number' ? fill : fill(c, i);
    }
    channelData.push(arr);
  }
  return {
    numberOfChannels: channels,
    length,
    sampleRate: 44100,
    duration: length / 44100,
    getChannelData: (c: number) => channelData[c],
  } as unknown as AudioBuffer;
}
// Suite: sampleStereoPoints
it('returns empty array for mono buffer', () => {
  const buf = makeFakeAudioBuffer(1, 1000);
  expect(sampleStereoPoints(buf, 100).length).toBe(0);
});
it('returns at most maxPoints samples for stereo buffer', () => {
  const buf = makeFakeAudioBuffer(2, 10000);
  const pts = sampleStereoPoints(buf, 100);
  expect(pts.length).toBeLessThanOrEqual(100);
});
it('returns non-empty array for stereo buffer with maxPoints > 0', () => {
  const buf = makeFakeAudioBuffer(2, 1000);
  expect(sampleStereoPoints(buf, 50).length).toBeGreaterThan(0);
});
it('returns empty array when maxPoints is 0', () => {
  const buf = makeFakeAudioBuffer(2, 1000);
  expect(sampleStereoPoints(buf, 0).length).toBe(0);
});
it('x values come from channel 0 and y values from channel 1', () => {
  const buf = makeFakeAudioBuffer(2, 100, (c) => (c === 0 ? 0.25 : 0.75));
  const pts = sampleStereoPoints(buf, 10);
  for (const p of pts) {
    expect(p.x).toBeCloseTo(0.25, 5);
    expect(p.y).toBeCloseTo(0.75, 5);
  }
});
it('samples non-divisible buffers through their final sample', () => {
  const buf = makeFakeAudioBuffer(2, 3999, (channel, index) => {
    if (channel === 0 || index < 2000) {
      return 1;
    }
    return -1;
  });

  const pts = sampleStereoPoints(buf, 2000);

  expect(pts).toHaveLength(2000);
  expect(pts[pts.length - 1]).toEqual({ x: 1, y: -1 });
  expect(pts.some(({ x, y }) => x === -y)).toBe(true);
});
