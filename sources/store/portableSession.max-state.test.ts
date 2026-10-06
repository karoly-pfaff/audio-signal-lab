import { expect, it } from 'vitest';
import type { Marker } from '../audio/types';
import { MAX_MARKER_LABEL_LENGTH } from '../utils/markerUtils';
import { defaultSession, type PersistedFile } from './persistence';
import {
  MAX_PORTABLE_FILENAME_LENGTH,
  MAX_PORTABLE_HASH_LENGTH,
  MAX_PORTABLE_IDENTIFIER_LENGTH,
  MAX_PORTABLE_SESSION_BYTES,
  MAX_PORTABLE_TIMESTAMP_LENGTH,
  portableJsonBlob,
} from './portableSession';
import { parsePreset, serializePreset } from './presets';
import {
  MAX_FILE_COUNT,
  MAX_MARKERS,
  MAX_SNAPSHOTS,
  MAX_SNAPSHOT_NAME_LENGTH,
} from './sessionLimits';
import type { SessionSnapshot, SnapshotFile } from './snapshotTypes';

const escaped = '\u0000';
const filename = escaped.repeat(MAX_PORTABLE_FILENAME_LENGTH);
const maximum = Number.MAX_SAFE_INTEGER;

function maximumId(index: number): string {
  const suffix = index.toString(36).padStart(3, '0');
  return `${escaped.repeat(MAX_PORTABLE_IDENTIFIER_LENGTH - suffix.length)}${suffix}`;
}

function fileIdentity() {
  return {
    name: filename,
    size: maximum,
    lastModified: maximum,
    durationSeconds: maximum,
    sampleRate: maximum,
    channelCount: maximum,
    quickHash: escaped.repeat(MAX_PORTABLE_HASH_LENGTH),
  };
}

function markers(): Marker[] {
  return Array.from({ length: MAX_MARKERS }, (_, index) => ({
    id: maximumId(index),
    type: 'range',
    startSeconds: maximum - 1,
    endSeconds: maximum,
    label: escaped.repeat(MAX_MARKER_LABEL_LENGTH),
    createdAt: maximum,
  }));
}

function snapshotFiles(): SnapshotFile[] {
  return Array.from({ length: MAX_FILE_COUNT }, (_, index) => ({
    id: maximumId(index),
    order: maximum,
    volume: 1,
    filename,
    thumbnailUrl: null,
    bpm: 400,
    bpmConfidence: 'medium',
  }));
}

function persistedFiles(): PersistedFile[] {
  return snapshotFiles().map((file) => ({
    ...file,
    assetId: null,
    fileIdentity: fileIdentity(),
  }));
}

function snapshot(index: number): SessionSnapshot {
  return {
    id: maximumId(index),
    name: escaped.repeat(MAX_SNAPSHOT_NAME_LENGTH),
    createdAt: escaped.repeat(MAX_PORTABLE_TIMESTAMP_LENGTH),
    main: {
      volume: 1,
      loop: false,
      filename,
      thumbnailUrl: null,
      bpm: 400,
      bpmConfidence: 'medium',
      selection: { startSeconds: maximum - 1, endSeconds: maximum },
      markers: markers(),
      fileIdentity: fileIdentity(),
    },
    masterVolume: 1,
    masterMuted: false,
    files: snapshotFiles(),
  };
}

function maximumSession() {
  const session = defaultSession();
  session.main = {
    loop: false,
    volume: 1,
    filename,
    assetId: null,
    thumbnailUrl: null,
    bpm: 400,
    bpmConfidence: 'medium',
    selection: { startSeconds: maximum - 1, endSeconds: maximum },
    markers: markers(),
    fileIdentity: fileIdentity(),
  };
  session.files = persistedFiles();
  session.transport = { masterVolume: 1, masterMuted: false };
  session.snapshots = Array.from({ length: MAX_SNAPSHOTS }, (_, index) => snapshot(index));
  session.ab = { a: snapshot(MAX_SNAPSHOTS), b: snapshot(MAX_SNAPSHOTS + 1) };
  return session;
}

it('round-trips the worst accepted JSON escaping below the shared byte limit', async () => {
  const preset = serializePreset(maximumSession(), '2026-10-06T00:00:00.000Z');
  const json = JSON.stringify(preset, null, 2);
  const blob = portableJsonBlob(preset);
  expect(blob.size).toBeLessThanOrEqual(MAX_PORTABLE_SESSION_BYTES);
  expect(blob.size).toBeGreaterThan(6_000_000);

  const parsed = parsePreset(JSON.parse(json) as unknown);
  expect(parsed.main.filename).toBe(filename);
  expect(parsed.main.markers).toHaveLength(MAX_MARKERS);
  expect(parsed.main.markers[0]?.id).toHaveLength(MAX_PORTABLE_IDENTIFIER_LENGTH);
  expect(parsed.main.markers[0]?.label).toHaveLength(MAX_MARKER_LABEL_LENGTH);
  expect(parsed.files).toHaveLength(MAX_FILE_COUNT);
  expect(parsed.snapshots).toHaveLength(MAX_SNAPSHOTS);
  expect(parsed.ab.a?.main.markers).toHaveLength(MAX_MARKERS);
  expect(parsed.ab.b?.files).toHaveLength(MAX_FILE_COUNT);

  const roundTripPreset = serializePreset(parsed, '2026-10-06T00:00:00.000Z');
  expect(roundTripPreset).toEqual(preset);
  const roundTrip = portableJsonBlob(roundTripPreset);
  expect(roundTrip.size).toBe(blob.size);
});
