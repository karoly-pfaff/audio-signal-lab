import { expect, it, vi } from 'vitest';
import type { AudioLabState } from './audioLabStoreTypes';
import { defaultSession } from './persistence';
import { buildPersistedSession, createInitialData } from './storeState';

vi.mock('../audio/AudioEngine', () => ({ audioEngine: {} }));

const assetId = `sha256-${'c'.repeat(64)}`;

it('rehydrates remembered tracks and persists their local asset references', () => {
  const session = defaultSession();
  session.main.filename = 'main.wav';
  session.main.assetId = assetId;
  session.files.push({
    id: 'file-1',
    order: 0,
    volume: 0.7,
    filename: 'file.wav',
    assetId,
    thumbnailUrl: null,
    bpm: 120,
    bpmConfidence: 'high',
  });

  const data = createInitialData(session);
  expect(data.mainTrack).toMatchObject({ name: 'main.wav', assetId, loadingState: 'remembered' });
  expect(data.files[0]).toMatchObject({ name: 'file.wav', assetId, loadingState: 'remembered' });
  const persisted = buildPersistedSession(data as unknown as AudioLabState);
  expect(persisted.main.assetId).toBe(assetId);
  expect(persisted.files[0].assetId).toBe(assetId);
  expect(persisted.version).toBe(4);
});
