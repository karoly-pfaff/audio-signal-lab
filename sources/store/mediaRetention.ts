import type { AudioLabState } from './audioLabStoreTypes';
import { pruneStoredAudio } from './mediaStorage';
import type { StoreContext } from './storeContext';

export function referencedAssetIds(state: Pick<AudioLabState, 'mainTrack' | 'files'>): string[] {
  const fileIds = Array.isArray(state.files) ? state.files.map((file) => file.assetId) : [];
  const ids = [state.mainTrack.assetId, ...fileIds];
  return [...new Set(ids.filter((id): id is string => typeof id === 'string'))];
}

export function pruneUnusedMedia(context: StoreContext): void {
  void pruneStoredAudio(() => referencedAssetIds(context.get()));
}
