import { beforeEach, it, expect, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createBpmWorker: vi.fn<() => Worker | null>(() => null) }));
vi.mock('./bpmWorkerFactory', () => ({ createBpmWorker: mocks.createBpmWorker }));
import { detectBpm } from './bpm';
// Suite: detectBpm
function makeAudioBuffer(durationS: number, sampleRate = 44100, channels = 1): AudioBuffer {
  const len = Math.round(durationS * sampleRate);
  const data = new Float32Array(len);
  // Synthesize a 120 BPM pulse (2 Hz beat) to give music-tempo detectable content
  const beatInterval = sampleRate / 2;
  for (let i = 0; i < len; i++) {
    if (i % beatInterval < sampleRate * 0.01) {
      data[i] = 0.8;
    }
  }
  return {
    duration: durationS,
    length: len,
    numberOfChannels: channels,
    sampleRate,
    getChannelData: () => data,
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as unknown as AudioBuffer;
}
beforeEach(() => mocks.createBpmWorker.mockReturnValue(null));

it.each([44100, 48000, 96000])(
  'detects 120 BPM accurately at %i Hz',
  async (sampleRate) => {
    const result = await detectBpm(makeAudioBuffer(15, sampleRate));
    expect(result?.bpm).toBeCloseTo(120, 0);
  },
  15_000,
);
it('returns null gracefully for a very short buffer (no throw)', async () => {
  const result = await detectBpm(makeAudioBuffer(0.1));
  expect(result === null || typeof result.bpm === 'number').toBe(true);
});
it('returns null or valid result for silent buffer (no throw)', async () => {
  const len = 44100 * 5;
  const silentBuffer = {
    duration: 5,
    length: len,
    numberOfChannels: 1,
    sampleRate: 44100,
    getChannelData: () => new Float32Array(len),
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as unknown as AudioBuffer;
  const result = await detectBpm(silentBuffer);
  expect(result).toBeNull();
});
it('handles stereo buffer without throwing', async () => {
  const result = await detectBpm(makeAudioBuffer(10, 44100, 2));
  expect(result === null || (typeof result.bpm === 'number' && result.bpm > 0)).toBe(true);
});

it('uses and terminates a worker when one is available', async () => {
  const worker = {
    onmessage: null,
    onerror: null,
    terminate: vi.fn(),
    postMessage: vi.fn(),
  } as unknown as Worker;
  worker.postMessage = vi.fn(() => {
    worker.onmessage?.({ data: { bpm: 120 } } as MessageEvent);
  });
  mocks.createBpmWorker.mockReturnValue(worker);

  await expect(detectBpm(makeAudioBuffer(1))).resolves.toMatchObject({ bpm: 120 });
  expect(worker.terminate).toHaveBeenCalledOnce();
});

it('terminates worker analysis when the operation is aborted', async () => {
  const worker = {
    onmessage: null,
    onerror: null,
    terminate: vi.fn(),
    postMessage: vi.fn(),
  } as unknown as Worker;
  mocks.createBpmWorker.mockReturnValue(worker);
  const controller = new AbortController();

  const pending = detectBpm(makeAudioBuffer(1), controller.signal);
  await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalledOnce());
  controller.abort();

  await expect(pending).resolves.toBeNull();
  expect(worker.terminate).toHaveBeenCalledOnce();
});
