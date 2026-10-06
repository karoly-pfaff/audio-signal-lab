import { it, expect } from 'vitest';
import { buildFileIdentity } from './fileIdentity';
function makeAudioBuffer(channels: Float32Array[], sampleRate = 44100): AudioBuffer {
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
// Suite: buildFileIdentity
it('captures file metadata and buffer properties', () => {
  const data = new Float32Array([0.1, -0.2, 0.3, -0.4, 0.5]);
  const buffer = makeAudioBuffer([data], 48000);
  const file = { name: 'song.flac', size: 5000000, lastModified: 1700000000000 } as File;
  const id = buildFileIdentity(file, buffer);
  expect(id.name).toBe('song.flac');
  expect(id.size).toBe(5000000);
  expect(id.lastModified).toBe(1700000000000);
  expect(id.sampleRate).toBe(48000);
  expect(id.channelCount).toBe(1);
  expect(id.durationSeconds).toBeCloseTo(data.length / 48000);
  expect(id.quickHash).toMatch(/^[0-9a-f]{8}$/);
});
it('produces consistent hash for the same buffer', () => {
  const data = new Float32Array([0.1, -0.2, 0.3]);
  const buffer = makeAudioBuffer([data]);
  const file = { name: 'x.wav', size: 100, lastModified: 0 } as File;
  const a = buildFileIdentity(file, buffer);
  const b = buildFileIdentity(file, buffer);
  expect(a.quickHash).toBe(b.quickHash);
});
