import {
  parseBpmConfidence,
  type FileIdentity,
  type Marker,
  type SelectionRange,
} from '../audio/types';
import { persistableUrl } from '../utils/urlUtils';
import { MAX_MARKER_LABEL_LENGTH } from '../utils/markerUtils';
import type { PersistedFile, PersistedSession } from './persistence';
import {
  isPortableText,
  MAX_PORTABLE_FILENAME_LENGTH,
  MAX_PORTABLE_HASH_LENGTH,
  MAX_PORTABLE_IDENTIFIER_LENGTH,
  MAX_PORTABLE_TIME_SECONDS,
} from './portableSession';
import { MAX_MARKERS } from './sessionLimits';

const ASSET_ID_PATTERN = /^sha256-[a-f0-9]{64}$/;

function asRecord(raw: unknown): Record<string, unknown> | null {
  return typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : null;
}

function finiteNumber(raw: unknown, minimum: number, inclusive = true): number | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return null;
  }
  if (inclusive ? raw < minimum : raw <= minimum) {
    return null;
  }
  return raw;
}

function boundedNumber(raw: unknown, minimum: number, maximum: number): number | null {
  const value = finiteNumber(raw, minimum);
  return value !== null && value <= maximum ? value : null;
}

function nonEmptyString(raw: unknown, maximumLength: number): string | null {
  return isPortableText(raw, maximumLength) && raw.length > 0 ? raw : null;
}

function optionalString(raw: unknown, maximumLength: number): string | null {
  return isPortableText(raw, maximumLength) ? raw : null;
}

function parseAssetId(raw: unknown): string | null {
  return typeof raw === 'string' && ASSET_ID_PATTERN.test(raw) ? raw : null;
}

export function parseSelection(raw: unknown): SelectionRange | null {
  const record = asRecord(raw);
  if (!record) {
    return null;
  }
  const start = boundedNumber(record['startSeconds'], 0, MAX_PORTABLE_TIME_SECONDS);
  const end = boundedNumber(record['endSeconds'], 0, MAX_PORTABLE_TIME_SECONDS);
  return start !== null && end !== null && end > start
    ? { startSeconds: start, endSeconds: end }
    : null;
}

export function parseMarkers(raw: unknown): Marker[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const ids = new Set<string>();
  return raw
    .slice(0, MAX_MARKERS)
    .map(parseMarker)
    .filter((marker): marker is Marker => {
      if (!marker || ids.has(marker.id)) {
        return false;
      }
      ids.add(marker.id);
      return true;
    });
}

function parseMarker(raw: unknown): Marker | null {
  const record = asRecord(raw);
  if (!record) {
    return null;
  }
  const id = nonEmptyString(record['id'], MAX_PORTABLE_IDENTIFIER_LENGTH);
  const type = record['type'];
  const startSeconds = boundedNumber(record['startSeconds'], 0, MAX_PORTABLE_TIME_SECONDS);
  if (!id || (type !== 'point' && type !== 'range') || startSeconds === null) {
    return null;
  }
  const createdAt = finiteNumber(record['createdAt'], 0) ?? Date.now();
  const label = (typeof record['label'] === 'string' ? record['label'] : '').slice(
    0,
    MAX_MARKER_LABEL_LENGTH,
  );
  if (type === 'range') {
    const endSeconds = boundedNumber(record['endSeconds'], 0, MAX_PORTABLE_TIME_SECONDS);
    return endSeconds === null || endSeconds <= startSeconds
      ? null
      : { id, type, startSeconds, endSeconds, label, createdAt };
  }
  return { id, type, startSeconds, label, createdAt };
}

export function parseFileIdentity(raw: unknown): FileIdentity | null {
  const record = asRecord(raw);
  if (!record) {
    return null;
  }
  const name = nonEmptyString(record['name'], MAX_PORTABLE_FILENAME_LENGTH);
  const size = finiteNumber(record['size'], 0);
  const lastModified = finiteNumber(record['lastModified'], 0);
  const durationSeconds = finiteNumber(record['durationSeconds'], 0, false);
  const sampleRate = finiteNumber(record['sampleRate'], 0, false);
  const channelCount = finiteNumber(record['channelCount'], 0, false);
  if (
    !name ||
    size === null ||
    lastModified === null ||
    durationSeconds === null ||
    sampleRate === null ||
    channelCount === null
  ) {
    return null;
  }
  const quickHash = isPortableText(record['quickHash'], MAX_PORTABLE_HASH_LENGTH)
    ? record['quickHash']
    : undefined;
  return { name, size, lastModified, durationSeconds, sampleRate, channelCount, quickHash };
}

export function parseMain(
  raw: unknown,
  defaults: PersistedSession['main'],
): PersistedSession['main'] {
  const record = asRecord(raw);
  if (!record) {
    return defaults;
  }
  return {
    loop: typeof record['loop'] === 'boolean' ? record['loop'] : defaults.loop,
    volume: boundedNumber(record['volume'], 0, 1) ?? defaults.volume,
    filename: optionalString(record['filename'], MAX_PORTABLE_FILENAME_LENGTH),
    assetId: parseAssetId(record['assetId']),
    thumbnailUrl: persistableUrl(
      typeof record['thumbnailUrl'] === 'string' ? record['thumbnailUrl'] : null,
    ),
    bpm: boundedNumber(record['bpm'], 20, 400),
    bpmConfidence: parseBpmConfidence(record['bpmConfidence']),
    selection: parseSelection(record['selection']),
    markers: parseMarkers(record['markers']),
    fileIdentity: parseFileIdentity(record['fileIdentity']),
  };
}

export function parseTransport(
  raw: unknown,
  defaults: PersistedSession['transport'],
): PersistedSession['transport'] {
  const record = asRecord(raw);
  if (!record) {
    return defaults;
  }
  return {
    masterVolume: boundedNumber(record['masterVolume'], 0, 1) ?? defaults.masterVolume,
    masterMuted:
      typeof record['masterMuted'] === 'boolean' ? record['masterMuted'] : defaults.masterMuted,
  };
}

export function parsePersistedFile(raw: unknown, defaults: PersistedFile): PersistedFile {
  const record = asRecord(raw);
  if (!record) {
    return defaults;
  }
  const slot = finiteNumber(record['slot'], 0) ?? defaults.order;
  const order = finiteNumber(record['order'], 0) ?? slot;
  return {
    id: nonEmptyString(record['id'], MAX_PORTABLE_IDENTIFIER_LENGTH) ?? `file-${slot}`,
    order,
    volume: boundedNumber(record['volume'], 0, 1) ?? defaults.volume,
    filename: optionalString(record['filename'], MAX_PORTABLE_FILENAME_LENGTH),
    assetId: parseAssetId(record['assetId']),
    thumbnailUrl: persistableUrl(
      typeof record['thumbnailUrl'] === 'string' ? record['thumbnailUrl'] : null,
    ),
    bpm: boundedNumber(record['bpm'], 20, 400),
    bpmConfidence: parseBpmConfidence(record['bpmConfidence']),
    fileIdentity: parseFileIdentity(record['fileIdentity']),
  };
}
