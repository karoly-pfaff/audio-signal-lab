import { expect, it } from 'vitest';
import { MAX_MARKER_LABEL_LENGTH } from '../utils/markerUtils';
import {
  MAX_PORTABLE_FILENAME_LENGTH,
  MAX_PORTABLE_IDENTIFIER_LENGTH,
  MAX_PORTABLE_TIME_SECONDS,
  MAX_PORTABLE_TIMESTAMP_LENGTH,
} from './portableSession';
import { validatePresetStructure } from './presetValidation';
import { MAX_SNAPSHOT_NAME_LENGTH } from './sessionLimits';

type PresetRecord = Record<string, unknown>;

function file(overrides: PresetRecord = {}): PresetRecord {
  return { id: 'file-1', order: 0, volume: 1, bpm: 120, ...overrides };
}

function snapshot(overrides: PresetRecord = {}): PresetRecord {
  return {
    id: 'snapshot-1',
    files: [file()],
    main: { volume: 1, bpm: 120 },
    masterVolume: 1,
    ...overrides,
  };
}

function preset(overrides: PresetRecord = {}): PresetRecord {
  return {
    files: [file()],
    main: { volume: 1, bpm: 120 },
    transport: { masterVolume: 1 },
    snapshots: [],
    ab: { a: null, b: null },
    ...overrides,
  };
}

function expectInvalid(value: PresetRecord, message: RegExp): void {
  expect(() => validatePresetStructure(value, 12)).toThrow(message);
}

it('accepts legacy layers and omitted or null optional values', () => {
  expect(() =>
    validatePresetStructure(
      {
        layers: [{ volume: null, bpm: null, order: null, slot: null }],
        main: null,
        transport: null,
      },
      12,
    ),
  ).not.toThrow();
});

it('accepts an empty structure when every optional collection is omitted', () => {
  expect(() => validatePresetStructure({}, 12)).not.toThrow();
});

it.each([
  ['too many files', preset({ files: Array.from({ length: 13 }, () => file()) })],
  ['malformed entry', preset({ files: [null] })],
  ['non-string id', preset({ files: [file({ id: 1 })] })],
  ['empty id', preset({ files: [file({ id: '' })] })],
  ['duplicate id', preset({ files: [file(), file()] })],
])('rejects %s', (_label, value) => {
  expectInvalid(value as PresetRecord, /files|file/);
});

it.each([
  ['string volume', { volume: 'loud' }],
  ['non-finite volume', { volume: Number.POSITIVE_INFINITY }],
  ['negative volume', { volume: -0.1 }],
  ['oversized volume', { volume: 1.1 }],
  ['low bpm', { bpm: 19 }],
  ['high bpm', { bpm: 401 }],
])('rejects %s', (_label, overrides) => {
  expectInvalid(preset({ files: [file(overrides)] }), /out of range/);
});

it.each([
  ['string order', { order: '0' }],
  ['unsafe order', { order: Number.MAX_SAFE_INTEGER + 1 }],
  ['negative order', { order: -1 }],
  ['invalid slot', { slot: Number.NaN }],
])('rejects %s', (_label, overrides) => {
  expectInvalid(preset({ files: [file(overrides)] }), /valid index/);
});

it.each([
  ['non-object selection', { selection: true }],
  ['selection without bounds', { selection: {} }],
  ['negative selection start', { selection: { startSeconds: -1, endSeconds: 2 } }],
  ['non-finite selection end', { selection: { startSeconds: 1, endSeconds: Infinity } }],
  ['reversed selection', { selection: { startSeconds: 2, endSeconds: 1 } }],
])('rejects %s', (_label, main) => {
  expectInvalid(preset({ snapshots: [snapshot({ main })] }), /selection|out of range/);
});

it.each([
  ['non-array markers', true],
  ['too many markers', Array.from({ length: 257 }, () => ({ id: 'marker' }))],
  ['non-object marker', [null]],
  ['non-string marker id', [{ id: 1 }]],
  ['empty marker id', [{ id: '' }]],
  ['duplicate marker id', [{ id: 'same' }, { id: 'same' }]],
  ['reversed range marker', [{ id: 'range', type: 'range', startSeconds: 2, endSeconds: 1 }]],
])('rejects %s', (_label, markers) => {
  expectInvalid(preset({ snapshots: [snapshot({ main: { markers } })] }), /markers?|range/);
});

it('accepts valid point and range markers', () => {
  const markers = [
    { id: 'point', type: 'point', startSeconds: 1 },
    { id: 'range', type: 'range', startSeconds: 1, endSeconds: 2 },
  ];
  expect(() =>
    validatePresetStructure(preset({ snapshots: [snapshot({ main: { markers } })] }), 12),
  ).not.toThrow();
});

it('uses the same temporal bound for main, snapshot, and A/B annotations', () => {
  const main = {
    selection: {
      startSeconds: MAX_PORTABLE_TIME_SECONDS - 1,
      endSeconds: MAX_PORTABLE_TIME_SECONDS,
    },
    markers: [
      { id: 'point', type: 'point', startSeconds: MAX_PORTABLE_TIME_SECONDS },
      {
        id: 'range',
        type: 'range',
        startSeconds: MAX_PORTABLE_TIME_SECONDS - 1,
        endSeconds: MAX_PORTABLE_TIME_SECONDS,
      },
    ],
  };
  const value = preset({ main, snapshots: [snapshot({ main })], ab: { a: snapshot({ main }) } });
  expect(() => validatePresetStructure(value, 12)).not.toThrow();
});

it.each([
  ['selection', { selection: { startSeconds: 0, endSeconds: MAX_PORTABLE_TIME_SECONDS + 1 } }],
  [
    'point marker',
    { markers: [{ id: 'point', type: 'point', startSeconds: MAX_PORTABLE_TIME_SECONDS + 1 }] },
  ],
  [
    'range marker',
    {
      markers: [
        {
          id: 'range',
          type: 'range',
          startSeconds: MAX_PORTABLE_TIME_SECONDS - 1,
          endSeconds: MAX_PORTABLE_TIME_SECONDS + 1,
        },
      ],
    },
  ],
])('rejects an over-bound main %s', (_label, main) => {
  expectInvalid(preset({ main }), /out of range/);
});

it('rejects main marker overflow before tolerant marker normalization', () => {
  const markers = Array.from({ length: 257 }, (_, index) => ({
    id: `marker-${index}`,
    type: 'point',
    startSeconds: index,
  }));
  expectInvalid(preset({ main: { markers } }), /markers/);
});

it.each([
  ['non-array snapshot list', { snapshots: null }],
  ['too many snapshots', { snapshots: Array.from({ length: 13 }, () => snapshot()) }],
  ['malformed snapshot', { snapshots: [null] }],
  ['empty snapshot id', { snapshots: [snapshot({ id: '' })] }],
  ['duplicate snapshot id', { snapshots: [snapshot(), snapshot()] }],
  ['malformed A/B slots', { ab: true }],
  ['malformed A/B snapshot', { ab: { a: true } }],
])('rejects %s', (_label, overrides) => {
  expectInvalid(preset(overrides), /snapshot|A\/B/);
});

it('accepts valid A/B snapshots and snapshots without ids', () => {
  expect(() =>
    validatePresetStructure(
      preset({ snapshots: [snapshot({ id: 7 })], ab: { a: snapshot(), b: snapshot() } }),
      12,
    ),
  ).not.toThrow();
});

it.each([
  ['file id', { files: [file({ id: 'i'.repeat(MAX_PORTABLE_IDENTIFIER_LENGTH + 1) })] }],
  ['filename', { main: { filename: 'f'.repeat(MAX_PORTABLE_FILENAME_LENGTH + 1) } }],
  [
    'marker id',
    {
      main: {
        markers: [
          { id: 'i'.repeat(MAX_PORTABLE_IDENTIFIER_LENGTH + 1), type: 'point', startSeconds: 0 },
        ],
      },
    },
  ],
  [
    'marker label',
    {
      main: {
        markers: [
          {
            id: 'marker',
            type: 'point',
            startSeconds: 0,
            label: 'l'.repeat(MAX_MARKER_LABEL_LENGTH + 1),
          },
        ],
      },
    },
  ],
  ['snapshot name', { snapshots: [snapshot({ name: 'n'.repeat(MAX_SNAPSHOT_NAME_LENGTH + 1) })] }],
  [
    'snapshot timestamp',
    { snapshots: [snapshot({ createdAt: 't'.repeat(MAX_PORTABLE_TIMESTAMP_LENGTH + 1) })] },
  ],
])('rejects an overlong portable %s', (_label, overrides) => {
  expectInvalid(preset(overrides), /too long|file id/);
});
