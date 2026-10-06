import { beforeEach, expect, it, vi } from 'vitest';
import type { AudioMetadata } from '../audio/metadata';
import type { MainTrackState } from '../audio/types';
import type { ReconciliationResult } from '../utils/annotationReconciliation';
import type { AudioLabState } from './audioLabStoreTypes';
import { createLoadMainTrack } from './mainTrackLoading';
import type { StoreContext } from './storeContext';
import { createEmptyMainTrack } from './storeState';

const mocks = vi.hoisted(() => {
  const channel = new Float32Array(16);
  const buffer = {
    duration: 2,
    length: channel.length,
    numberOfChannels: 1,
    sampleRate: 8000,
    getChannelData: () => channel,
  } as unknown as AudioBuffer;
  return {
    buffer,
    decodeFile: vi.fn(async () => buffer),
    detectBpm: vi.fn(async () => null),
    extractMetadata: vi.fn<() => Promise<AudioMetadata>>(async () => ({
      title: 'Loaded',
      artist: null,
      album: null,
      artworkUrl: null,
    })),
    revokeArtworkUrl: vi.fn(),
    reconcile: vi.fn(),
    buildIdentity: vi.fn(),
    compareIdentity: vi.fn(),
    formatWarning: vi.fn(),
    stop: vi.fn(),
    setMainBuffer: vi.fn(),
    setMainLoop: vi.fn(),
    setMainLoopPoints: vi.fn(),
    pruneUnusedMedia: vi.fn(),
    storeAudio: vi.fn<() => Promise<string | null>>(async () => `sha256-${'a'.repeat(64)}`),
  };
});

vi.mock('../audio/AudioEngine', () => ({
  audioEngine: {
    decodeFile: mocks.decodeFile,
    stop: mocks.stop,
    setMainBuffer: mocks.setMainBuffer,
    setMainLoop: mocks.setMainLoop,
    setMainLoopPoints: mocks.setMainLoopPoints,
  },
}));
vi.mock('../audio/bpm', () => ({ detectBpm: mocks.detectBpm }));
vi.mock('../audio/metadata', () => ({
  extractMetadata: mocks.extractMetadata,
  revokeArtworkUrl: mocks.revokeArtworkUrl,
}));
vi.mock('../utils/annotationReconciliation', () => ({
  reconcileAnnotationsForDuration: mocks.reconcile,
}));
vi.mock('../utils/fileIdentity', () => ({
  buildFileIdentity: mocks.buildIdentity,
  compareFileIdentity: mocks.compareIdentity,
  formatIdentityWarning: mocks.formatWarning,
}));
vi.mock('./mediaStorage', () => ({ storeAudioFile: mocks.storeAudio }));
vi.mock('./mediaRetention', () => ({ pruneUnusedMedia: mocks.pruneUnusedMedia }));

const identity = {
  name: 'track.wav',
  size: 4,
  lastModified: 1,
  durationSeconds: 2,
  sampleRate: 8000,
  channelCount: 1,
  quickHash: 'hash',
};

function rememberedTrack(overrides: Partial<MainTrackState> = {}): MainTrackState {
  return {
    ...createEmptyMainTrack({ volume: 0.8, loop: false }),
    name: 'track.wav',
    loadingState: 'remembered',
    fileIdentity: identity,
    ...overrides,
  };
}

function makeHarness(mainTrack: MainTrackState, current = true) {
  let state = {
    mainTrack,
    files: [],
    activeFileId: null,
    transport: { playing: false, masterVolume: 0.8, masterMuted: false },
  } as unknown as AudioLabState;
  const status = { show: vi.fn() };
  const loads = {
    nextMainGeneration: vi.fn(() => 1),
    isMainCurrent: vi.fn(() => current),
    analyzeMainBuffer: vi.fn(),
    restoreMainIntent: vi.fn(),
  };
  const context = {
    get: () => state,
    set: (patch: Partial<AudioLabState> | ((value: AudioLabState) => Partial<AudioLabState>)) => {
      state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
    },
    status,
    loads,
  } as unknown as StoreContext;
  return { load: createLoadMainTrack(context), getState: () => state, status, loads };
}

function restoredResult(overrides: Partial<ReconciliationResult>): ReconciliationResult {
  return { selection: null, markers: [], droppedCount: 0, adjustedCount: 0, ...overrides };
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.decodeFile.mockResolvedValue(mocks.buffer);
  mocks.detectBpm.mockResolvedValue(null);
  mocks.storeAudio.mockResolvedValue(`sha256-${'a'.repeat(64)}`);
  mocks.buildIdentity.mockReturnValue(identity);
  mocks.compareIdentity.mockReturnValue('likely');
  mocks.formatWarning.mockReturnValue(null);
  mocks.reconcile.mockReturnValue(restoredResult({}));
});

it('loads a remembered track without annotations and accepts a null BPM result', async () => {
  const harness = makeHarness(rememberedTrack());
  await harness.load(new File(['data'], 'track.wav', { type: 'audio/wav' }));
  await flushPromises();

  expect(mocks.reconcile).not.toHaveBeenCalled();
  expect(harness.getState().mainTrack).toMatchObject({
    loadingState: 'loaded',
    bpm: null,
    bpmConfidence: null,
    bpmAnalyzing: false,
  });
  expect(harness.status.show).not.toHaveBeenCalled();
});

it('warns when decoded audio cannot be stored for reload', async () => {
  mocks.storeAudio.mockResolvedValueOnce(null);
  const harness = makeHarness(rememberedTrack());
  await harness.load(new File(['data'], 'track.wav', { type: 'audio/wav' }));
  expect(harness.status.show).toHaveBeenCalledWith(
    'Audio loaded, but it could not be saved for reload',
    5000,
  );
});

it('prioritizes an identity warning when restored annotations were dropped', async () => {
  const previous = rememberedTrack({ selection: { startSeconds: 1, endSeconds: 3 } });
  mocks.reconcile.mockReturnValue(restoredResult({ droppedCount: 1 }));
  mocks.formatWarning.mockReturnValue('identity warning');
  const harness = makeHarness(previous);
  await harness.load(new File(['data'], 'other.wav', { type: 'audio/wav' }));

  expect(harness.status.show).toHaveBeenCalledWith('identity warning', 7000);
  expect(mocks.reconcile).toHaveBeenCalledWith(previous.selection, [], 2);
});

it('reports duration adjustments when no saved identity is available', async () => {
  const previous = rememberedTrack({
    selection: { startSeconds: 0, endSeconds: 3 },
    fileIdentity: null,
  });
  mocks.reconcile.mockReturnValue(
    restoredResult({ selection: { startSeconds: 0, endSeconds: 2 }, adjustedCount: 1 }),
  );
  const harness = makeHarness(previous);
  await harness.load(new File(['data'], 'track.wav', { type: 'audio/wav' }));

  expect(harness.status.show).toHaveBeenCalledWith(
    'Session annotations adjusted to match the loaded file.',
    5000,
  );
  expect(mocks.compareIdentity).not.toHaveBeenCalled();
});

it('stays quiet when restored annotations need no changes', async () => {
  const selection = { startSeconds: 0, endSeconds: 1 };
  mocks.reconcile.mockReturnValue(restoredResult({ selection }));
  const harness = makeHarness(rememberedTrack({ selection, fileIdentity: null }));
  await harness.load(new File(['data'], 'track.wav', { type: 'audio/wav' }));
  expect(harness.status.show).not.toHaveBeenCalled();
});

it('marks current failures and ignores stale success and failure results', async () => {
  mocks.decodeFile.mockRejectedValueOnce(new Error('decode'));
  const current = makeHarness(rememberedTrack());
  await current.load(new File(['data'], 'track.wav'));
  expect(current.getState().mainTrack.loadingState).toBe('failed');
  expect(current.status.show).toHaveBeenCalledWith('Failed to decode audio', 4000);

  const stale = makeHarness(rememberedTrack(), false);
  await stale.load(new File(['data'], 'track.wav'));
  expect(mocks.setMainBuffer).not.toHaveBeenCalled();
  mocks.decodeFile.mockRejectedValueOnce(new Error('late decode'));
  await stale.load(new File(['data'], 'track.wav'));
  expect(stale.status.show).not.toHaveBeenCalled();
});

it('restores loop points into the engine after remembered audio is decoded', async () => {
  const selection = { startSeconds: 0.5, endSeconds: 1.5 };
  mocks.reconcile.mockReturnValue(restoredResult({ selection }));
  const harness = makeHarness(rememberedTrack({ loop: true, selection }));

  await harness.load(new File(['data'], 'track.wav'));

  expect(mocks.setMainLoop).toHaveBeenCalledWith(true);
  expect(mocks.setMainLoopPoints).toHaveBeenCalledWith(0.5, 1.5);
});

it('releases artwork when decoded audio exceeds the resource limit', async () => {
  const oversized = { ...mocks.buffer, duration: 3_601 } as AudioBuffer;
  mocks.decodeFile.mockResolvedValueOnce(oversized);
  mocks.extractMetadata.mockResolvedValueOnce({
    title: null,
    artist: null,
    album: null,
    artworkUrl: 'blob:oversized-cover',
  });
  const harness = makeHarness(rememberedTrack());

  await harness.load(new File(['data'], 'track.wav'));

  expect(mocks.revokeArtworkUrl).toHaveBeenCalledWith('blob:oversized-cover');
  expect(harness.getState().mainTrack.loadingState).toBe('failed');
});
