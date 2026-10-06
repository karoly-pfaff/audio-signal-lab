import { expect, it, vi } from 'vitest';
import { defaultSession, type PersistedFile } from './persistence';
import { parseMain, parsePersistedFile, parseTransport } from './persistenceParsing';

const defaults = defaultSession();
const fileDefaults: PersistedFile = {
  id: 'default',
  order: 4,
  volume: 1,
  filename: null,
  assetId: null,
  thumbnailUrl: null,
  bpm: null,
  bpmConfidence: null,
  fileIdentity: null,
};

it('returns main and transport defaults for non-object input', () => {
  expect(parseMain(null, defaults.main)).toBe(defaults.main);
  expect(parseTransport('invalid', defaults.transport)).toBe(defaults.transport);
});

it('uses main fallbacks and rejects invalid selections and identities', () => {
  expect(
    parseMain(
      {
        loop: 'yes',
        volume: 'loud',
        filename: 2,
        thumbnailUrl: false,
        bpm: 'fast',
        bpmConfidence: 'certain',
        selection: { startSeconds: -1, endSeconds: 2 },
        markers: 'none',
        fileIdentity: { name: '', size: -1 },
      },
      defaults.main,
    ),
  ).toEqual(defaults.main);
  expect(
    parseMain({ selection: { startSeconds: 1, endSeconds: 1 } }, defaults.main).selection,
  ).toBeNull();
});

it('parses valid annotations while dropping malformed markers', () => {
  vi.spyOn(Date, 'now').mockReturnValue(123);
  const main = parseMain(
    {
      loop: true,
      volume: 0.4,
      filename: 'track.wav',
      thumbnailUrl: 'blob:art',
      bpm: 128,
      bpmConfidence: 'medium',
      selection: { startSeconds: 1, endSeconds: 3 },
      markers: [
        null,
        { id: '', type: 'point', startSeconds: 1 },
        { id: 'bad-type', type: 'area', startSeconds: 1 },
        { id: 'negative', type: 'point', startSeconds: -1 },
        { id: 'bad-range', type: 'range', startSeconds: 2, endSeconds: 2 },
        { id: 'point', type: 'point', startSeconds: 1, label: 3 },
        {
          id: 'range',
          type: 'range',
          startSeconds: 2,
          endSeconds: 4,
          label: 'x'.repeat(100),
          createdAt: 7,
        },
      ],
    },
    defaults.main,
  );

  expect(main.selection).toEqual({ startSeconds: 1, endSeconds: 3 });
  expect(main.markers).toHaveLength(2);
  expect(main.markers[0]).toMatchObject({ id: 'point', label: '', createdAt: 123 });
  expect(main.markers[1]).toMatchObject({ id: 'range', label: 'x'.repeat(80), createdAt: 7 });
  vi.restoreAllMocks();
});

it('parses complete file identities with and without an optional hash', () => {
  const identity = {
    name: 'track.wav',
    size: 0,
    lastModified: 0,
    durationSeconds: 1,
    sampleRate: 48000,
    channelCount: 2,
  };
  expect(parseMain({ fileIdentity: identity }, defaults.main).fileIdentity).toEqual(identity);
  expect(
    parseMain({ fileIdentity: { ...identity, quickHash: 'abc' } }, defaults.main).fileIdentity,
  ).toEqual({ ...identity, quickHash: 'abc' });
  expect(
    parseMain({ fileIdentity: { ...identity, durationSeconds: Number.NaN } }, defaults.main)
      .fileIdentity,
  ).toBeNull();
});

it('parses transport values and falls back per invalid field', () => {
  expect(parseTransport({ masterVolume: 0.3, masterMuted: true }, defaults.transport)).toEqual({
    masterVolume: 0.3,
    masterMuted: true,
  });
  expect(parseTransport({ masterVolume: 'x', masterMuted: 1 }, defaults.transport)).toEqual(
    defaults.transport,
  );
});

it('supports legacy slots and validates every persisted file field', () => {
  expect(parsePersistedFile(null, fileDefaults)).toBe(fileDefaults);
  expect(parsePersistedFile({ slot: 2 }, fileDefaults)).toEqual({
    ...fileDefaults,
    id: 'file-2',
    order: 2,
  });
  expect(
    parsePersistedFile(
      {
        id: 'custom',
        order: 1,
        volume: 0.25,
        filename: 'layer.wav',
        assetId: `sha256-${'a'.repeat(64)}`,
        thumbnailUrl: 'data:image/png;base64,x',
        bpm: 96,
        bpmConfidence: 'low',
      },
      fileDefaults,
    ),
  ).toMatchObject({
    id: 'custom',
    order: 1,
    volume: 0.25,
    filename: 'layer.wav',
    assetId: `sha256-${'a'.repeat(64)}`,
    bpm: 96,
  });
  expect(parsePersistedFile({ assetId: 'unsafe' }, fileDefaults).assetId).toBeNull();
  expect(parsePersistedFile({ slot: 'bad', id: 1, order: 'x' }, fileDefaults)).toEqual({
    ...fileDefaults,
    id: 'file-4',
  });
});
