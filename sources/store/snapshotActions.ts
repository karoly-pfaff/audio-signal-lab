import type { SnapshotActions } from './audioLabStoreTypes';
import { releaseArtworkIfUnreferenced } from './artworkLifecycle';
import { activeFileIdForMainTrack } from './mainTrackLoadState';
import { pruneUnusedMedia } from './mediaRetention';
import { executeSnapshotApply } from './snapshotApplication';
import { buildSnapshot, MAX_NAME_LENGTH, MAX_SNAPSHOTS, type SessionSnapshot } from './snapshots';
import type { StoreContext } from './storeContext';

function applySnapshotState(snapshot: SessionSnapshot, context: StoreContext): string | null {
  const state = context.get();
  const snapshotFiles = new Map(snapshot.files.map((file) => [file.id, file]));
  state.files.forEach((file) => {
    const saved = snapshotFiles.get(file.id);
    if (
      !saved ||
      (file.loadingState !== 'loading' && saved.filename && saved.filename !== file.name)
    ) {
      context.loads.removeFile(file.id);
    }
  });
  const { files, mainPatch, transportPatch, annotationWarning, artworkUrlsToRelease } =
    executeSnapshotApply(snapshot, state.files, state.mainTrack);
  context.set((current) => ({
    activeFileId: activeFileIdForMainTrack(current.activeFileId, files, current.mainTrack),
    mainTrack: { ...current.mainTrack, ...mainPatch },
    transport: { ...current.transport, ...transportPatch },
    files,
  }));
  artworkUrlsToRelease.forEach((url) => releaseArtworkIfUnreferenced(url, context.get()));
  pruneUnusedMedia(context);
  return annotationWarning;
}

function createSaveSnapshot(context: StoreContext): SnapshotActions['saveSnapshot'] {
  return (name) => {
    const state = context.get();
    if (state.snapshots.length >= MAX_SNAPSHOTS) {
      context.status.show(`Snapshot limit reached (${MAX_SNAPSHOTS})`, 4000);
      return;
    }
    const snapshotName =
      name?.trim().slice(0, MAX_NAME_LENGTH) || `Snapshot ${state.snapshots.length + 1}`;
    const snapshot = buildSnapshot(state.mainTrack, state.transport, state.files, snapshotName);
    context.set((current) => ({ snapshots: [...current.snapshots, snapshot] }));
    context.status.show('Snapshot saved', 3000);
  };
}

function createRenameSnapshot(context: StoreContext): SnapshotActions['renameSnapshot'] {
  return (id, name) => {
    const trimmed = name.trim().slice(0, MAX_NAME_LENGTH);
    if (!trimmed) {
      return;
    }
    context.set((state) => ({
      snapshots: state.snapshots.map((snapshot) =>
        snapshot.id === id ? { ...snapshot, name: trimmed } : snapshot,
      ),
    }));
    context.status.show('Snapshot renamed', 2000);
  };
}

function createDuplicateSnapshot(context: StoreContext): SnapshotActions['duplicateSnapshot'] {
  return (id) => {
    const state = context.get();
    if (state.snapshots.length >= MAX_SNAPSHOTS) {
      context.status.show(`Snapshot limit reached (${MAX_SNAPSHOTS})`, 4000);
      return;
    }
    const original = state.snapshots.find((snapshot) => snapshot.id === id);
    if (!original) {
      return;
    }
    const copy: SessionSnapshot = {
      ...original,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name: `${original.name.slice(0, MAX_NAME_LENGTH - 7)} (copy)`.trim(),
      files: original.files.map((file) => ({ ...file })),
      main: {
        ...original.main,
        markers: (original.main.markers ?? []).map((marker) => ({ ...marker })),
      },
    };
    context.set((current) => ({ snapshots: [...current.snapshots, copy] }));
    context.status.show('Snapshot duplicated', 2000);
  };
}

function createAssignAB(context: StoreContext): SnapshotActions['assignAB'] {
  return (slot) => {
    const state = context.get();
    const snapshot = buildSnapshot(
      state.mainTrack,
      state.transport,
      state.files,
      slot.toUpperCase(),
    );
    context.set((current) => ({ ab: { ...current.ab, [slot]: snapshot } }));
    context.status.show(`Session state saved to ${slot.toUpperCase()}`, 2000);
  };
}

export function createSnapshotActions(context: StoreContext): SnapshotActions {
  return {
    saveSnapshot: createSaveSnapshot(context),
    applySnapshot: (id) => {
      const snapshot = context.get().snapshots.find((candidate) => candidate.id === id);
      if (snapshot) {
        const warning = applySnapshotState(snapshot, context);
        context.status.show(warning ?? 'Snapshot applied', warning ? 6000 : 4000);
      }
    },
    renameSnapshot: createRenameSnapshot(context),
    duplicateSnapshot: createDuplicateSnapshot(context),
    deleteSnapshot: (id) => {
      context.set((state) => ({
        snapshots: state.snapshots.filter((snapshot) => snapshot.id !== id),
      }));
      context.status.show('Snapshot deleted', 2000);
    },
    assignAB: createAssignAB(context),
    applyAB: (slot) => {
      const snapshot = context.get().ab[slot];
      if (snapshot) {
        const warning = applySnapshotState(snapshot, context);
        context.status.show(warning ?? `${slot.toUpperCase()} applied`, warning ? 6000 : 3000);
      }
    },
  };
}
