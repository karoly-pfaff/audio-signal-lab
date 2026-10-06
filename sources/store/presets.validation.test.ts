import { expect, it } from 'vitest';
import { MAX_FILE_COUNT } from './persistence';
import { MAX_PORTABLE_TIME_SECONDS, portableJsonBlob } from './portableSession';
import { parsePreset, PRESET_SCHEMA, serializePreset } from './presets';
import { buildSnapshot } from './snapshots';

function preset(files: unknown[] = [], main: Record<string, unknown> = {}) {
  return {
    schema: PRESET_SCHEMA,
    version: 4,
    main: { loop: false, volume: 0.8, ...main },
    files,
    transport: { masterVolume: 0.8, masterMuted: false },
  };
}

function readText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result)));
    reader.addEventListener('error', () => reject(reader.error ?? new Error('File read failed')));
    reader.readAsText(blob);
  });
}

it('rejects duplicate file ids and file-count overflow', () => {
  expect(() => parsePreset(preset([{ id: 'same' }, { id: 'same' }]))).toThrow(/file id/);
  expect(() =>
    parsePreset(preset(Array.from({ length: MAX_FILE_COUNT + 1 }, (_, id) => ({ id: `${id}` })))),
  ).toThrow(/more than/);
});

it('rejects non-finite and out-of-range numeric fields', () => {
  expect(() => parsePreset(preset([], { volume: Number.POSITIVE_INFINITY }))).toThrow(/volume/);
  expect(() => parsePreset(preset([{ id: 'file', volume: 100 }]))).toThrow(/volume/);
  expect(() =>
    parsePreset({ ...preset(), transport: { masterVolume: -1, masterMuted: false } }),
  ).toThrow(/masterVolume/);
});

it('never preserves imported network image URLs', () => {
  const parsed = parsePreset(
    preset([{ id: 'file', thumbnailUrl: 'https://tracker.example/pixel.png' }], {
      thumbnailUrl: 'https://tracker.example/main.png',
    }),
  );
  expect(parsed.main.thumbnailUrl).toBeNull();
  expect(parsed.files[0]!.thumbnailUrl).toBeNull();
});

it('rejects main marker overflow instead of truncating imported data', () => {
  const markers = Array.from({ length: 257 }, (_, index) => ({
    id: `marker-${index}`,
    type: 'point',
    startSeconds: index,
  }));
  expect(() => parsePreset(preset([], { markers }))).toThrow(/markers/);
});

it('round-trips boundary main annotations through saved and A/B snapshots', async () => {
  const markers = [
    { id: 'point', type: 'point', startSeconds: MAX_PORTABLE_TIME_SECONDS },
    {
      id: 'range',
      type: 'range',
      startSeconds: MAX_PORTABLE_TIME_SECONDS - 1,
      endSeconds: MAX_PORTABLE_TIME_SECONDS,
    },
  ];
  const session = parsePreset(
    preset([], {
      filename: 'remembered.wav',
      selection: {
        startSeconds: MAX_PORTABLE_TIME_SECONDS - 1,
        endSeconds: MAX_PORTABLE_TIME_SECONDS,
      },
      markers,
    }),
  );
  const acceptedMarkers = session.main.markers.map((marker) => ({ ...marker }));
  const main = {
    volume: session.main.volume,
    loop: session.main.loop,
    name: session.main.filename ?? '',
    thumbnailUrl: session.main.thumbnailUrl,
    bpm: session.main.bpm,
    bpmConfidence: session.main.bpmConfidence,
    selection: session.main.selection,
    markers: session.main.markers,
    fileIdentity: session.main.fileIdentity,
  };
  const files: [] = [];
  session.snapshots = [buildSnapshot(main, session.transport, files, 'Saved')];
  session.ab = {
    a: buildSnapshot(main, session.transport, files, 'A'),
    b: buildSnapshot(main, session.transport, files, 'B'),
  };

  const blob = portableJsonBlob(serializePreset(session, '2026-10-06T00:00:00.000Z'));
  const exported = new File([blob], 'session.json', { type: 'application/json' });
  const roundTrip = parsePreset(JSON.parse(await readText(exported)) as unknown);
  expect(roundTrip.main.selection?.endSeconds).toBe(MAX_PORTABLE_TIME_SECONDS);
  expect(roundTrip.main.markers).toEqual(acceptedMarkers);
  expect(roundTrip.snapshots[0]?.main.markers).toEqual(acceptedMarkers);
  expect(roundTrip.ab.a?.main.selection?.endSeconds).toBe(MAX_PORTABLE_TIME_SECONDS);
  expect(roundTrip.ab.b?.main.markers).toEqual(acceptedMarkers);
});
