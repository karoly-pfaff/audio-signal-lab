import { beforeEach, expect, it, vi } from 'vitest';
import type { AudioLoadResources } from '../audio/audioLoadResources';
import type { BpmResult } from '../audio/bpm';
import type { FileState } from '../audio/types';
import type { AudioLabState } from './audioLabStoreTypes';
import { createEmptyMainTrack } from './storeState';
import type { StoreContext } from './storeContext';
const mocks = vi.hoisted(() => ({
  loadResources: vi.fn<(file: File) => Promise<AudioLoadResources>>(),
  detectBpm: vi.fn<() => Promise<BpmResult | null>>(),
  setMainBuffer: vi.fn(),
  setMainVolume: vi.fn(),
  setMainLoop: vi.fn(),
  setMainLoopPoints: vi.fn(),
  releaseArtwork: vi.fn(),
}));

vi.mock('../audio/AudioEngine', () => ({
  audioEngine: {
    stop: vi.fn(),
    setMainBuffer: mocks.setMainBuffer,
    setMainVolume: mocks.setMainVolume,
    setMainLoop: mocks.setMainLoop,
    setMainLoopPoints: mocks.setMainLoopPoints,
    setMasterVolume: vi.fn(),
    setMasterMute: vi.fn(),
    setFileVolume: vi.fn(),
    removeFileBuffer: vi.fn(),
  },
}));
vi.mock('../audio/audioLoadResources', () => ({ loadAudioResources: mocks.loadResources }));
vi.mock('../audio/bpm', () => ({ detectBpm: mocks.detectBpm }));
vi.mock('../utils/fileIdentity', () => ({
  buildFileIdentity: vi.fn(() => ({ name: 'new.wav' })),
  compareFileIdentity: vi.fn(() => 'likely'),
  formatIdentityWarning: vi.fn(() => null),
}));
vi.mock('./artworkLifecycle', () => ({ releaseArtworkIfUnreferenced: mocks.releaseArtwork }));
vi.mock('./mediaStorage', () => ({ storeAudioFile: vi.fn(async () => null) }));
vi.mock('./mediaRetention', () => ({ pruneUnusedMedia: vi.fn() }));

import { createLoadMainTrack } from './mainTrackLoading';

const oldBuffer = { duration: 4 } as AudioBuffer;
const newBuffer = { duration: 8 } as AudioBuffer;

function stableSidebarFile(): FileState {
  return {
    id: 'file-a',
    order: 0,
    name: 'old.wav',
    buffer: oldBuffer,
    volume: 1,
    loop: false,
    thumbnailUrl: null,
    loadingState: 'loaded',
    metadata: null,
  };
}

function harness(files: FileState[] = [stableSidebarFile()]) {
  let generation = 0;
  let state = {
    activeFileId: 'file-a',
    mainTrack: {
      ...createEmptyMainTrack({ volume: 0.8, loop: false }),
      name: 'old.wav',
      buffer: oldBuffer,
      loadingState: 'loaded' as const,
    },
    files,
    transport: { playing: false, masterVolume: 0.8, masterMuted: false },
    snapshots: [],
    ab: { a: null, b: null },
  } as unknown as AudioLabState;
  const loads = {
    nextMainGeneration: vi.fn(() => ++generation),
    isMainCurrent: vi.fn((candidate: number) => candidate === generation),
    analyzeMainBuffer: vi.fn(),
    restoreMainIntent: vi.fn(),
    removeFile: vi.fn(),
  };
  const context = {
    get: () => state,
    set: (patch: Partial<AudioLabState> | ((value: AudioLabState) => Partial<AudioLabState>)) => {
      state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
    },
    loads,
    status: { show: vi.fn() },
  } as unknown as StoreContext;
  return { load: createLoadMainTrack(context), state: () => state, loads };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.detectBpm.mockResolvedValue(null);
});

it('commits a replacement with current loop intent and stopped transport', async () => {
  let finish!: (loaded: AudioLoadResources) => void;
  mocks.loadResources.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
  const test = harness();
  const pending = test.load(new File(['new'], 'new.wav'));
  test.state().mainTrack.loop = true;
  test.state().transport.playing = true;
  finish({
    buffer: newBuffer,
    metadata: { title: null, artist: null, album: null, artworkUrl: null },
  });
  await pending;
  expect(mocks.setMainLoop).toHaveBeenLastCalledWith(true);
  expect(test.state()).toMatchObject({
    transport: { playing: false },
    mainTrack: { buffer: newBuffer, loop: true },
  });
});

it('restarts cancelled analysis when a replacement fails', async () => {
  mocks.loadResources.mockRejectedValueOnce(new Error('decode'));
  const test = harness();
  test.state().mainTrack.analysis = null;
  test.state().mainTrack.bpmAnalyzing = true;
  await test.load(new File(['bad'], 'bad.wav'));
  expect(test.state().mainTrack).toMatchObject({ buffer: oldBuffer, loadingState: 'loaded' });
  expect(test.loads.analyzeMainBuffer).toHaveBeenCalledWith(oldBuffer, 1);
  expect(mocks.detectBpm).toHaveBeenCalled();
});

it('restores the stable track when a superseding replacement fails', async () => {
  let finishFirst!: (loaded: AudioLoadResources) => void;
  mocks.loadResources
    .mockReturnValueOnce(new Promise((resolve) => (finishFirst = resolve)))
    .mockRejectedValueOnce(new Error('decode'));
  const test = harness();
  const first = test.load(new File(['first'], 'first.wav'));
  await test.load(new File(['second'], 'second.wav'));
  expect(test.state()).toMatchObject({
    activeFileId: 'file-a',
    mainTrack: { buffer: oldBuffer, loadingState: 'loaded' },
  });
  finishFirst({
    buffer: newBuffer,
    metadata: { title: null, artist: null, album: null, artworkUrl: null },
  });
  await first;
  expect(test.state().mainTrack).toMatchObject({ buffer: oldBuffer, loadingState: 'loaded' });
});

it('preserves user edits made while a replacement is pending', async () => {
  let fail!: (reason: Error) => void;
  mocks.loadResources.mockReturnValueOnce(new Promise((_resolve, reject) => (fail = reject)));
  const test = harness();
  const pending = test.load(new File(['new'], 'new.wav'));
  const marker = { id: 'new', type: 'point' as const, startSeconds: 1, label: '', createdAt: 1 };
  test.state().mainTrack.volume = 0.25;
  test.state().mainTrack.selection = { startSeconds: 1, endSeconds: 2 };
  test.state().mainTrack.markers = [marker];
  fail(new Error('decode'));
  await pending;
  expect(test.state().mainTrack).toMatchObject({
    buffer: oldBuffer,
    loadingState: 'loaded',
    volume: 0.25,
    selection: { startSeconds: 1, endSeconds: 2 },
    markers: [marker],
  });
  expect(mocks.setMainVolume).toHaveBeenLastCalledWith(0.25);
});

it('restores remembered annotations after a failed decode and successful retry', async () => {
  const test = harness();
  const marker = { id: 'saved', type: 'point' as const, startSeconds: 1, label: '', createdAt: 1 };
  Object.assign(test.state().mainTrack, {
    name: 'saved.wav',
    buffer: null,
    loadingState: 'remembered',
    markers: [marker],
  });
  mocks.loadResources.mockRejectedValueOnce(new Error('decode')).mockResolvedValueOnce({
    buffer: newBuffer,
    metadata: { title: null, artist: null, album: null, artworkUrl: null },
  });
  await test.load(new File(['bad'], 'saved.wav'));
  expect(test.state().mainTrack).toMatchObject({ loadingState: 'failed', markers: [marker] });
  await test.load(new File(['good'], 'saved.wav'));

  expect(test.state().mainTrack).toMatchObject({
    buffer: newBuffer,
    loadingState: 'loaded',
    markers: [marker],
  });
});

it('preserves remembered annotations across overlapping reloads', async () => {
  let finishFirst!: (loaded: AudioLoadResources) => void;
  let finishSecond!: (loaded: AudioLoadResources) => void;
  mocks.loadResources
    .mockReturnValueOnce(new Promise((resolve) => (finishFirst = resolve)))
    .mockReturnValueOnce(new Promise((resolve) => (finishSecond = resolve)));
  const test = harness();
  const marker = { id: 'saved', type: 'point' as const, startSeconds: 1, label: '', createdAt: 1 };
  Object.assign(test.state().mainTrack, {
    name: 'saved.wav',
    buffer: null,
    loadingState: 'remembered',
    selection: { startSeconds: 2, endSeconds: 4 },
    markers: [marker],
  });

  const first = test.load(new File(['same'], 'saved.wav'));
  const second = test.load(new File(['same'], 'saved.wav'));
  const metadata = { title: null, artist: null, album: null, artworkUrl: null };
  finishSecond({ buffer: newBuffer, metadata });
  await second;
  finishFirst({ buffer: newBuffer, metadata });
  await first;

  expect(test.state().mainTrack).toMatchObject({
    buffer: newBuffer,
    selection: { startSeconds: 2, endSeconds: 4 },
    markers: [marker],
  });
});
it('commits newer annotations applied during a remembered reload', async () => {
  let finish!: (loaded: AudioLoadResources) => void;
  mocks.loadResources.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
  const test = harness([]);
  Object.assign(test.state().mainTrack, {
    name: 'saved.wav',
    buffer: null,
    loadingState: 'remembered',
    selection: { startSeconds: 0.2, endSeconds: 1.5 },
    markers: [{ id: 'a', type: 'point', startSeconds: 0.5, label: 'A', createdAt: 1 }],
  });
  const pending = test.load(new File(['same'], 'saved.wav'));
  const marker = { id: 'b', type: 'point' as const, startSeconds: 0.8, label: 'B', createdAt: 2 };
  Object.assign(test.state().mainTrack, {
    selection: { startSeconds: 0.5, endSeconds: 1 },
    markers: [marker],
  });
  finish({
    buffer: newBuffer,
    metadata: { title: null, artist: null, album: null, artworkUrl: null },
  });
  await pending;
  expect(test.state().mainTrack).toMatchObject({
    selection: { startSeconds: 0.5, endSeconds: 1 },
    markers: [marker],
  });
});
