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
// Suite: analyzeAudioBuffer — duration and sample rate
it('reports correct duration', () => {
  const buf = makeMono(new Float32Array(88200), 44100); // 2s
  expect(analyzeAudioBuffer(buf).durationSeconds).toBeCloseTo(2);
});
it('reports correct sample rate', () => {
  const buf = makeMono(new Float32Array(48000), 48000);
  expect(analyzeAudioBuffer(buf).sampleRate).toBe(48000);
});
