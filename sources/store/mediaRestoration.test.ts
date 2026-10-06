import { expect, it, vi } from 'vitest';
import type { AudioLabState } from './audioLabStoreTypes';
import { restoreStoredAudio } from './mediaRestoration';
import type { StoreContext } from './storeContext';

const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('./mediaStorage', () => ({ loadAudioFile: mocks.load }));

const assetA = `sha256-${'a'.repeat(64)}`;
const assetB = `sha256-${'b'.repeat(64)}`;

function createHarness() {
  let state = {
    mainTrack: {
      assetId: assetA,
      buffer: null,
      name: 'main.wav',
      loadingState: 'remembered',
      fileIdentity: { lastModified: 12 },
    },
    files: [
      {
        id: 'file-1',
        assetId: assetB,
        buffer: null,
        name: 'file.wav',
        loadingState: 'remembered',
        fileIdentity: { lastModified: 34 },
      },
    ],
    loadMainTrack: vi.fn(async () => undefined),
    loadFile: vi.fn(async () => undefined),
  } as unknown as AudioLabState;
  const status = { show: vi.fn() };
  const context = {
    get: () => state,
    set: (patch: Partial<AudioLabState> | ((value: AudioLabState) => Partial<AudioLabState>)) => {
      state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
    },
    status,
  } as unknown as StoreContext;
  return { context, state: () => state, status };
}

it('restores the remembered main track and file through normal load actions', async () => {
  const harness = createHarness();
  mocks.load.mockImplementation(
    async (_id: string, descriptor: { name: string; lastModified: number }) =>
      new File(['audio'], descriptor.name, { lastModified: descriptor.lastModified }),
  );
  await restoreStoredAudio(harness.context);

  expect(harness.state().loadMainTrack).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'main.wav' }),
  );
  expect(harness.state().loadFile).toHaveBeenCalledWith(
    'file-1',
    expect.objectContaining({ name: 'file.wav' }),
  );
  expect(mocks.load).toHaveBeenCalledWith(assetA, { name: 'main.wav', lastModified: 12 });
  expect(mocks.load).toHaveBeenCalledWith(assetB, { name: 'file.wav', lastModified: 34 });
});

it('clears stale references when the stored bytes are missing', async () => {
  const harness = createHarness();
  mocks.load.mockResolvedValue(null);
  await restoreStoredAudio(harness.context);

  expect(harness.state().mainTrack).toMatchObject({ assetId: null, loadingState: 'remembered' });
  expect(harness.state().files[0]).toMatchObject({ assetId: null, loadingState: 'remembered' });
  expect(harness.status.show).toHaveBeenCalledTimes(2);
});

it('ignores already loaded and superseded restoration targets', async () => {
  const harness = createHarness();
  const resolvers: Array<(file: File) => void> = [];
  mocks.load.mockImplementation(() => new Promise<File>((resolve) => resolvers.push(resolve)));
  const restoring = restoreStoredAudio(harness.context);
  harness.state().mainTrack.assetId = null;
  harness.state().files[0].assetId = null;
  resolvers.forEach((resolve) => resolve(new File(['audio'], 'late.wav')));
  await restoring;
  expect(harness.state().loadMainTrack).not.toHaveBeenCalled();
  expect(harness.state().loadFile).not.toHaveBeenCalled();

  harness.state().mainTrack.buffer = {} as AudioBuffer;
  harness.state().files[0].buffer = {} as AudioBuffer;
  await restoreStoredAudio(harness.context);
  expect(mocks.load).toHaveBeenCalledTimes(2);
});

it('does not read storage for tracks that already have decoded buffers', async () => {
  const harness = createHarness();
  harness.state().mainTrack.buffer = {} as AudioBuffer;
  harness.state().files[0].buffer = {} as AudioBuffer;
  mocks.load.mockClear();
  await restoreStoredAudio(harness.context);
  expect(mocks.load).not.toHaveBeenCalled();
});

it('does not let a late restore overtake a user-initiated load', async () => {
  const harness = createHarness();
  const resolvers: Array<(file: File) => void> = [];
  mocks.load.mockImplementation(() => new Promise<File>((resolve) => resolvers.push(resolve)));
  const restoring = restoreStoredAudio(harness.context);
  harness.state().mainTrack.loadingState = 'loading';
  harness.state().files[0].loadingState = 'loading';
  resolvers.forEach((resolve) => resolve(new File(['old'], 'old.wav')));

  await restoring;

  expect(harness.state().loadMainTrack).not.toHaveBeenCalled();
  expect(harness.state().loadFile).not.toHaveBeenCalled();
});
