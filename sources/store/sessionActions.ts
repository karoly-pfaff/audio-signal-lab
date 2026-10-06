import { audioEngine } from '../audio/AudioEngine';
import { downloadReportJson, downloadReportMarkdown } from '../utils/reportDownload';
import { buildAnalysisReport } from '../utils/reportExport';
import type { SessionActions } from './audioLabStoreTypes';
import { releaseAllArtwork } from './artworkLifecycle';
import { pruneUnusedMedia } from './mediaRetention';
import { clearStoredAudio } from './mediaStorage';
import { clearSession, defaultSession } from './persistence';
import { MAX_PORTABLE_SESSION_BYTES, utf8ByteLength } from './portableSession';
import { downloadPreset, parsePreset, serializePreset } from './presets';
import type { StoreContext } from './storeContext';

import {
  applySessionSettingsToEngine,
  buildPersistedSession,
  createEmptyMainTrack,
  fileStateFromPersisted,
  mainStateFromPersisted,
} from './storeState';

function cleanupCurrentAudio(context: StoreContext): void {
  const state = context.get();
  releaseAllArtwork(state);
  state.files.forEach((file) => {
    audioEngine.removeFileBuffer(file.id);
  });
  audioEngine.stop();
  audioEngine.clearMainBuffer();
  audioEngine.setMainLoopPoints(0, 0);
}

interface SessionOperations {
  next: () => number;
  isCurrent: (generation: number) => boolean;
}

function createResetSession(
  context: StoreContext,
  operations: SessionOperations,
): SessionActions['resetSession'] {
  return () => {
    operations.next();
    context.loads.reset();
    cleanupCurrentAudio(context);
    const session = defaultSession();
    applySessionSettingsToEngine(session);
    context.set({
      mainTrack: createEmptyMainTrack(session.main),
      files: [],
      transport: {
        playing: false,
        masterVolume: session.transport.masterVolume,
        masterMuted: session.transport.masterMuted,
      },
      snapshots: [],
      ab: { a: null, b: null },
      activeFileId: null,
    });
    return clearStoredAudio().then((mediaCleared) => {
      const sessionCleared = clearSession();
      context.status.show(
        mediaCleared && sessionCleared
          ? 'Session reset'
          : 'Session reset in memory, but stored data could not be fully cleared',
        5000,
      );
    });
  };
}

function createImportPreset(
  context: StoreContext,
  operations: SessionOperations,
): SessionActions['importPreset'] {
  return async (file) => {
    const generation = operations.next();
    try {
      if (file.size > MAX_PORTABLE_SESSION_BYTES) {
        throw new Error('Preset is too large');
      }
      const text = await file.text();
      if (utf8ByteLength(text) > MAX_PORTABLE_SESSION_BYTES) {
        throw new Error('Preset is too large');
      }
      if (!operations.isCurrent(generation)) {
        return;
      }
      const raw: unknown = JSON.parse(text);
      const session = parsePreset(raw);
      context.loads.reset();
      cleanupCurrentAudio(context);
      applySessionSettingsToEngine(session);
      const hasSnapshots = Boolean(session.snapshots.length || session.ab.a || session.ab.b);
      context.set({
        mainTrack: mainStateFromPersisted(session),
        files: session.files.map(fileStateFromPersisted),
        transport: {
          playing: false,
          masterVolume: session.transport.masterVolume,
          masterMuted: session.transport.masterMuted,
        },
        snapshots: session.snapshots,
        ab: session.ab,
        activeFileId: null,
      });
      pruneUnusedMedia(context);
      context.status.show(
        hasSnapshots
          ? 'Session imported with snapshots — reload audio files to play'
          : 'Session imported — reload audio files to play',
        5000,
      );
    } catch {
      if (operations.isCurrent(generation)) {
        context.status.show('Invalid session file', 4000);
      }
    }
  };
}

export function createSessionActions(context: StoreContext): SessionActions {
  let sessionGeneration = 0;
  const operations: SessionOperations = {
    next: () => ++sessionGeneration,
    isCurrent: (generation) => generation === sessionGeneration,
  };
  return {
    resetSession: createResetSession(context, operations),
    exportPreset: () => {
      try {
        downloadPreset(serializePreset(buildPersistedSession(context.get())));
        context.status.show('Session exported', 3000);
      } catch {
        context.status.show('Session is too large to export', 5000);
      }
    },
    importPreset: createImportPreset(context, operations),
    exportReportMarkdown: () => {
      const { mainTrack } = context.get();
      downloadReportMarkdown(buildAnalysisReport({ mainTrack }), mainTrack.name || null);
      context.status.show('Markdown report exported', 3000);
    },
    exportReportJson: () => {
      const { mainTrack } = context.get();
      try {
        downloadReportJson(buildAnalysisReport({ mainTrack }), mainTrack.name || null);
        context.status.show('Report created', 3000);
      } catch {
        context.status.show('Could not create report', 3000);
      }
    },
  };
}
