import { beforeEach, expect, it, vi } from 'vitest';
import type { AudioLoadResources } from '../audio/audioLoadResources';
import type { FileState } from '../audio/types';
import type { AudioLabState } from './audioLabStoreTypes';
import { createLoadMainTrack } from './mainTrackLoading';
import { createSnapshotActions } from './snapshotActions';
import { MAX_NAME_LENGTH, MAX_SNAPSHOTS, type SessionSnapshot } from './snapshots';
import type { StoreContext } from './storeContext';
import { createEmptyMainTrack } from './storeState';
const mocks = vi.hoisted(() => ({
  setMainLoopPoints: vi.fn(),
  loadResources: vi.fn<() => Promise<AudioLoadResources>>(),
}));
vi.mock('../audio/AudioEngine', () => ({
  audioEngine: {
    setMainLoopPoints: mocks.setMainLoopPoints,
    setMainBuffer: vi.fn(),
    stop: vi.fn(),
    setMasterVolume: vi.fn(),
    setMasterMute: vi.fn(),
    setMainVolume: vi.fn(),
    setMainLoop: vi.fn(),
    setFileVolume: vi.fn(),
    removeFileBuffer: vi.fn(),
  },
}));
vi.mock('../audio/audioLoadResources', () => ({ loadAudioResources: mocks.loadResources }));
vi.mock('../audio/bpm', () => ({ detectBpm: vi.fn(async () => null) }));
vi.mock('./artworkLifecycle', () => ({ releaseArtworkIfUnreferenced: vi.fn() }));
const status = { show: vi.fn(), dismiss: vi.fn() };
let mainGeneration = 0;
const loads = {
  reset: vi.fn(),
  removeFile: vi.fn(),
  nextMainGeneration: vi.fn(() => ++mainGeneration),
  isMainCurrent: vi.fn((candidate: number) => candidate === mainGeneration),
  restoreMainIntent: vi.fn(),
  analyzeMainBuffer: vi.fn(),
};
function makeSnapshot(id: string, name = 'Saved'): SessionSnapshot {
  return {
    id,
    name,
    createdAt: '2026-10-05T00:00:00.000Z',
    main: {
      volume: 0.8,
      loop: false,
      filename: null,
      thumbnailUrl: null,
      bpm: null,
      bpmConfidence: null,
    },
    masterVolume: 0.8,
    masterMuted: false,
    files: [],
  };
}
function makeHarness(snapshots: SessionSnapshot[] = [], files: FileState[] = []) {
  let state = {
    mainTrack: createEmptyMainTrack({ volume: 0.8, loop: false }),
    files,
    transport: { playing: false, masterVolume: 0.8, masterMuted: false },
    snapshots,
    ab: { a: null, b: null },
    activeFileId: null,
    statusMessage: null,
  } as unknown as AudioLabState;
  const context = {
    get: () => state,
    set: (patch: Partial<AudioLabState> | ((current: AudioLabState) => Partial<AudioLabState>)) => {
      state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
    },
    status,
    loads,
  } as unknown as StoreContext;
  return { actions: createSnapshotActions(context), getState: () => state, context };
}
beforeEach(() => {
  mainGeneration = 0;
  vi.clearAllMocks();
});
it('uses a default snapshot name and enforces the snapshot limit', () => {
  const harness = makeHarness();
  harness.actions.saveSnapshot('   ');
  expect(harness.getState().snapshots[0]!.name).toBe('Snapshot 1');
  const full = makeHarness(Array.from({ length: MAX_SNAPSHOTS }, (_, i) => makeSnapshot(`${i}`)));
  full.actions.saveSnapshot('Extra');
  expect(full.getState().snapshots).toHaveLength(MAX_SNAPSHOTS);
  expect(status.show).toHaveBeenLastCalledWith(`Snapshot limit reached (${MAX_SNAPSHOTS})`, 4000);
});
it('trims renames and ignores empty names', () => {
  const harness = makeHarness([makeSnapshot('one'), makeSnapshot('two')]);
  harness.actions.renameSnapshot('one', `  ${'x'.repeat(60)}  `);
  expect(harness.getState().snapshots[0]!.name).toBe('x'.repeat(MAX_NAME_LENGTH));
  expect(harness.getState().snapshots[1]!.name).toBe('Saved');
  harness.actions.renameSnapshot('one', '   ');
  expect(status.show).toHaveBeenCalledTimes(1);
});
it('handles missing and capped duplicates plus empty apply slots', () => {
  const harness = makeHarness([makeSnapshot('one', 'A'.repeat(MAX_NAME_LENGTH))]);
  harness.actions.duplicateSnapshot('missing');
  harness.actions.applySnapshot('missing');
  harness.actions.applyAB('b');
  expect(harness.getState().snapshots).toHaveLength(1);
  expect(status.show).not.toHaveBeenCalled();
  harness.actions.duplicateSnapshot('one');
  expect(harness.getState().snapshots[1]!.name).toBe(`${'A'.repeat(33)} (copy)`);
  const full = makeHarness(Array.from({ length: MAX_SNAPSHOTS }, (_, i) => makeSnapshot(`${i}`)));
  full.actions.duplicateSnapshot('0');
  expect(full.getState().snapshots).toHaveLength(MAX_SNAPSHOTS);
});

it('applies settings without cancelling analysis for unchanged media', () => {
  const harness = makeHarness([makeSnapshot('one')]);

  harness.actions.applySnapshot('one');

  expect(loads.reset).not.toHaveBeenCalled();
  expect(loads.removeFile).not.toHaveBeenCalled();
});

it('preserves the generation of a loading replacement retained by a snapshot', () => {
  const saved = makeSnapshot('one');
  saved.files = [
    {
      id: 'file-1',
      order: 0,
      volume: 0.5,
      filename: 'current.wav',
      thumbnailUrl: null,
      bpm: null,
      bpmConfidence: null,
    },
  ];
  const loading = {
    id: 'file-1',
    order: 0,
    name: 'replacement.wav',
    buffer: null,
    volume: 0.8,
    loop: false,
    thumbnailUrl: null,
    loadingState: 'loading' as const,
    metadata: null,
  };
  const harness = makeHarness([saved], [loading]);

  harness.actions.applySnapshot('one');

  expect(loads.removeFile).not.toHaveBeenCalled();
  expect(harness.getState().files[0]).toMatchObject({
    name: 'replacement.wav',
    loadingState: 'loading',
  });
});

it('clears an active association when its snapshot row no longer owns the main buffer', () => {
  const saved = makeSnapshot('one');
  saved.files = [
    {
      id: 'file-1',
      order: 0,
      volume: 0.5,
      filename: 'current.wav',
      thumbnailUrl: null,
      bpm: null,
      bpmConfidence: null,
    },
  ];
  const buffer = { duration: 2 } as AudioBuffer;
  const active = {
    id: 'file-1',
    order: 0,
    name: 'current.wav',
    assetId: 'current-asset',
    buffer,
    volume: 0.8,
    loop: false,
    thumbnailUrl: null,
    loadingState: 'loaded' as const,
    metadata: null,
  };
  const harness = makeHarness([saved], [active]);
  Object.assign(harness.getState(), {
    activeFileId: active.id,
    mainTrack: {
      ...createEmptyMainTrack({ volume: 0.8, loop: false }),
      name: active.name,
      assetId: active.assetId,
      buffer,
      loadingState: 'loaded',
    },
  });

  expect(harness.getState().activeFileId).toBe(active.id);
  harness.actions.applySnapshot('one');
  expect(harness.getState().files[0]!.buffer).toBe(buffer);
  expect(harness.getState().activeFileId).toBe(active.id);

  saved.files[0]!.filename = 'saved.wav';
  harness.actions.applySnapshot('one');

  expect(harness.getState().activeFileId).toBeNull();
  expect(harness.getState().mainTrack.buffer).toBe(buffer);
  expect(harness.getState().files[0]).toMatchObject({ name: 'saved.wav', buffer: null });
});

it('keeps a failed replacement detached from a row changed by a snapshot', async () => {
  let fail!: (reason: Error) => void;
  mocks.loadResources.mockReturnValueOnce(new Promise((_resolve, reject) => (fail = reject)));
  const buffer = { duration: 2 } as AudioBuffer;
  const active = {
    id: 'file-1',
    order: 0,
    name: 'live.wav',
    buffer,
    volume: 0.8,
    loop: false,
    thumbnailUrl: null,
    loadingState: 'loaded' as const,
    metadata: null,
  };
  const snapshot = makeSnapshot('race');
  snapshot.files = [
    {
      id: active.id,
      order: 0,
      volume: 0.5,
      filename: 'earlier.wav',
      thumbnailUrl: null,
      bpm: null,
      bpmConfidence: null,
    },
  ];
  const harness = makeHarness([snapshot], [active]);
  Object.assign(harness.getState(), {
    activeFileId: active.id,
    mainTrack: { ...createEmptyMainTrack({ volume: 0.8, loop: false }), ...active, id: 'main' },
  });
  const pending = createLoadMainTrack(harness.context)(new File(['new'], 'new.wav'));
  harness.actions.applySnapshot(snapshot.id);
  fail(new Error('decode'));
  await pending;

  expect(harness.getState()).toMatchObject({
    activeFileId: null,
    mainTrack: { buffer },
    files: [{ id: active.id, name: 'earlier.wav', buffer: null }],
  });
});
