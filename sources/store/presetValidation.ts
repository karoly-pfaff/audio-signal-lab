import { MAX_MARKER_LABEL_LENGTH } from '../utils/markerUtils';
import {
  isPortableText,
  MAX_PORTABLE_FILENAME_LENGTH,
  MAX_PORTABLE_HASH_LENGTH,
  MAX_PORTABLE_IDENTIFIER_LENGTH,
  MAX_PORTABLE_TIME_SECONDS,
  MAX_PORTABLE_TIMESTAMP_LENGTH,
} from './portableSession';
import { MAX_MARKERS, MAX_SNAPSHOTS, MAX_SNAPSHOT_NAME_LENGTH } from './sessionLimits';

function asRecord(raw: unknown): Record<string, unknown> | null {
  return typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : null;
}

function validateText(value: unknown, label: string, maximumLength: number): void {
  if (typeof value !== 'string') {
    return;
  }
  if (!isPortableText(value, maximumLength)) {
    throw new Error(`Invalid preset: ${label} is too long`);
  }
}

function validateFileIdentity(raw: unknown): void {
  const identity = asRecord(raw);
  if (!identity) {
    return;
  }
  validateText(identity['name'], 'file identity name', MAX_PORTABLE_FILENAME_LENGTH);
  validateText(identity['quickHash'], 'file identity hash', MAX_PORTABLE_HASH_LENGTH);
}

function rawFiles(preset: Record<string, unknown>): unknown[] {
  if (Array.isArray(preset['files'])) {
    return preset['files'];
  }
  return Array.isArray(preset['layers']) ? preset['layers'] : [];
}

function validateFileIdentities(files: unknown[], maximum: number): void {
  if (files.length > maximum) {
    throw new Error(`Invalid preset: more than ${maximum} files`);
  }
  const ids = new Set<string>();
  files.forEach((raw) => {
    const file = asRecord(raw);
    if (!file) {
      throw new Error('Invalid preset: malformed file entry');
    }
    validateText(file['filename'], 'filename', MAX_PORTABLE_FILENAME_LENGTH);
    validateFileIdentity(file['fileIdentity']);
    const id = file['id'];
    if (id === undefined) {
      return;
    }
    if (!isPortableText(id, MAX_PORTABLE_IDENTIFIER_LENGTH) || id.length === 0 || ids.has(id)) {
      throw new Error('Invalid preset: duplicate or malformed file id');
    }
    ids.add(id);
  });
}

function validateBoundedNumber(
  record: Record<string, unknown> | null,
  key: string,
  minimum: number,
  maximum: number,
): void {
  const value = record?.[key];
  if (value === undefined || value === null) {
    return;
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`Invalid preset: ${key} is out of range`);
  }
}

function validateFileNumbers(files: unknown[]): void {
  files.forEach((raw) => {
    const file = asRecord(raw);
    validateBoundedNumber(file, 'volume', 0, 1);
    validateBoundedNumber(file, 'bpm', 20, 400);
    validateOrder(file, 'order');
    validateOrder(file, 'slot');
  });
}

function validateOrder(record: Record<string, unknown> | null, key: string): void {
  const value = record?.[key];
  if (value === undefined || value === null) {
    return;
  }
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Invalid preset: ${key} is not a valid index`);
  }
}

function validateTimeRange(raw: unknown, label: string): void {
  if (raw === undefined || raw === null) {
    return;
  }
  const range = asRecord(raw);
  if (!range) {
    throw new Error(`Invalid preset: malformed ${label}`);
  }
  validateBoundedNumber(range, 'startSeconds', 0, MAX_PORTABLE_TIME_SECONDS);
  validateBoundedNumber(range, 'endSeconds', 0, MAX_PORTABLE_TIME_SECONDS);
  const start = range['startSeconds'];
  const end = range['endSeconds'];
  if (typeof start !== 'number' || typeof end !== 'number' || end <= start) {
    throw new Error(`Invalid preset: malformed ${label}`);
  }
}

function validateMarkers(raw: unknown): void {
  if (raw === undefined || raw === null) {
    return;
  }
  if (!Array.isArray(raw) || raw.length > MAX_MARKERS) {
    throw new Error('Invalid preset: malformed markers');
  }
  const ids = new Set<string>();
  raw.forEach((item) => {
    const marker = asRecord(item);
    const id = marker?.['id'];
    if (!marker || typeof id !== 'string' || !id || ids.has(id)) {
      throw new Error('Invalid preset: malformed marker');
    }
    validateText(id, 'marker id', MAX_PORTABLE_IDENTIFIER_LENGTH);
    validateText(marker['label'], 'marker label', MAX_MARKER_LABEL_LENGTH);
    ids.add(id);
    validateBoundedNumber(marker, 'startSeconds', 0, MAX_PORTABLE_TIME_SECONDS);
    if (marker['type'] === 'range') {
      validateTimeRange(marker, 'range marker');
    }
  });
}

function validateMainTimeUpperBound(record: Record<string, unknown> | null, key: string): void {
  const value = record?.[key];
  if (typeof value === 'number' && (!Number.isFinite(value) || value > MAX_PORTABLE_TIME_SECONDS)) {
    throw new Error(`Invalid preset: ${key} is out of range`);
  }
}

function validateMainAnnotations(selection: unknown, markers: unknown): void {
  const range = asRecord(selection);
  validateMainTimeUpperBound(range, 'startSeconds');
  validateMainTimeUpperBound(range, 'endSeconds');
  if (Array.isArray(markers) && markers.length > MAX_MARKERS) {
    throw new Error('Invalid preset: malformed markers');
  }
  if (Array.isArray(markers)) {
    markers.forEach((item) => {
      const marker = asRecord(item);
      validateText(marker?.['id'], 'marker id', MAX_PORTABLE_IDENTIFIER_LENGTH);
      validateText(marker?.['label'], 'marker label', MAX_MARKER_LABEL_LENGTH);
      validateMainTimeUpperBound(marker, 'startSeconds');
      validateMainTimeUpperBound(marker, 'endSeconds');
    });
  }
}

function validateSnapshot(raw: unknown, maximumFiles: number): void {
  const snapshot = asRecord(raw);
  if (!snapshot) {
    throw new Error('Invalid preset: malformed snapshot');
  }
  validateText(snapshot['id'], 'snapshot id', MAX_PORTABLE_IDENTIFIER_LENGTH);
  validateText(snapshot['name'], 'snapshot name', MAX_SNAPSHOT_NAME_LENGTH);
  validateText(snapshot['createdAt'], 'snapshot timestamp', MAX_PORTABLE_TIMESTAMP_LENGTH);
  const files = rawFiles(snapshot);
  validateFileIdentities(files, maximumFiles);
  validateFileNumbers(files);
  const main = asRecord(snapshot['main']);
  validateText(main?.['filename'], 'filename', MAX_PORTABLE_FILENAME_LENGTH);
  validateFileIdentity(main?.['fileIdentity']);
  validateBoundedNumber(main, 'volume', 0, 1);
  validateBoundedNumber(main, 'bpm', 20, 400);
  validateTimeRange(main?.['selection'], 'selection');
  validateMarkers(main?.['markers']);
  validateBoundedNumber(snapshot, 'masterVolume', 0, 1);
}

function validateSnapshots(raw: unknown, maximumFiles: number): void {
  if (raw === undefined) {
    return;
  }
  if (!Array.isArray(raw) || raw.length > MAX_SNAPSHOTS) {
    throw new Error('Invalid preset: malformed snapshot list');
  }
  const ids = new Set<string>();
  raw.forEach((item) => {
    validateSnapshot(item, maximumFiles);
    const id = asRecord(item)?.['id'];
    if (typeof id === 'string' && (id.length === 0 || ids.has(id))) {
      throw new Error('Invalid preset: duplicate snapshot id');
    }
    if (typeof id === 'string') {
      ids.add(id);
    }
  });
}

function validateABSlots(raw: unknown, maximumFiles: number): void {
  if (raw === undefined) {
    return;
  }
  const slots = asRecord(raw);
  if (!slots) {
    throw new Error('Invalid preset: malformed A/B slots');
  }
  for (const key of ['a', 'b']) {
    const snapshot = slots[key];
    if (snapshot !== undefined && snapshot !== null) {
      validateSnapshot(snapshot, maximumFiles);
    }
  }
}

export function validatePresetStructure(
  preset: Record<string, unknown>,
  maximumFiles: number,
): void {
  const files = rawFiles(preset);
  validateFileIdentities(files, maximumFiles);
  validateFileNumbers(files);
  const main = asRecord(preset['main']);
  validateText(main?.['filename'], 'filename', MAX_PORTABLE_FILENAME_LENGTH);
  validateFileIdentity(main?.['fileIdentity']);
  validateBoundedNumber(main, 'volume', 0, 1);
  validateBoundedNumber(main, 'bpm', 20, 400);
  validateMainAnnotations(main?.['selection'], main?.['markers']);
  validateBoundedNumber(asRecord(preset['transport']), 'masterVolume', 0, 1);
  validateSnapshots(preset['snapshots'], maximumFiles);
  validateABSlots(preset['ab'], maximumFiles);
}
