import { beforeEach, expect, it, vi } from 'vitest';
import type { AudioLabState } from './audioLabStoreTypes';
import { createTransportActions } from './transportActions';
import type { StoreContext } from './storeContext';

const engine = vi.hoisted(() => ({
  resumeContext: vi.fn<() => Promise<boolean>>(),
  play: vi.fn(),
  pause: vi.fn(),
  stop: vi.fn(),
  seek: vi.fn(),
  getMainDuration: vi.fn(() => 10),
  currentTime: 0,
  setMasterVolume: vi.fn(),
  setMasterMute: vi.fn(),
}));
vi.mock('../audio/AudioEngine', () => ({ audioEngine: engine }));

function harness() {
  let state = {
    transport: { playing: false, masterVolume: 0.8, masterMuted: false },
    mainTrack: { loadingState: 'loaded', buffer: {} as AudioBuffer },
  } as AudioLabState;
  const status = { show: vi.fn() };
  const context = {
    get: () => state,
    set: (patch: (current: AudioLabState) => Partial<AudioLabState>) => {
      state = { ...state, ...patch(state) };
    },
    status,
  } as unknown as StoreContext;
  return { actions: createTransportActions(context), state: () => state, status };
}

beforeEach(() => {
  vi.clearAllMocks();
  engine.resumeContext.mockResolvedValue(true);
});

it('does not play when a pending resume was invalidated by stop', async () => {
  let finishResume: (current: boolean) => void = () => {};
  engine.resumeContext.mockReturnValueOnce(
    new Promise((resolve) => {
      finishResume = resolve;
    }),
  );
  const test = harness();

  test.actions.play();
  test.actions.stop();
  finishResume(false);
  await Promise.resolve();

  expect(engine.stop).toHaveBeenCalledOnce();
  expect(engine.play).not.toHaveBeenCalled();
  expect(test.state().transport.playing).toBe(false);
});

it('does not start playback while the main track is being replaced', () => {
  const test = harness();
  test.state().mainTrack.loadingState = 'loading';

  test.actions.play();

  expect(engine.resumeContext).not.toHaveBeenCalled();
});

it('does not start playback without a decoded buffer', () => {
  const test = harness();
  test.state().mainTrack.buffer = null;
  test.actions.play();
  expect(engine.resumeContext).not.toHaveBeenCalled();
  expect(test.state().transport.playing).toBe(false);
});

it('rechecks the buffer after an asynchronous context resume', async () => {
  let finishResume!: (current: boolean) => void;
  engine.resumeContext.mockReturnValueOnce(new Promise((resolve) => (finishResume = resolve)));
  const test = harness();
  test.actions.play();
  test.state().mainTrack.buffer = null;
  finishResume(true);
  await Promise.resolve();
  expect(engine.play).not.toHaveBeenCalled();
  expect(test.state().transport.playing).toBe(false);
});
