import { beforeEach, expect, it, vi } from 'vitest';
import type { BpmResult } from '../audio/bpm';
import type { AudioLabState } from './audioLabStoreTypes';
import { createFileActions } from './fileActions';
import type { StoreContext } from './storeContext';
import { createEmptyFile, createEmptyMainTrack } from './storeState';

const mocks = vi.hoisted(() => ({
  detectBpm: vi.fn<() => Promise<BpmResult | null>>(),
  loadResources: vi.fn(),
  storeAudio: vi.fn(async () => null),
  buffer: {
    duration: 1,
    length: 4,
    numberOfChannels: 1,
    sampleRate: 8_000,
    getChannelData: () => new Float32Array(4),
  } as unknown as AudioBuffer,
}));
vi.mock('../audio/AudioEngine', () => ({
  audioEngine: {
    stop: vi.fn(),
    clearMainBuffer: vi.fn(),
    setMainLoop: vi.fn(),
    setMainLoopPoints: vi.fn(),
    removeFileBuffer: vi.fn(),
    setFileVolume: vi.fn(),
    setMainVolume: vi.fn(),
  },
}));
vi.mock('../audio/audioLoadResources', () => ({
  loadAudioResources: mocks.loadResources,
}));
vi.mock('../audio/bpm', () => ({ detectBpm: mocks.detectBpm }));
vi.mock('./mediaStorage', () => ({ storeAudioFile: mocks.storeAudio }));
vi.mock('./mediaRetention', () => ({ pruneUnusedMedia: vi.fn() }));

function harness() {
  const fileId = 'file-1';
  let generation = 0;
  let state = {
    activeFileId: fileId,
    files: [createEmptyFile(0, fileId)],
    mainTrack: createEmptyMainTrack({ volume: 0.8, loop: false }),
    transport: { playing: false, masterVolume: 0.8, masterMuted: false },
  } as AudioLabState;
  state.activateFile = vi.fn(() => {
    const active = state.files[0]!;
    state = {
      ...state,
      mainTrack: {
        ...state.mainTrack,
        name: active.name,
        buffer: active.buffer,
        loadingState: 'loaded',
      },
    };
  });
  const context = {
    get: () => state,
    set: (patch: (current: AudioLabState) => Partial<AudioLabState>) => {
      state = { ...state, ...patch(state) };
    },
    status: { show: vi.fn() },
    loads: {
      nextFileGeneration: vi.fn(() => ++generation),
      isFileCurrent: vi.fn((_fileId: string, candidate: number) => candidate === generation),
      fileSignal: vi.fn(() => undefined),
      mainIntentSnapshot: vi.fn(() => ({ generation: 0, fileId })),
      mainIntentBelongsTo: vi.fn(() => true),
    },
  } as unknown as StoreContext;
  return { actions: createFileActions(context), state: () => state, fileId };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.loadResources.mockResolvedValue({
    buffer: mocks.buffer,
    metadata: { title: null, artist: null, album: null, artworkUrl: null },
  });
  mocks.detectBpm.mockResolvedValue(null);
});

it('propagates a late BPM result to the currently active main track', async () => {
  let finishBpm: (result: BpmResult) => void = () => {};
  mocks.detectBpm.mockReturnValueOnce(new Promise((resolve) => (finishBpm = resolve)));
  const test = harness();

  await test.actions.loadFile(test.fileId, new File(['data'], 'active.wav'));
  finishBpm({ bpm: 120, confidence: 'high' });
  await Promise.resolve();

  expect(test.state().files[0]).toMatchObject({ bpm: 120, bpmAnalyzing: false });
  expect(test.state().mainTrack).toMatchObject({ bpm: 120, bpmAnalyzing: false });
});

it('restores and resumes BPM work for a sidebar replacement that fails', async () => {
  const test = harness();
  Object.assign(test.state().files[0]!, {
    name: 'old.wav',
    buffer: mocks.buffer,
    loadingState: 'loaded',
    bpmAnalyzing: true,
  });
  mocks.loadResources.mockRejectedValueOnce(new Error('decode'));

  await test.actions.loadFile(test.fileId, new File(['bad'], 'bad.wav'));

  expect(test.state().files[0]).toMatchObject({
    name: 'old.wav',
    buffer: mocks.buffer,
    loadingState: 'loaded',
  });
  expect(mocks.detectBpm).toHaveBeenCalled();
});

it('restores a loaded sidebar row after a superseding replacement fails', async () => {
  const test = harness();
  Object.assign(test.state().files[0]!, {
    name: 'old.wav',
    buffer: mocks.buffer,
    loadingState: 'loaded',
  });
  let finishFirst!: (value: {
    buffer: AudioBuffer;
    metadata: { title: null; artist: null; album: null; artworkUrl: null };
  }) => void;
  mocks.loadResources
    .mockReturnValueOnce(new Promise((resolve) => (finishFirst = resolve)))
    .mockRejectedValueOnce(new Error('decode'));

  const first = test.actions.loadFile(test.fileId, new File(['first'], 'first.wav'));
  await test.actions.loadFile(test.fileId, new File(['second'], 'second.wav'));
  expect(test.state().files[0]).toMatchObject({
    name: 'old.wav',
    buffer: mocks.buffer,
    loadingState: 'loaded',
  });
  finishFirst({
    buffer: mocks.buffer,
    metadata: { title: null, artist: null, album: null, artworkUrl: null },
  });
  await first;
  expect(test.state().files[0]!.loadingState).toBe('loaded');
});

it('preserves sidebar volume and order changes while a replacement is pending', async () => {
  const test = harness();
  Object.assign(test.state().files[0]!, {
    name: 'old.wav',
    buffer: mocks.buffer,
    loadingState: 'loaded',
  });
  test.state().files.push(createEmptyFile(1, 'file-2'));
  let fail!: (reason: Error) => void;
  mocks.loadResources.mockReturnValueOnce(new Promise((_resolve, reject) => (fail = reject)));

  const pending = test.actions.loadFile(test.fileId, new File(['new'], 'new.wav'));
  test.actions.setFileVolume(test.fileId, 0.25);
  test.actions.reorderFile(test.fileId, 1);
  fail(new Error('decode'));
  await pending;

  expect(test.state().files.map(({ id, order }) => [id, order])).toEqual([
    ['file-2', 0],
    ['file-1', 1],
  ]);
  expect(test.state().files[1]).toMatchObject({
    id: 'file-1',
    volume: 0.25,
    loadingState: 'loaded',
  });
});
