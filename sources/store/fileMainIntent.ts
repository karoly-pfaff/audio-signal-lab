import type { FileState } from '../audio/types';
import type { MainIntentSnapshot } from './loadCoordinator';
import type { StoreContext } from './storeContext';

export function captureFileMainIntent(
  context: StoreContext,
  fileId: string,
  file: FileState | undefined,
): MainIntentSnapshot {
  const state = context.get();
  const ownsMain =
    state.mainTrack.loadingState !== 'loading' &&
    state.activeFileId === fileId &&
    state.mainTrack.buffer === file?.buffer;
  return context.loads.mainIntentSnapshot(ownsMain ? fileId : null);
}

export function syncFileToMainIntent(
  context: StoreContext,
  fileId: string,
  snapshot: MainIntentSnapshot,
): void {
  const isActive = context.get().activeFileId === fileId;
  if (isActive && context.loads.mainIntentBelongsTo(fileId, snapshot)) {
    context.get().activateFile(fileId);
  }
}
