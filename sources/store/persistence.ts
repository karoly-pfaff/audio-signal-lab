import { type SessionSnapshot, type ABSlots, parseSnapshotList, parseABSlots } from './snapshots';
import {
  type BpmConfidence,
  type SelectionRange,
  type Marker,
  type FileIdentity,
} from '../audio/types';
import { parseMain, parsePersistedFile, parseTransport } from './persistenceParsing';
import { suffixedPortableIdentifier } from './portableSession';
import { MAX_FILE_COUNT } from './sessionLimits';

export { MAX_FILE_COUNT } from './sessionLimits';

const STORAGE_KEY = 'audio-signal-lab-session';
export const SCHEMA_VERSION = 4;

export interface PersistedFile {
  id: string;
  order: number;
  volume: number;
  filename: string | null;
  assetId?: string | null;
  thumbnailUrl: string | null;
  bpm: number | null;
  bpmConfidence: BpmConfidence | null;
  fileIdentity?: FileIdentity | null;
}

export interface PersistedSession {
  version: number;
  savedAt: string;
  main: {
    loop: boolean;
    volume: number;
    filename: string | null;
    assetId?: string | null;
    thumbnailUrl: string | null;
    bpm: number | null;
    bpmConfidence: BpmConfidence | null;
    selection: SelectionRange | null;
    markers: Marker[];
    fileIdentity?: FileIdentity | null;
  };
  files: PersistedFile[];
  transport: {
    masterVolume: number;
    masterMuted: boolean;
  };
  snapshots: SessionSnapshot[];
  ab: ABSlots;
}

export const FILE_COUNT = 5;

export function generateFileId(): string {
  return `file-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

export function defaultSession(): PersistedSession {
  return {
    version: SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    main: {
      loop: false,
      volume: 0.8,
      filename: null,
      assetId: null,
      thumbnailUrl: null,
      bpm: null,
      bpmConfidence: null,
      selection: null,
      markers: [],
      fileIdentity: null,
    },
    files: [],
    transport: { masterVolume: 0.8, masterMuted: false },
    snapshots: [],
    ab: { a: null, b: null },
  };
}

export function parseSessionBody(p: Record<string, unknown>): PersistedSession {
  const def = defaultSession();
  // Accept both 'files' (new) and 'layers' (old JSON key) for backward compat
  const rawFiles: unknown[] = Array.isArray(p['files'])
    ? (p['files'] as unknown[])
    : Array.isArray(p['layers'])
      ? (p['layers'] as unknown[])
      : [];

  const usedIds = new Set<string>();
  const files: PersistedFile[] = rawFiles.slice(0, MAX_FILE_COUNT).map((raw, i) => {
    const fallback: PersistedFile = {
      id: `file-${i}`,
      order: i,
      volume: 1,
      filename: null,
      assetId: null,
      thumbnailUrl: null,
      bpm: null,
      bpmConfidence: null,
    };
    const parsed = parsePersistedFile(raw, fallback);
    let id = parsed.id;
    let suffix = i;
    while (usedIds.has(id)) {
      id = suffixedPortableIdentifier(parsed.id, suffix++);
    }
    usedIds.add(id);
    return { ...parsed, id };
  });

  return {
    version: SCHEMA_VERSION,
    savedAt: typeof p['savedAt'] === 'string' ? p['savedAt'] : def.savedAt,
    main: parseMain(p['main'], def.main),
    files,
    transport: parseTransport(p['transport'], def.transport),
    snapshots: parseSnapshotList(p['snapshots']),
    ab: parseABSlots(p['ab']),
  };
}

export function loadSession(): PersistedSession {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultSession();
    }

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return defaultSession();
    }

    const p = parsed as Record<string, unknown>;
    const version = p['version'];

    // Older sessions get newer optional fields defaulted by parseSessionBody.
    if (version === 1 || version === 2 || version === 3 || version === 4) {
      return parseSessionBody(p);
    }

    return defaultSession();
  } catch {
    return defaultSession();
  }
}

export function saveSession(session: PersistedSession): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

export function clearSession(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
