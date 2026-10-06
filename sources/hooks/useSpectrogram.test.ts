import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createSpectrogramWorker } from './spectrogramWorkerFactory';
import { useSpectrogram } from './useSpectrogram';

vi.mock('./spectrogramWorkerFactory', () => ({ createSpectrogramWorker: vi.fn() }));

const mockCreateWorker = vi.mocked(createSpectrogramWorker);

const BUFFER = {
  length: 4,
  numberOfChannels: 1,
  getChannelData: vi.fn(() => new Float32Array([0, 0.5, -0.5, 0])),
} as unknown as AudioBuffer;

class FakeImageData {
  constructor(
    readonly data: Uint8ClampedArray,
    readonly width: number,
    readonly height: number,
  ) {}
}

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();

  constructor() {
    FakeWorker.instances.push(this);
  }
}

beforeEach(() => {
  FakeWorker.instances = [];
  mockCreateWorker.mockReset();
  vi.stubGlobal('ImageData', FakeImageData);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    putImageData: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('computes synchronously when workers are unavailable', async () => {
  mockCreateWorker.mockReturnValue(null);
  const onData = vi.fn();
  const { result, rerender } = renderHook(
    ({ buffer }: { buffer: AudioBuffer | null }) => useSpectrogram(buffer, 3, 2, onData),
    { initialProps: { buffer: BUFFER as AudioBuffer | null } },
  );
  await waitFor(() => expect(result.current.state).toBe('ready'));
  expect(result.current.background.current).toBeInstanceOf(HTMLCanvasElement);
  const data = onData.mock.calls[0]![0];
  expect(data).toMatchObject({ numFrames: 2, binsPerFrame: 256 });
  expect(data.flat).toHaveLength(512);
  rerender({ buffer: null });
  expect(result.current.state).toBe('idle');
  expect(result.current.background.current).toBeNull();
});

it('accepts only the latest worker response and terminates it', async () => {
  const worker = new FakeWorker();
  mockCreateWorker.mockReturnValue(worker as unknown as Worker);
  const onData = vi.fn();
  const { result, rerender, unmount } = renderHook(
    ({ buffer }: { buffer: AudioBuffer }) => useSpectrogram(buffer, 2, 2, onData),
    { initialProps: { buffer: BUFFER } },
  );
  expect(worker.postMessage).toHaveBeenCalledOnce();
  expect(result.current.state).toBe('computing');
  rerender({ buffer: { ...BUFFER } as AudioBuffer });
  act(() => worker.onmessage?.(workerEvent(1)));
  expect(onData).not.toHaveBeenCalled();
  act(() => worker.onmessage?.(workerEvent(2)));
  await waitFor(() => expect(result.current.state).toBe('ready'));
  expect(onData).toHaveBeenCalledWith({
    flat: new Float32Array([0.5]),
    numFrames: 1,
    binsPerFrame: 1,
    centroidBin: 2,
  });
  unmount();
  expect(worker.terminate).toHaveBeenCalledOnce();
});

it('falls back to synchronous computation after a worker runtime error', async () => {
  const worker = new FakeWorker();
  mockCreateWorker.mockReturnValue(worker as unknown as Worker);
  const onData = vi.fn();
  const { result } = renderHook(() => useSpectrogram(BUFFER, 2, 2, onData));

  act(() => worker.onerror?.(new Event('error')));

  await waitFor(() => expect(result.current.state).toBe('ready'));
  expect(worker.terminate).toHaveBeenCalledOnce();
  expect(onData).toHaveBeenCalledOnce();
});

function workerEvent(id: number): MessageEvent {
  return {
    data: {
      id,
      pixels: new Uint8ClampedArray(16),
      width: 2,
      height: 2,
      frames: new Float32Array([0.5]),
      numFrames: 1,
      binsPerFrame: 1,
      centroidBin: 2,
    },
  } as MessageEvent;
}
