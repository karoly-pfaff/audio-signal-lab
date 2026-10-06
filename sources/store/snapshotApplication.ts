import { audioEngine } from '../audio/AudioEngine';
import type { FileState, MainTrackState, TrackLoadingState, TransportState } from '../audio/types';
import type { SessionSnapshot } from './snapshots';
import { isLoopableSelection } from '../utils/selectionUtils';
import { reconcileAnnotationsForDuration } from '../utils/annotationReconciliation';
import { compareFileIdentity } from '../utils/fileIdentity';

export interface SnapshotApplication {
  files: FileState[];
  mainPatch: Partial<MainTrackState>;
  transportPatch: Partial<TransportState>;
  annotationWarning: string | null;
  artworkUrlsToRelease: string[];
}

interface SnapshotAnnotations {
  selection: MainTrackState['selection'];
  markers: MainTrackState['markers'];
  warning: string | null;
}

function snapshotMatchesMain(snapshot: SessionSnapshot, current: MainTrackState): boolean {
  if ((snapshot.main.filename ?? '') !== current.name) {
    return false;
  }
  if (!snapshot.main.fileIdentity || !current.fileIdentity) {
    return false;
  }
  return compareFileIdentity(current.fileIdentity, snapshot.main.fileIdentity) === 'likely';
}

function snapshotAnnotations(
  snapshot: SessionSnapshot,
  current: MainTrackState,
): SnapshotAnnotations {
  const selection = snapshot.main.selection ?? null;
  const markers = snapshot.main.markers ?? [];
  if (!selection && markers.length === 0) {
    return { selection: null, markers: [], warning: null };
  }
  if (!snapshotMatchesMain(snapshot, current)) {
    return {
      selection: null,
      markers: [],
      warning: 'Snapshot settings applied; annotations belong to a different audio file.',
    };
  }
  const duration = current.buffer?.duration ?? current.fileIdentity?.durationSeconds ?? 0;
  const reconciled = reconcileAnnotationsForDuration(selection, markers, duration);
  const changed = reconciled.droppedCount > 0 || reconciled.adjustedCount > 0;
  return {
    selection: reconciled.selection,
    markers: reconciled.markers,
    warning: changed ? 'Snapshot annotations were adjusted to the current audio duration.' : null,
  };
}

interface RestoredSnapshotFile {
  file: FileState;
  artworkUrlToRelease: string | null;
}

function createSnapshotFile(snapshotFile: SessionSnapshot['files'][number]): FileState {
  return {
    id: snapshotFile.id,
    order: snapshotFile.order,
    name: snapshotFile.filename ?? '',
    assetId: null,
    buffer: null,
    volume: snapshotFile.volume,
    loop: false,
    thumbnailUrl: snapshotFile.thumbnailUrl,
    loadingState: (snapshotFile.filename ? 'remembered' : 'empty') as TrackLoadingState,
    metadata: null,
    bpm: snapshotFile.bpm ?? null,
    bpmConfidence: snapshotFile.bpmConfidence ?? null,
  };
}

function restoreSnapshotFile(
  snapshotFile: SessionSnapshot['files'][number],
  existing: FileState | undefined,
): RestoredSnapshotFile {
  if (!existing) {
    return { file: createSnapshotFile(snapshotFile), artworkUrlToRelease: null };
  }
  const referencesDifferentFile =
    snapshotFile.filename &&
    snapshotFile.filename !== existing.name &&
    existing.loadingState !== 'loading';
  if (!referencesDifferentFile) {
    return {
      file: { ...existing, order: snapshotFile.order, volume: snapshotFile.volume },
      artworkUrlToRelease: null,
    };
  }

  audioEngine.removeFileBuffer(existing.id);
  return {
    file: {
      ...existing,
      order: snapshotFile.order,
      volume: snapshotFile.volume,
      name: snapshotFile.filename ?? '',
      assetId: null,
      thumbnailUrl: snapshotFile.thumbnailUrl,
      loadingState: 'remembered',
      buffer: null,
      metadata: null,
      bpm: snapshotFile.bpm ?? null,
      bpmConfidence: snapshotFile.bpmConfidence ?? null,
    },
    artworkUrlToRelease: existing.thumbnailUrl,
  };
}

function applySnapshotEngine(snapshot: SessionSnapshot, annotations: SnapshotAnnotations): void {
  audioEngine.stop();
  audioEngine.setMasterVolume(snapshot.masterVolume);
  audioEngine.setMasterMute(snapshot.masterMuted);
  audioEngine.setMainVolume(snapshot.main.volume);
  audioEngine.setMainLoop(snapshot.main.loop);
  const selection = annotations.selection;
  if (snapshot.main.loop && selection && isLoopableSelection(selection)) {
    audioEngine.setMainLoopPoints(selection.startSeconds, selection.endSeconds);
  } else {
    audioEngine.setMainLoopPoints(0, 0);
  }
}

function releasedArtworkUrls(
  currentFiles: FileState[],
  snapshotIds: Set<string>,
  restoredFiles: RestoredSnapshotFile[],
): string[] {
  const candidates = currentFiles
    .filter((file) => !snapshotIds.has(file.id))
    .map((file) => file.thumbnailUrl)
    .concat(restoredFiles.map((restored) => restored.artworkUrlToRelease));
  return Array.from(new Set(candidates.filter((url): url is string => Boolean(url))));
}

export function executeSnapshotApply(
  snapshot: SessionSnapshot,
  currentFiles: FileState[],
  currentMain: MainTrackState,
): SnapshotApplication {
  const annotations = snapshotAnnotations(snapshot, currentMain);
  applySnapshotEngine(snapshot, annotations);
  const snapshotIds = new Set(snapshot.files.map((file) => file.id));
  const currentById = new Map(currentFiles.map((file) => [file.id, file]));
  for (const file of currentFiles) {
    if (!snapshotIds.has(file.id)) {
      audioEngine.removeFileBuffer(file.id);
    }
  }
  snapshot.files.forEach((file) => audioEngine.setFileVolume(file.id, file.volume));
  const restoredFiles = snapshot.files.map((file) =>
    restoreSnapshotFile(file, currentById.get(file.id)),
  );
  const files = restoredFiles.map((restored) => restored.file);
  const artworkUrlsToRelease = releasedArtworkUrls(currentFiles, snapshotIds, restoredFiles);

  return {
    files,
    mainPatch: {
      volume: snapshot.main.volume,
      loop: snapshot.main.loop,
      selection: annotations.selection,
      markers: annotations.markers,
    },
    transportPatch: {
      playing: false,
      masterVolume: snapshot.masterVolume,
      masterMuted: snapshot.masterMuted,
    },
    annotationWarning: annotations.warning,
    artworkUrlsToRelease,
  };
}
