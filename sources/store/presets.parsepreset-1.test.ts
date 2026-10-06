import { it, expect } from 'vitest';
import { serializePreset, parsePreset, PRESET_SCHEMA } from './presets';
import { defaultSession } from './persistence';
import type { SessionSnapshot } from './snapshots';
function makeSnapshot(overrides: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    id: 'snap1',
    name: 'Test Snap',
    createdAt: '2026-01-01T00:00:00.000Z',
    main: {
      volume: 0.8,
      loop: false,
      filename: null,
      thumbnailUrl: null,
      bpm: null,
      bpmConfidence: null,
    },
    masterVolume: 0.9,
    masterMuted: false,
    files: Array.from({ length: 5 }, (_, i) => ({
      id: `layer-${i}`,
      order: i,
      volume: 1,
      filename: null,
      thumbnailUrl: null,
      bpm: null,
      bpmConfidence: null,
    })),
    ...overrides,
  };
}
// Suite: parsePreset
it('round-trips with serializePreset', () => {
  const session = defaultSession();
  session.main.filename = 'my-track.mp3';
  session.main.loop = true;
  session.files.push({
    id: 'file-0',
    order: 0,
    volume: 1,
    filename: null,
    thumbnailUrl: null,
    bpm: null,
    bpmConfidence: null,
  });
  session.files.push({
    id: 'file-1',
    order: 1,
    volume: 0.5,
    filename: null,
    thumbnailUrl: null,
    bpm: null,
    bpmConfidence: null,
  });
  session.transport.masterMuted = true;
  const preset = serializePreset(session);
  const parsed = parsePreset(preset);
  expect(parsed.main.filename).toBe('my-track.mp3');
  expect(parsed.main.loop).toBe(true);
  expect(parsed.files[1].volume).toBe(0.5);
  expect(parsed.transport.masterMuted).toBe(true);
});
it('round-trips snapshots through serialize + parse', () => {
  const session = defaultSession();
  session.snapshots = [makeSnapshot({ name: 'Snap A', masterVolume: 0.7 })];
  const preset = serializePreset(session);
  const parsed = parsePreset(preset);
  expect(parsed.snapshots).toHaveLength(1);
  expect(parsed.snapshots[0].name).toBe('Snap A');
  expect(parsed.snapshots[0].masterVolume).toBe(0.7);
});
it('round-trips ab slots through serialize + parse', () => {
  const session = defaultSession();
  session.ab.a = makeSnapshot({ name: 'A Mix' });
  session.ab.b = makeSnapshot({ name: 'B Mix' });
  const preset = serializePreset(session);
  const parsed = parsePreset(preset);
  expect(parsed.ab.a).not.toBeNull();
  expect(parsed.ab.a!.name).toBe('A Mix');
  expect(parsed.ab.b).not.toBeNull();
  expect(parsed.ab.b!.name).toBe('B Mix');
});
it('accepts v1 preset and adds empty snapshots/ab', () => {
  const v1Preset = {
    schema: PRESET_SCHEMA,
    version: 1,
    exportedAt: '2026-01-01T00:00:00.000Z',
    main: { loop: false, volume: 0.8, filename: 'old-track.mp3', thumbnailUrl: null },
    files: Array.from({ length: 5 }, (_, i) => ({
      slot: i,
      volume: 1,
      pan: 0,
      muted: false,
      soloed: false,
      filename: null,
      thumbnailUrl: null,
    })),
    transport: { masterVolume: 0.8, masterMuted: false },
    // no snapshots, no ab
  };
  const parsed = parsePreset(v1Preset);
  expect(parsed.main.filename).toBe('old-track.mp3');
  expect(parsed.snapshots).toEqual([]);
  expect(parsed.ab).toEqual({ a: null, b: null });
});
it('accepts v1 preset that happens to carry snapshots', () => {
  const v1Preset = {
    schema: PRESET_SCHEMA,
    version: 1,
    exportedAt: '2026-01-01T00:00:00.000Z',
    main: { loop: false, volume: 0.8, filename: null, thumbnailUrl: null },
    files: Array.from({ length: 5 }, (_, i) => ({
      slot: i,
      volume: 1,
      pan: 0,
      muted: false,
      soloed: false,
      filename: null,
      thumbnailUrl: null,
    })),
    transport: { masterVolume: 0.8, masterMuted: false },
    snapshots: [
      {
        id: 'x',
        name: 'Old Snap',
        createdAt: '',
        main: {},
        masterVolume: 0.8,
        masterMuted: false,
        files: [],
      },
    ],
  };
  const parsed = parsePreset(v1Preset);
  expect(parsed.snapshots).toHaveLength(1);
  expect(parsed.snapshots[0].name).toBe('Old Snap');
});
it('throws on null input', () => {
  expect(() => parsePreset(null)).toThrow();
});
it('throws on non-object input', () => {
  expect(() => parsePreset('string')).toThrow();
  expect(() => parsePreset(42)).toThrow();
});
it('throws when schema field is missing', () => {
  expect(() => parsePreset({ version: 2 })).toThrow();
});
it('throws for wrong schema name', () => {
  expect(() => parsePreset({ schema: 'other-app', version: 2 })).toThrow();
});
it('throws for unsupported version number', () => {
  expect(() => parsePreset({ schema: PRESET_SCHEMA, version: 999 })).toThrow();
});
it('accepts the current preset and round-trips bpm fields', () => {
  const session = defaultSession();
  session.main.bpm = 128;
  session.main.bpmConfidence = 'high';
  session.files.push({
    id: 'file-0',
    order: 0,
    volume: 1,
    filename: null,
    thumbnailUrl: null,
    bpm: null,
    bpmConfidence: null,
  });
  session.files.push({
    id: 'file-1',
    order: 1,
    volume: 1,
    filename: null,
    thumbnailUrl: null,
    bpm: 64,
    bpmConfidence: 'medium',
  });
  const preset = serializePreset(session);
  expect(preset.version).toBe(4);
  const parsed = parsePreset(preset);
  expect(parsed.main.bpm).toBe(128);
  expect(parsed.main.bpmConfidence).toBe('high');
  expect(parsed.files[1].bpm).toBe(64);
  expect(parsed.files[1].bpmConfidence).toBe('medium');
});
it('throws for non-numeric version', () => {
  expect(() => parsePreset({ schema: PRESET_SCHEMA, version: 'one' })).toThrow();
});
it('rejects completely unrelated JSON', () => {
  expect(() => parsePreset({ foo: 'bar', baz: 42 })).toThrow();
});
it('removes browser-local media references from imported presets', () => {
  const preset = serializePreset(defaultSession());
  preset.main.assetId = `sha256-${'e'.repeat(64)}`;
  expect(parsePreset(preset).main.assetId).toBeNull();
});
it('round-trips selection through serialize + parse', () => {
  const session = defaultSession();
  session.main.selection = { startSeconds: 2.5, endSeconds: 7.0 };
  const preset = serializePreset(session);
  const parsed = parsePreset(preset);
  expect(parsed.main.selection).toEqual({ startSeconds: 2.5, endSeconds: 7.0 });
});

it('rejects nested snapshot and A/B files that bypass session invariants', () => {
  const preset = serializePreset(defaultSession());
  preset.snapshots = [
    makeSnapshot({
      files: Array.from({ length: 20 }, (_, index) => ({
        id: 'duplicate',
        order: index === 0 ? Number.POSITIVE_INFINITY : index,
        volume: 1,
        filename: null,
        thumbnailUrl: null,
        bpm: null,
        bpmConfidence: null,
      })),
    }),
  ];
  expect(() => parsePreset(preset)).toThrow(/more than 12 files/);

  preset.snapshots = [];
  preset.ab.a = makeSnapshot({
    files: [
      { ...makeSnapshot().files[0]!, id: 'same' },
      { ...makeSnapshot().files[1]!, id: 'same' },
    ],
  });
  expect(() => parsePreset(preset)).toThrow(/duplicate or malformed file id/);
});

it('rejects non-finite nested snapshot ordering', () => {
  const preset = serializePreset(defaultSession());
  preset.snapshots = [
    makeSnapshot({ files: [{ ...makeSnapshot().files[0]!, order: Number.POSITIVE_INFINITY }] }),
  ];
  expect(() => parsePreset(preset)).toThrow(/valid index/);
});
