import { beforeEach, expect, it, vi } from 'vitest';
import type { AudioLabState } from './audioLabStoreTypes';
import type { StoreContext } from './storeContext';

const mocks = vi.hoisted(() => ({
  clearStoredAudio: vi.fn<() => Promise<boolean>>(),
  clearSession: vi.fn(() => true),
  audioEngine: {
    stop: vi.fn(),
    clearMainBuffer: vi.fn(),
    setMainLoopPoints: vi.fn(),
    removeFileBuffer: vi.fn(),
    setMainVolume: vi.fn(),
    setMainLoop: vi.fn(),
    setMasterVolume: vi.fn(),
    setMasterMute: vi.fn(),
  },
}));

vi.mock('../audio/AudioEngine', () => ({ audioEngine: mocks.audioEngine }));
vi.mock('../audio/metadata', () => ({ revokeArtworkUrl: vi.fn() }));
vi.mock('./mediaStorage', () => ({ clearStoredAudio: mocks.clearStoredAudio }));
vi.mock('./persistence', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('./persistence')),
  clearSession: mocks.clearSession,
}));

import { createSessionActions } from './sessionActions';
import { defaultSession } from './persistence';
import { serializePreset } from './presets';
import { createEmptyMainTrack } from './storeState';

function createHarness() {
  let state = {
    mainTrack: createEmptyMainTrack({ volume: 0.8, loop: false }),
    files: [],
    transport: { playing: false, masterVolume: 0.8, masterMuted: false },
    snapshots: [],
    ab: { a: null, b: null },
    activeFileId: null,
  } as unknown as AudioLabState;
  const status = { show: vi.fn(), dismiss: vi.fn() };
  const context = {
    get: () => state,
    set: (patch: Partial<AudioLabState>) => (state = { ...state, ...patch }),
    loads: { reset: vi.fn() },
    status,
  } as unknown as StoreContext;
  const actions = createSessionActions(context);
  return { reset: actions.resetSession, actions, state: () => state, status };
}

function presetText(filename: string): string {
  const session = defaultSession();
  session.main.filename = filename;
  return JSON.stringify(serializePreset(session));
}

function deferredPreset(): { file: File; finish: (text: string) => void } {
  let finish!: (text: string) => void;
  const text = new Promise<string>((resolve) => (finish = resolve));
  return { file: { size: 100, text: () => text } as File, finish };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.clearSession.mockReturnValue(true);
  mocks.clearStoredAudio.mockResolvedValue(true);
});

it('reports success only after persistent media has been cleared', async () => {
  let finish = (_value: boolean) => {};
  mocks.clearStoredAudio.mockReturnValue(new Promise((resolve) => (finish = resolve)));
  const harness = createHarness();
  const pending = harness.reset();
  expect(harness.status.show).not.toHaveBeenCalled();
  finish(true);
  await pending;
  expect(harness.status.show).toHaveBeenCalledWith('Session reset', 5000);
});

it('surfaces incomplete persistent cleanup', async () => {
  mocks.clearStoredAudio.mockResolvedValue(false);
  const harness = createHarness();
  await harness.reset();
  expect(harness.status.show).toHaveBeenCalledWith(
    'Session reset in memory, but stored data could not be fully cleared',
    5000,
  );
});

it('does not let an older import overwrite a reset or a newer import', async () => {
  const resetCase = createHarness();
  const oldAfterReset = deferredPreset();
  const pendingResetImport = resetCase.actions.importPreset(oldAfterReset.file);
  await resetCase.actions.resetSession();
  oldAfterReset.finish(presetText('resurrected.wav'));
  await pendingResetImport;
  expect(resetCase.state().mainTrack.name).toBe('');

  const importCase = createHarness();
  const older = deferredPreset();
  const pendingOlder = importCase.actions.importPreset(older.file);
  await importCase.actions.importPreset({
    size: 100,
    text: async () => presetText('newer.wav'),
  } as File);
  older.finish(presetText('older.wav'));
  await pendingOlder;
  expect(importCase.state().mainTrack.name).toBe('newer.wav');
});
