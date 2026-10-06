import { it, expect } from 'vitest';
import { serializePreset, parsePreset, PRESET_SCHEMA } from './presets';
import { defaultSession } from './persistence';
// Suite: parsePreset
it('round-trips point and range markers through serialize + parse', () => {
  const session = defaultSession();
  session.main.markers = [
    { id: 'pt1', type: 'point', startSeconds: 1.0, label: 'Drop', createdAt: 1000 },
    {
      id: 'rng1',
      type: 'range',
      startSeconds: 4.0,
      endSeconds: 8.0,
      label: 'Chorus',
      createdAt: 2000,
    },
  ];
  const preset = serializePreset(session);
  const parsed = parsePreset(preset);
  expect(parsed.main.markers).toHaveLength(2);
  const pt = parsed.main.markers.find((m) => m.id === 'pt1');
  expect(pt!.type).toBe('point');
  expect(pt!.startSeconds).toBe(1.0);
  expect(pt!.endSeconds).toBeUndefined();
  const rng = parsed.main.markers.find((m) => m.id === 'rng1');
  expect(rng!.type).toBe('range');
  expect(rng!.endSeconds).toBe(8.0);
  expect(rng!.label).toBe('Chorus');
});
it('importing preset without markers defaults to []', () => {
  const preset = {
    schema: PRESET_SCHEMA,
    version: 3,
    exportedAt: '2026-01-01T00:00:00.000Z',
    main: { loop: false, volume: 0.8, filename: null, thumbnailUrl: null },
    files: [],
    transport: { masterVolume: 0.8, masterMuted: false },
  };
  const parsed = parsePreset(preset);
  expect(parsed.main.markers).toEqual([]);
});
it('importing preset without selection defaults to null', () => {
  const preset = {
    schema: PRESET_SCHEMA,
    version: 3,
    exportedAt: '2026-01-01T00:00:00.000Z',
    main: { loop: false, volume: 0.8, filename: null, thumbnailUrl: null },
    files: [],
    transport: { masterVolume: 0.8, masterMuted: false },
  };
  const parsed = parsePreset(preset);
  expect(parsed.main.selection).toBeNull();
});
it('discards invalid markers on import, keeps valid ones', () => {
  const preset = {
    schema: PRESET_SCHEMA,
    version: 3,
    exportedAt: '2026-01-01T00:00:00.000Z',
    main: {
      loop: false,
      volume: 0.8,
      filename: null,
      thumbnailUrl: null,
      markers: [
        { id: 'good', type: 'point', startSeconds: 1.0, label: 'OK', createdAt: 100 },
        { id: 'bad', type: 'invalid-type', startSeconds: 1.0, label: 'Bad', createdAt: 200 },
        { id: 'nostart', type: 'point', startSeconds: -5, label: 'Neg', createdAt: 300 },
      ],
    },
    files: [],
    transport: { masterVolume: 0.8, masterMuted: false },
  };
  const parsed = parsePreset(preset);
  expect(parsed.main.markers).toHaveLength(1);
  expect(parsed.main.markers[0].id).toBe('good');
});
it('is tolerant for missing individual file fields, filling defaults', () => {
  const preset = {
    schema: PRESET_SCHEMA,
    version: 2,
    exportedAt: '2026-05-28T00:00:00.000Z',
    main: { loop: false, volume: 0.8, filename: null, thumbnailUrl: null },
    layers: [{ slot: 0 }],
    transport: { masterVolume: 0.8, masterMuted: false },
  };
  const parsed = parsePreset(preset);
  expect(parsed.files[0].volume).toBe(1);
  expect(parsed.files[0].bpm).toBeNull();
  expect(parsed.files).toHaveLength(1);
});
it('strips network thumbnail URLs', () => {
  const session = defaultSession();
  for (let i = 0; i < 4; i++) {
    session.files.push({
      id: `file-${i}`,
      order: i,
      volume: 1,
      filename: null,
      thumbnailUrl: null,
      bpm: null,
      bpmConfidence: null,
    });
  }
  session.files[3].thumbnailUrl = 'https://example.com/thumb.jpg';
  const preset = serializePreset(session);
  const parsed = parsePreset(preset);
  expect(parsed.files[3].thumbnailUrl).toBeNull();
});
