import { beforeEach, expect, it, vi } from 'vitest';

const workerFactory = vi.hoisted(() =>
  vi.fn((_onResult: unknown, _onError?: () => void) => null as Worker | null),
);
vi.mock('./analysisWorkerFactory', () => ({ createAnalysisWorker: workerFactory }));

import type { AudioLabSet } from './audioLabStoreTypes';
import { LoadCoordinator } from './loadCoordinator';

function coordinator(): LoadCoordinator {
  return new LoadCoordinator(vi.fn() as unknown as AudioLabSet);
}

function testBuffer(): AudioBuffer {
  const samples = new Float32Array(2_048);
  return {
    duration: 1,
    length: samples.length,
    numberOfChannels: 1,
    sampleRate: samples.length,
    getChannelData: () => samples,
  } as unknown as AudioBuffer;
}

beforeEach(() => workerFactory.mockReset().mockReturnValue(null));

it('never reuses file generations across removal or reset', () => {
  const loads = coordinator();
  const stale = loads.nextFileGeneration('file-a');
  const staleSignal = loads.fileSignal('file-a');

  loads.reset();
  const current = loads.nextFileGeneration('file-a');

  expect(current).not.toBe(stale);
  expect(loads.isFileCurrent('file-a', stale)).toBe(false);
  expect(loads.isFileCurrent('file-a', current)).toBe(true);
  expect(staleSignal?.aborted).toBe(true);
});

it('aborts superseded main and file analysis signals', () => {
  const loads = coordinator();
  loads.nextMainGeneration();
  const mainSignal = loads.mainSignal();
  loads.nextMainGeneration();
  loads.nextFileGeneration('file-a');
  const fileSignal = loads.fileSignal('file-a');
  loads.removeFile('file-a');

  expect(mainSignal.aborted).toBe(true);
  expect(fileSignal?.aborted).toBe(true);
});

it('keeps automatic sidebar activation bound to the latest main intent', () => {
  const loads = coordinator();
  const sidebarIntent = loads.mainIntentSnapshot('file-a');

  expect(loads.mainIntentBelongsTo('file-a', sidebarIntent)).toBe(true);
  loads.nextMainGeneration();
  expect(loads.mainIntentBelongsTo('file-a', sidebarIntent)).toBe(false);
  loads.nextMainGeneration('file-a');
  expect(loads.mainIntentBelongsTo('file-a', sidebarIntent)).toBe(true);
});

it('restores the rollback owner only for the current main generation', () => {
  const loads = coordinator();
  const failed = loads.nextMainGeneration();
  const replacementIntent = loads.mainIntentSnapshot(null);
  loads.restoreMainIntent(failed, 'file-a');
  expect(loads.mainIntentBelongsTo('file-a', replacementIntent)).toBe(true);

  loads.nextMainGeneration();
  loads.restoreMainIntent(failed, 'file-a');
  expect(loads.mainIntentBelongsTo('file-a', replacementIntent)).toBe(false);
});

it('falls back to synchronous analysis after a worker runtime error', () => {
  const worker = { postMessage: vi.fn(), terminate: vi.fn() } as unknown as Worker;
  workerFactory.mockReturnValue(worker);
  const set = vi.fn();
  const loads = new LoadCoordinator(set as unknown as AudioLabSet);
  const generation = loads.nextMainGeneration();

  loads.analyzeMainBuffer(testBuffer(), generation);
  const onError = workerFactory.mock.calls[0]![1] as () => void;
  onError();

  expect(worker.terminate).toHaveBeenCalledOnce();
  expect(set).toHaveBeenCalledOnce();
});

it('falls back to synchronous analysis when posting to the worker fails', () => {
  const worker = {
    postMessage: vi.fn(() => {
      throw new Error('worker is unavailable');
    }),
    terminate: vi.fn(),
  } as unknown as Worker;
  workerFactory.mockReturnValue(worker);
  const set = vi.fn();
  const loads = new LoadCoordinator(set as unknown as AudioLabSet);
  const generation = loads.nextMainGeneration();

  loads.analyzeMainBuffer(testBuffer(), generation);

  expect(worker.terminate).toHaveBeenCalledOnce();
  expect(set).toHaveBeenCalledOnce();
});

it('does not apply synchronous analysis from a stale generation', () => {
  const set = vi.fn();
  const loads = new LoadCoordinator(set as unknown as AudioLabSet);
  const staleGeneration = loads.nextMainGeneration();
  loads.nextMainGeneration();

  loads.analyzeMainBuffer(testBuffer(), staleGeneration);

  expect(set).not.toHaveBeenCalled();
});

it('keeps current recovery data when a stale worker result arrives', () => {
  const worker = { postMessage: vi.fn(), terminate: vi.fn() } as unknown as Worker;
  workerFactory.mockReturnValue(worker);
  const set = vi.fn();
  const loads = new LoadCoordinator(set as unknown as AudioLabSet);
  const stale = loads.nextMainGeneration();
  loads.analyzeMainBuffer(testBuffer(), stale);
  const current = loads.nextMainGeneration();
  loads.analyzeMainBuffer(testBuffer(), current);
  const onResult = workerFactory.mock.calls[0]![0] as (result: {
    id: number;
    summary: never;
  }) => void;
  onResult({ id: stale, summary: {} as never });

  const onError = workerFactory.mock.calls[0]![1] as () => void;
  onError();

  expect(set).toHaveBeenCalledOnce();
});
