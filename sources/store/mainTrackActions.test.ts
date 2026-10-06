import { beforeEach, expect, it, vi } from 'vitest';
import type { AudioLabState } from './audioLabStoreTypes';
import type { StoreContext } from './storeContext';
import { createEmptyFile, createEmptyMainTrack } from './storeState';

const engine = vi.hoisted(() => ({
  stop: vi.fn(),
  setMainBuffer: vi.fn(),
  setMainVolume: vi.fn(),
  setMainLoopPoints: vi.fn(),
  clearMainBuffer: vi.fn(),
  setMainLoop: vi.fn(),
}));
const releaseArtwork = vi.hoisted(() => vi.fn());
const pruneMedia = vi.hoisted(() => vi.fn());

vi.mock('../audio/AudioEngine', () => ({ audioEngine: engine }));
vi.mock('./artworkLifecycle', () => ({ releaseArtworkIfUnreferenced: releaseArtwork }));
vi.mock('./mainTrackLoading', () => ({ createLoadMainTrack: () => vi.fn() }));
vi.mock('./mediaRetention', () => ({ pruneUnusedMedia: pruneMedia }));

import { createMainTrackActions } from './mainTrackActions';

function harness() {
  const oldBuffer = { duration: 1 } as AudioBuffer;
  const newBuffer = { duration: 2 } as AudioBuffer;
  let state = {
    activeFileId: 'file-a',
    transport: { playing: true, masterVolume: 0.8, masterMuted: false },
    mainTrack: {
      ...createEmptyMainTrack({ volume: 0.8, loop: false }),
      name: 'old.wav',
      buffer: oldBuffer,
      assetId: 'old-asset',
      thumbnailUrl: 'blob:direct',
      loadingState: 'loaded' as const,
      selection: { startSeconds: 0.1, endSeconds: 0.5 },
    },
    files: [
      {
        ...createEmptyFile(0, 'file-a'),
        name: 'replacement.wav',
        buffer: newBuffer,
        assetId: 'new-asset',
        thumbnailUrl: 'blob:shared',
        fileIdentity: {
          name: 'replacement.wav',
          size: 10,
          lastModified: 1,
          durationSeconds: 2,
          sampleRate: 44_100,
          channelCount: 1,
        },
        loadingState: 'loaded' as const,
      },
    ],
  } as AudioLabState;
  const context = {
    get: () => state,
    set: (patch: Partial<AudioLabState> | ((value: AudioLabState) => Partial<AudioLabState>)) => {
      state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
    },
    loads: { nextMainGeneration: vi.fn(() => 1), analyzeMainBuffer: vi.fn() },
    status: { show: vi.fn() },
  } as unknown as StoreContext;
  return { actions: createMainTrackActions(context), getState: () => state, newBuffer };
}

beforeEach(() => vi.clearAllMocks());

it('reactivates the same id when its asset changed and no-ops only when synchronized', () => {
  const { actions, getState, newBuffer } = harness();
  actions.activateFile('file-a');

  expect(getState().mainTrack).toMatchObject({
    name: 'replacement.wav',
    buffer: newBuffer,
    assetId: 'new-asset',
    fileIdentity: expect.objectContaining({ name: 'replacement.wav' }),
    thumbnailUrl: 'blob:shared',
    selection: null,
  });
  expect(engine.setMainBuffer).toHaveBeenCalledWith(newBuffer);
  expect(engine.setMainLoop).toHaveBeenCalledWith(false);
  expect(releaseArtwork).toHaveBeenCalledWith('blob:direct', expect.anything());
  expect(pruneMedia).toHaveBeenCalledOnce();

  actions.setMainSelection(0.2, 0.4);
  actions.activateFile('file-a');
  expect(engine.setMainBuffer).toHaveBeenCalledOnce();
  expect(pruneMedia).toHaveBeenCalledOnce();
  expect(getState().mainTrack.selection).toEqual({ startSeconds: 0.2, endSeconds: 0.4 });
});

it('clearing the main track also clears active identity and playback state', () => {
  const { actions, getState } = harness();
  actions.clearMainTrack();
  expect(getState()).toMatchObject({
    activeFileId: null,
    transport: { playing: false },
    mainTrack: { loadingState: 'empty', buffer: null },
  });
  expect(engine.setMainLoop).toHaveBeenLastCalledWith(false);
});

it('does not change loop intent while a replacement is loading', () => {
  const { actions, getState } = harness();
  getState().mainTrack.loadingState = 'loading';

  actions.setMainLoop(true);

  expect(getState().mainTrack.loop).toBe(false);
  expect(engine.setMainLoop).not.toHaveBeenCalled();
});

it('accepts a decimal-boundary selection for looping', () => {
  const { actions, getState } = harness();
  getState().mainTrack.selection = { startSeconds: 5, endSeconds: 5.1 };

  actions.setMainLoop(true);

  expect(getState().mainTrack.loop).toBe(true);
  expect(engine.setMainLoopPoints).toHaveBeenCalledWith(5, 5.1);
  expect(engine.setMainLoop).toHaveBeenCalledWith(true);
});
