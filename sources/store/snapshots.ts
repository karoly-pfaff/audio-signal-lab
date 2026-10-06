import { parseBpmConfidence } from '../audio/types';
import type { MainTrackState, FileState, TransportState } from '../audio/types';
import { persistableUrl } from '../utils/urlUtils';
import { parseFileIdentity, parseMarkers, parseSelection } from './persistenceParsing';
import {
  portableFilename,
  portableIdentifier,
  portableTimestamp,
  suffixedPortableIdentifier,
} from './portableSession';
import { MAX_FILE_COUNT, MAX_SNAPSHOTS, MAX_SNAPSHOT_NAME_LENGTH } from './sessionLimits';
import type { ABSlots, SessionSnapshot, SnapshotFile } from './snapshotTypes';
export type { ABSlots, SessionSnapshot } from './snapshotTypes';
export { MAX_SNAPSHOTS } from './sessionLimits';
export const MAX_NAME_LENGTH = MAX_SNAPSHOT_NAME_LENGTH;
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function finiteClamped(raw: unknown, fallback: number): number {
  return typeof raw === 'number' && Number.isFinite(raw) ? clamp(raw, 0, 1) : fallback;
}

function finiteBpm(raw: unknown): number | null {
  return typeof raw === 'number' && Number.isFinite(raw) && raw >= 20 && raw <= 400 ? raw : null;
}
function generateSnapshotId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function buildSnapshot(
  main: Pick<
    MainTrackState,
    'volume' | 'loop' | 'name' | 'thumbnailUrl' | 'bpm' | 'bpmConfidence'
  > &
    Partial<Pick<MainTrackState, 'selection' | 'markers' | 'fileIdentity'>>,
  transport: Pick<TransportState, 'masterVolume' | 'masterMuted'>,
  files: FileState[],
  name: string,
): SessionSnapshot {
  return {
    id: generateSnapshotId(),
    name: name.slice(0, MAX_NAME_LENGTH),
    createdAt: new Date().toISOString(),
    main: {
      volume: main.volume,
      loop: main.loop,
      filename: main.name || null,
      thumbnailUrl: persistableUrl(main.thumbnailUrl),
      bpm: main.bpm ?? null,
      bpmConfidence: main.bpmConfidence ?? null,
      selection: main.selection ? { ...main.selection } : null,
      markers: (main.markers ?? []).map((marker) => ({ ...marker })),
      fileIdentity: main.fileIdentity ? { ...main.fileIdentity } : null,
    },
    masterVolume: transport.masterVolume,
    masterMuted: transport.masterMuted,
    files: files.map((f) => ({
      id: f.id,
      order: f.order,
      volume: f.volume,
      filename: f.name || null,
      thumbnailUrl: persistableUrl(f.thumbnailUrl),
      bpm: f.bpm ?? null,
      bpmConfidence: f.bpmConfidence ?? null,
    })),
  };
}

// orderIndex is the fallback position used when the raw data has no id/order/slot.
function parseSnapshotFile(raw: unknown, orderIndex: number): SnapshotFile {
  const def: SnapshotFile = {
    id: `file-${orderIndex}`,
    order: orderIndex,
    volume: 1,
    filename: null,
    thumbnailUrl: null,
    bpm: null,
    bpmConfidence: null,
  };
  if (typeof raw !== 'object' || raw === null) {
    return def;
  }
  const r = raw as Record<string, unknown>;
  // Backward compat: old snapshots have slot instead of id/order
  const rawSlot = validOrder(r['slot']) ? r['slot'] : orderIndex;
  const rawId = portableIdentifier(r['id']) ?? '';
  const id = rawId || `file-${rawSlot}`;
  const order = validOrder(r['order']) ? r['order'] : rawSlot;
  return {
    id,
    order,
    volume: finiteClamped(r['volume'], def.volume),
    filename: portableFilename(r['filename']),
    thumbnailUrl: typeof r['thumbnailUrl'] === 'string' ? persistableUrl(r['thumbnailUrl']) : null,
    bpm: finiteBpm(r['bpm']),
    bpmConfidence: parseBpmConfidence(r['bpmConfidence']),
  };
}

function validOrder(raw: unknown): raw is number {
  return typeof raw === 'number' && Number.isSafeInteger(raw) && raw >= 0;
}

function parseSnapshotFiles(rawFiles: unknown[]): SnapshotFile[] {
  const files: SnapshotFile[] = [];
  const usedIds = new Set<string>();
  rawFiles.slice(0, MAX_FILE_COUNT).forEach((rawFile, index) => {
    const parsed = parseSnapshotFile(rawFile, index);
    let id = parsed.id;
    let suffix = 1;
    while (usedIds.has(id)) {
      id = suffixedPortableIdentifier(parsed.id, suffix++);
    }
    usedIds.add(id);
    files.push({ ...parsed, id });
  });
  return files;
}

function parseSnapshotMain(raw: unknown): SessionSnapshot['main'] {
  const def = {
    volume: 0.8,
    loop: false,
    filename: null,
    thumbnailUrl: null,
    bpm: null,
    bpmConfidence: null,
    selection: null,
    markers: [],
  } as SessionSnapshot['main'];
  if (typeof raw !== 'object' || raw === null) {
    return def;
  }
  const r = raw as Record<string, unknown>;
  return {
    volume: finiteClamped(r['volume'], def.volume),
    loop: typeof r['loop'] === 'boolean' ? r['loop'] : def.loop,
    filename: portableFilename(r['filename']),
    thumbnailUrl: typeof r['thumbnailUrl'] === 'string' ? persistableUrl(r['thumbnailUrl']) : null,
    bpm: finiteBpm(r['bpm']),
    bpmConfidence: parseBpmConfidence(r['bpmConfidence']),
    selection: parseSelection(r['selection']),
    markers: parseMarkers(r['markers']),
    fileIdentity: parseFileIdentity(r['fileIdentity']),
  };
}

export function parseSnapshot(raw: unknown): SessionSnapshot | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const r = raw as Record<string, unknown>;

  const id = portableIdentifier(r['id']) || generateSnapshotId();
  const name = typeof r['name'] === 'string' ? r['name'].slice(0, MAX_NAME_LENGTH) : 'Snapshot';
  const createdAt = portableTimestamp(r['createdAt']) ?? new Date().toISOString();
  const masterVolume = finiteClamped(r['masterVolume'], 0.8);
  const masterMuted = typeof r['masterMuted'] === 'boolean' ? r['masterMuted'] : false;

  // Accept both 'files' (new) and 'layers' (old JSON key) for backward compat
  const rawFiles: unknown[] = Array.isArray(r['files'])
    ? r['files']
    : Array.isArray(r['layers'])
      ? r['layers']
      : [];

  const files = parseSnapshotFiles(rawFiles);

  return {
    id,
    name,
    createdAt,
    main: parseSnapshotMain(r['main']),
    masterVolume,
    masterMuted,
    files,
  };
}

export function parseSnapshotList(raw: unknown): SessionSnapshot[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const results: SessionSnapshot[] = [];
  const ids = new Set<string>();
  for (const item of raw) {
    if (results.length >= MAX_SNAPSHOTS) {
      break;
    }
    const parsed = parseSnapshot(item);
    if (parsed !== null) {
      let id = parsed.id;
      let suffix = 1;
      while (ids.has(id)) {
        id = suffixedPortableIdentifier(parsed.id, suffix++);
      }
      ids.add(id);
      results.push({ ...parsed, id });
    }
  }
  return results;
}

export function parseABSlots(raw: unknown): ABSlots {
  if (typeof raw !== 'object' || raw === null) {
    return { a: null, b: null };
  }
  const r = raw as Record<string, unknown>;
  return {
    a: r['a'] !== null && r['a'] !== undefined ? parseSnapshot(r['a']) : null,
    b: r['b'] !== null && r['b'] !== undefined ? parseSnapshot(r['b']) : null,
  };
}
