import { expect, it, vi } from 'vitest';
import type { AudioLabState } from './audioLabStoreTypes';
import { pruneUnusedMedia, referencedAssetIds } from './mediaRetention';
import type { StoreContext } from './storeContext';

type KeepIdSource = readonly string[] | (() => readonly string[]);
const mocks = vi.hoisted(() => ({
  prune: vi.fn<(source: KeepIdSource) => Promise<void>>(async () => undefined),
}));
vi.mock('./mediaStorage', () => ({ pruneStoredAudio: mocks.prune }));

it('returns unique referenced media IDs and starts best-effort pruning', () => {
  const state = {
    mainTrack: { assetId: 'sha256-a' },
    files: [{ assetId: 'sha256-a' }, { assetId: 'sha256-b' }, { assetId: null }],
  } as unknown as AudioLabState;
  expect(referencedAssetIds(state)).toEqual(['sha256-a', 'sha256-b']);
  pruneUnusedMedia({ get: () => state } as unknown as StoreContext);
  const keepIdSource = mocks.prune.mock.calls[0]?.[0];
  expect(typeof keepIdSource).toBe('function');
  expect((keepIdSource as () => readonly string[])()).toEqual(['sha256-a', 'sha256-b']);
});

it('tolerates a partial test context without a file list', () => {
  const state = { mainTrack: { assetId: null } } as unknown as AudioLabState;
  expect(referencedAssetIds(state)).toEqual([]);
});
