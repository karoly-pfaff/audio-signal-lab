import { MAX_FILE_COUNT, parseSessionBody, type PersistedSession } from './persistence';
import { portableJsonBlob } from './portableSession';
import { validatePresetStructure } from './presetValidation';
import { type SessionSnapshot, type ABSlots, parseSnapshotList, parseABSlots } from './snapshots';

export const PRESET_SCHEMA = 'audio-signal-lab-session';
const SUPPORTED_VERSIONS = [1, 2, 3, 4];

export interface PresetData {
  schema: string;
  version: number;
  exportedAt: string;
  main: PersistedSession['main'];
  files: PersistedSession['files'];
  transport: PersistedSession['transport'];
  snapshots: SessionSnapshot[];
  ab: ABSlots;
}

function portableSnapshot(snapshot: SessionSnapshot): SessionSnapshot {
  return {
    ...snapshot,
    main: {
      ...snapshot.main,
      thumbnailUrl: null,
      markers: snapshot.main.markers?.map((marker) => ({ ...marker })),
    },
    files: snapshot.files.map((file) => ({ ...file, thumbnailUrl: null })),
  };
}

export function serializePreset(session: PersistedSession, exportedAt?: string): PresetData {
  return {
    schema: PRESET_SCHEMA,
    version: session.version,
    exportedAt: exportedAt ?? new Date().toISOString(),
    main: { ...session.main, assetId: null, thumbnailUrl: null },
    files: session.files.map((file) => ({ ...file, assetId: null, thumbnailUrl: null })),
    transport: { ...session.transport },
    snapshots: session.snapshots.map(portableSnapshot),
    ab: {
      a: session.ab.a ? portableSnapshot(session.ab.a) : null,
      b: session.ab.b ? portableSnapshot(session.ab.b) : null,
    },
  };
}

export function isPresetLike(raw: unknown): boolean {
  if (typeof raw !== 'object' || raw === null) {
    return false;
  }
  const p = raw as Record<string, unknown>;
  return p['schema'] === PRESET_SCHEMA && typeof p['version'] === 'number';
}

export function parsePreset(raw: unknown): PersistedSession {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Invalid preset: not an object');
  }
  const p = raw as Record<string, unknown>;
  if (p['schema'] !== PRESET_SCHEMA) {
    throw new Error('Invalid preset: unrecognized schema');
  }
  const version = p['version'];
  if (typeof version !== 'number' || !SUPPORTED_VERSIONS.includes(version)) {
    throw new Error(`Invalid preset: unsupported version`);
  }
  validatePresetStructure(p, MAX_FILE_COUNT);
  // parseSessionBody handles both v1 (no snapshots/ab → empty defaults) and v2
  const session = parseSessionBody(p);
  // v1 presets may carry snapshots/ab from PresetData even though version=1;
  // parseSessionBody already defaulted these, but honour them if present
  if (version === 1) {
    session.snapshots = parseSnapshotList(p['snapshots']);
    session.ab = parseABSlots(p['ab']);
  }
  session.main.assetId = null;
  session.files = session.files.map((file) => ({ ...file, assetId: null }));
  return session;
}

export function downloadPreset(preset: PresetData): void {
  const blob = portableJsonBlob(preset);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `audio-signal-lab-session-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
