import { beforeEach, expect, it, vi } from 'vitest';
import type { AudioLoadResources } from '../audio/audioLoadResources';
import type { FileState } from '../audio/types';
import type { AudioLabSet, AudioLabState } from './audioLabStoreTypes';
import { createFileActions } from './fileActions';
import { LoadCoordinator } from './loadCoordinator';
import { createMainTrackActions } from './mainTrackActions';
import type { StoreContext } from './storeContext';
import { createEmptyFile, createEmptyMainTrack } from './storeState';

const mocks = vi.hoisted(() => ({
  loadResources: vi.fn<(file: File) => Promise<AudioLoadResources>>(),
  detectBpm: vi.fn(async () => null),
  setMainBuffer: vi.fn(),
}));

vi.mock('../audio/AudioEngine', () => ({
  audioEngine: {
    decodeFile: vi.fn(),
    stop: vi.fn(),
    clearMainBuffer: vi.fn(),
    setMainBuffer: mocks.setMainBuffer,
    setMainVolume: vi.fn(),
    setMainLoop: vi.fn(),
    setMainLoopPoints: vi.fn(),
    removeFileBuffer: vi.fn(),
    setFileVolume: vi.fn(),
  },
}));
vi.mock('../audio/audioLoadResources', () => ({ loadAudioResources: mocks.loadResources }));
vi.mock('../audio/bpm', () => ({ detectBpm: mocks.detectBpm }));
vi.mock('./analysisWorkerFactory', () => ({
  createAnalysisWorker: vi.fn(() => ({ postMessage: vi.fn(), terminate: vi.fn() })),
}));
vi.mock('./mediaRetention', () => ({ pruneUnusedMedia: vi.fn() }));
vi.mock('./mediaStorage', () => ({ storeAudioFile: vi.fn(async () => null) }));

function audioBuffer(duration: number): AudioBuffer {
  const channel = new Float32Array(16);
  return {
    duration,
    length: channel.length,
    numberOfChannels: 1,
    sampleRate: 8_000,
    getChannelData: () => channel,
  } as unknown as AudioBuffer;
}

function loaded(file: File, buffer: AudioBuffer): AudioLoadResources {
  return {
    buffer,
    metadata: { title: file.name, artist: null, album: null, artworkUrl: null },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((accept, decline) => {
    resolve = accept;
    reject = decline;
  });
  return { promise, resolve, reject };
}

function harness() {
  const oldBuffer = audioBuffer(1);
  const fileA: FileState = {
    ...createEmptyFile(0, 'file-a'),
    name: 'old-a.wav',
    buffer: oldBuffer,
    loadingState: 'loaded',
  };
  let state = {
    activeFileId: fileA.id,
    files: [fileA],
    mainTrack: {
      ...createEmptyMainTrack({ volume: 0.8, loop: false }),
      name: fileA.name,
      buffer: oldBuffer,
      loadingState: 'loaded' as const,
    },
    transport: { playing: false, masterVolume: 0.8, masterMuted: false },
    snapshots: [],
    ab: { a: null, b: null },
  } as unknown as AudioLabState;
  const set = ((patch: Parameters<AudioLabSet>[0]) => {
    state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  }) as AudioLabSet;
  const context = {
    get: () => state,
    set,
    loads: new LoadCoordinator(set),
    status: { show: vi.fn(), dismiss: vi.fn() },
  } as unknown as StoreContext;
  Object.assign(state, createMainTrackActions(context), createFileActions(context));
  return { state: () => state, oldBuffer };
}

beforeEach(() => vi.clearAllMocks());

it('keeps a newer direct-main load current when the active row replacement finishes first', async () => {
  const sidebar = deferred<AudioLoadResources>();
  const direct = deferred<AudioLoadResources>();
  mocks.loadResources.mockReturnValueOnce(sidebar.promise).mockReturnValueOnce(direct.promise);
  const test = harness();
  const replacement = test.state().loadFile('file-a', new File(['a'], 'new-a.wav'));
  const mainLoad = test.state().loadMainTrack(new File(['b'], 'direct-b.wav'));
  const replacementBuffer = audioBuffer(2);
  sidebar.resolve(loaded(new File(['a'], 'new-a.wav'), replacementBuffer));
  await replacement;

  expect(test.state().files[0]?.buffer).toBe(replacementBuffer);
  expect(test.state().mainTrack).toMatchObject({ buffer: test.oldBuffer, loadingState: 'loading' });
  const directBuffer = audioBuffer(3);
  direct.resolve(loaded(new File(['b'], 'direct-b.wav'), directBuffer));
  await mainLoad;
  expect(test.state()).toMatchObject({ activeFileId: null, mainTrack: { buffer: directBuffer } });
});

it('updates the sidebar row without disturbing a direct-main load that finished first', async () => {
  const sidebar = deferred<AudioLoadResources>();
  const direct = deferred<AudioLoadResources>();
  mocks.loadResources.mockReturnValueOnce(sidebar.promise).mockReturnValueOnce(direct.promise);
  const test = harness();
  const replacement = test.state().loadFile('file-a', new File(['a'], 'new-a.wav'));
  const mainLoad = test.state().loadMainTrack(new File(['b'], 'direct-b.wav'));
  const directBuffer = audioBuffer(3);
  direct.resolve(loaded(new File(['b'], 'direct-b.wav'), directBuffer));
  await mainLoad;
  const replacementBuffer = audioBuffer(2);
  sidebar.resolve(loaded(new File(['a'], 'new-a.wav'), replacementBuffer));
  await replacement;

  expect(test.state().files[0]?.buffer).toBe(replacementBuffer);
  expect(test.state()).toMatchObject({ activeFileId: null, mainTrack: { buffer: directBuffer } });
});

it('does not claim a main intent when replacement begins during a direct-main load', async () => {
  const direct = deferred<AudioLoadResources>();
  const sidebar = deferred<AudioLoadResources>();
  mocks.loadResources.mockReturnValueOnce(direct.promise).mockReturnValueOnce(sidebar.promise);
  const test = harness();
  const mainLoad = test.state().loadMainTrack(new File(['b'], 'direct-b.wav'));
  const replacement = test.state().loadFile('file-a', new File(['a'], 'new-a.wav'));
  const replacementBuffer = audioBuffer(2);
  sidebar.resolve(loaded(new File(['a'], 'new-a.wav'), replacementBuffer));
  await replacement;

  expect(test.state().mainTrack.loadingState).toBe('loading');
  const directBuffer = audioBuffer(3);
  direct.resolve(loaded(new File(['b'], 'direct-b.wav'), directBuffer));
  await mainLoad;
  expect(test.state()).toMatchObject({ activeFileId: null, mainTrack: { buffer: directBuffer } });
});

it('syncs a replacement after an overlapping direct-main load rolls back', async () => {
  const direct = deferred<AudioLoadResources>();
  const sidebar = deferred<AudioLoadResources>();
  mocks.loadResources.mockReturnValueOnce(direct.promise).mockReturnValueOnce(sidebar.promise);
  const test = harness();
  const mainLoad = test.state().loadMainTrack(new File(['b'], 'bad-b.wav'));
  const replacement = test.state().loadFile('file-a', new File(['a'], 'new-a.wav'));

  direct.reject(new Error('decode'));
  await mainLoad;
  expect(test.state()).toMatchObject({
    activeFileId: 'file-a',
    mainTrack: { buffer: test.oldBuffer, loadingState: 'loaded' },
  });

  const replacementBuffer = audioBuffer(2);
  sidebar.resolve(loaded(new File(['a'], 'new-a.wav'), replacementBuffer));
  await replacement;
  expect(test.state()).toMatchObject({
    activeFileId: 'file-a',
    mainTrack: { buffer: replacementBuffer, loadingState: 'loaded' },
  });
  expect(test.state().files[0]?.buffer).toBe(replacementBuffer);
});

it('does not let a failed sidebar replacement cancel the overlapping direct-main load', async () => {
  const sidebar = deferred<AudioLoadResources>();
  const direct = deferred<AudioLoadResources>();
  mocks.loadResources.mockReturnValueOnce(sidebar.promise).mockReturnValueOnce(direct.promise);
  const test = harness();
  const replacement = test.state().loadFile('file-a', new File(['a'], 'bad-a.wav'));
  const mainLoad = test.state().loadMainTrack(new File(['b'], 'direct-b.wav'));
  sidebar.reject(new Error('decode'));
  await replacement;
  expect(test.state().files[0]).toMatchObject({ buffer: test.oldBuffer, loadingState: 'loaded' });
  const directBuffer = audioBuffer(3);
  direct.resolve(loaded(new File(['b'], 'direct-b.wav'), directBuffer));
  await mainLoad;
  expect(test.state()).toMatchObject({ activeFileId: null, mainTrack: { buffer: directBuffer } });
});

it('honors explicit activation of the replacing row during the overlap', async () => {
  const sidebar = deferred<AudioLoadResources>();
  const direct = deferred<AudioLoadResources>();
  mocks.loadResources.mockReturnValueOnce(sidebar.promise).mockReturnValueOnce(direct.promise);
  const test = harness();
  const replacement = test.state().loadFile('file-a', new File(['a'], 'new-a.wav'));
  const mainLoad = test.state().loadMainTrack(new File(['b'], 'direct-b.wav'));
  test.state().activateFile('file-a');
  expect(test.state().mainTrack).toMatchObject({ buffer: test.oldBuffer, loadingState: 'loaded' });

  const replacementBuffer = audioBuffer(2);
  sidebar.resolve(loaded(new File(['a'], 'new-a.wav'), replacementBuffer));
  await replacement;
  direct.resolve(loaded(new File(['b'], 'direct-b.wav'), audioBuffer(3)));
  await mainLoad;
  expect(test.state()).toMatchObject({
    activeFileId: 'file-a',
    mainTrack: { buffer: replacementBuffer, loadingState: 'loaded' },
  });
});
