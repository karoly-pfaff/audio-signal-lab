import type { FileState, MainTrackState, TransportState } from '../audio/types';
import { audioEngine } from '../audio/AudioEngine';
import { persistableUrl } from '../utils/urlUtils';
import type { AudioLabState } from './audioLabStoreTypes';
import { SCHEMA_VERSION, type PersistedFile, type PersistedSession } from './persistence';
import type { ABSlots, SessionSnapshot } from './snapshots';

interface MainTrackDefaults {
  volume: number;
  loop: boolean;
}

export interface AudioLabData {
  mainTrack: MainTrackState;
  files: FileState[];
  transport: TransportState;
  snapshots: SessionSnapshot[];
  ab: ABSlots;
  activeFileId: string | null;
  statusMessage: string | null;
}

export function createEmptyMainTrack({ volume, loop }: MainTrackDefaults): MainTrackState {
  return {
    id: 'main',
    name: '',
    assetId: null,
    buffer: null,
    volume,
    loop,
    thumbnailUrl: null,
    loadingState: 'empty',
    metadata: null,
    analysis: null,
    bpm: null,
    bpmConfidence: null,
    bpmAnalyzing: false,
    selection: null,
    markers: [],
    fileIdentity: null,
  };
}

export function createEmptyFile(order: number, id = `file-${order}`): FileState {
  return {
    id,
    name: '',
    assetId: null,
    buffer: null,
    volume: 1,
    loop: false,
    thumbnailUrl: null,
    order,
    loadingState: 'empty',
    metadata: null,
    fileIdentity: null,
  };
}

export function fileStateFromPersisted(file: PersistedFile): FileState {
  return {
    id: file.id,
    name: file.filename ?? '',
    assetId: file.assetId ?? null,
    buffer: null,
    volume: file.volume,
    loop: false,
    thumbnailUrl: file.thumbnailUrl,
    loadingState: file.filename ? 'remembered' : 'empty',
    metadata: null,
    order: file.order,
    bpm: file.bpm ?? null,
    bpmConfidence: file.bpmConfidence ?? null,
    fileIdentity: file.fileIdentity ?? null,
  };
}

export function mainStateFromPersisted(session: PersistedSession): MainTrackState {
  return {
    ...createEmptyMainTrack(session.main),
    name: session.main.filename ?? '',
    assetId: session.main.assetId ?? null,
    thumbnailUrl: session.main.thumbnailUrl,
    loadingState: session.main.filename ? 'remembered' : 'empty',
    bpm: session.main.bpm,
    bpmConfidence: session.main.bpmConfidence,
    selection: session.main.selection,
    markers: session.main.markers,
    fileIdentity: session.main.fileIdentity ?? null,
  };
}

export function applySessionSettingsToEngine(session: PersistedSession): void {
  audioEngine.setMainVolume(session.main.volume);
  audioEngine.setMainLoop(session.main.loop);
  audioEngine.setMasterVolume(session.transport.masterVolume);
  audioEngine.setMasterMute(session.transport.masterMuted);
}

export function createInitialData(session: PersistedSession): AudioLabData {
  return {
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
    statusMessage: null,
  };
}

export function buildPersistedSession(state: AudioLabState): PersistedSession {
  return {
    version: SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    main: {
      loop: state.mainTrack.loop,
      volume: state.mainTrack.volume,
      filename: state.mainTrack.name || null,
      assetId: state.mainTrack.assetId ?? null,
      thumbnailUrl: persistableUrl(state.mainTrack.thumbnailUrl),
      bpm: state.mainTrack.bpm ?? null,
      bpmConfidence: state.mainTrack.bpmConfidence ?? null,
      selection: state.mainTrack.selection,
      markers: state.mainTrack.markers,
      fileIdentity: state.mainTrack.fileIdentity ?? null,
    },
    files: state.files.map((file) => ({
      id: file.id,
      order: file.order,
      volume: file.volume,
      filename: file.name || null,
      assetId: file.assetId ?? null,
      thumbnailUrl: persistableUrl(file.thumbnailUrl),
      bpm: file.bpm ?? null,
      bpmConfidence: file.bpmConfidence ?? null,
      fileIdentity: file.fileIdentity ?? null,
    })),
    transport: {
      masterVolume: state.transport.masterVolume,
      masterMuted: state.transport.masterMuted,
    },
    snapshots: state.snapshots,
    ab: state.ab,
  };
}
