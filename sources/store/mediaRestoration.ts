import { loadAudioFile } from './mediaStorage';
import type { StoreContext } from './storeContext';

function clearMissingMain(context: StoreContext): void {
  context.set((state) => ({
    mainTrack: { ...state.mainTrack, assetId: null, loadingState: 'remembered' },
  }));
  context.status.show('Saved audio is unavailable — reload the file to play', 5000);
}

async function restoreMain(context: StoreContext): Promise<void> {
  const { assetId, buffer, name, loadingState, fileIdentity } = context.get().mainTrack;
  if (!assetId || buffer || loadingState !== 'remembered') {
    return;
  }
  const file = await loadAudioFile(assetId, {
    name,
    lastModified: fileIdentity?.lastModified ?? 0,
  });
  const current = context.get().mainTrack;
  if (current.assetId !== assetId || current.buffer || current.loadingState !== 'remembered') {
    return;
  }
  if (!file) {
    clearMissingMain(context);
    return;
  }
  await context.get().loadMainTrack(file);
}

function clearMissingFile(context: StoreContext, fileId: string, assetId: string): void {
  context.set((state) => ({
    files: state.files.map((file) =>
      file.id === fileId && file.assetId === assetId
        ? { ...file, assetId: null, loadingState: 'remembered' as const }
        : file,
    ),
  }));
  context.status.show('Some saved audio is unavailable — reload the file to play', 5000);
}

async function restoreFile(context: StoreContext, fileId: string, assetId: string): Promise<void> {
  const stored = context.get().files.find((file) => file.id === fileId);
  if (
    !stored ||
    stored.buffer ||
    stored.assetId !== assetId ||
    stored.loadingState !== 'remembered'
  ) {
    return;
  }
  const file = await loadAudioFile(assetId, {
    name: stored.name,
    lastModified: stored.fileIdentity?.lastModified ?? 0,
  });
  const current = context.get().files.find((candidate) => candidate.id === fileId);
  if (
    !current ||
    current.buffer ||
    current.assetId !== assetId ||
    current.loadingState !== 'remembered'
  ) {
    return;
  }
  if (!file) {
    clearMissingFile(context, fileId, assetId);
    return;
  }
  await context.get().loadFile(fileId, file);
}

export async function restoreStoredAudio(context: StoreContext): Promise<void> {
  const files = context
    .get()
    .files.filter((file) => file.assetId)
    .map((file) => restoreFile(context, file.id, file.assetId as string));
  await Promise.all([restoreMain(context), ...files]);
}
