import { it, expect } from 'vitest';
import { buildSnapshot, parseSnapshot, MAX_NAME_LENGTH } from './snapshots';
import type { FileState, MainTrackState, TransportState } from '../audio/types';
function makeMain(overrides: Partial<MainTrackState> = {}): MainTrackState {
  return {
    id: 'main',
    name: 'track.mp3',
    buffer: null,
    volume: 0.8,
    loop: false,
    thumbnailUrl: null,
    loadingState: 'loaded',
    metadata: null,
    selection: null,
    markers: [],
    ...overrides,
  };
}
function makeTransport(overrides: Partial<TransportState> = {}): TransportState {
  return { playing: false, masterVolume: 0.9, masterMuted: false, ...overrides };
}
function makeFile(order: number, overrides: Partial<FileState> = {}): FileState {
  return {
    id: `layer-${order}`,
    name: '',
    buffer: null,
    volume: 1,
    loop: false,
    thumbnailUrl: null,
    order,
    loadingState: 'empty',
    metadata: null,
    ...overrides,
  };
}
// Suite: parseSnapshot
it('returns null for null input', () => {
  expect(parseSnapshot(null)).toBeNull();
});
it('returns null for non-object input', () => {
  expect(parseSnapshot('string')).toBeNull();
  expect(parseSnapshot(42)).toBeNull();
});
it('round-trips a valid snapshot', () => {
  const layers = [makeFile(0, { volume: 0.7, name: 'bass.mp3' })];
  const original = buildSnapshot(
    makeMain({
      volume: 0.6,
      loop: true,
      selection: { startSeconds: 1, endSeconds: 2 },
      markers: [{ id: 'p', type: 'point', startSeconds: 1, label: 'Hit', createdAt: 1 }],
    }),
    makeTransport({ masterVolume: 0.8 }),
    layers,
    'Round-trip test',
  );
  const parsed = parseSnapshot(original);
  expect(parsed).not.toBeNull();
  expect(parsed!.id).toBe(original.id);
  expect(parsed!.name).toBe('Round-trip test');
  expect(parsed!.main.volume).toBe(0.6);
  expect(parsed!.main.loop).toBe(true);
  expect(parsed!.main.selection).toEqual({ startSeconds: 1, endSeconds: 2 });
  expect(parsed!.main.markers).toHaveLength(1);
  expect(parsed!.masterVolume).toBe(0.8);
  expect(parsed!.files[0].volume).toBe(0.7);
  expect(parsed!.files[0].filename).toBe('bass.mp3');
});
it('clamps volume above 1 to 1', () => {
  const snap = parseSnapshot({
    id: 'x',
    name: 'Test',
    createdAt: '',
    main: {},
    masterVolume: 1.5,
    masterMuted: false,
    layers: [],
  });
  expect(snap!.masterVolume).toBe(1);
});
it('clamps volume below 0 to 0', () => {
  const snap = parseSnapshot({
    id: 'x',
    name: 'Test',
    createdAt: '',
    main: {},
    masterVolume: -0.5,
    masterMuted: false,
    layers: [],
  });
  expect(snap!.masterVolume).toBe(0);
});
it('clamps layer volume to [0, 1]', () => {
  const snap = parseSnapshot({
    id: 'x',
    name: 'T',
    createdAt: '',
    main: {},
    masterVolume: 0.8,
    masterMuted: false,
    layers: [{ slot: 0, volume: 2.5, pan: 0, muted: false, soloed: false }],
  });
  expect(snap!.files[0].volume).toBe(1);
});
it('truncates name to MAX_NAME_LENGTH', () => {
  const snap = parseSnapshot({
    id: 'x',
    name: 'A'.repeat(60),
    createdAt: '',
    main: {},
    masterVolume: 0.8,
    masterMuted: false,
    layers: [],
  });
  expect(snap!.name.length).toBe(MAX_NAME_LENGTH);
});
it('generates a new id when id is empty', () => {
  const snap = parseSnapshot({
    id: '',
    name: 'T',
    createdAt: '',
    main: {},
    masterVolume: 0.8,
    masterMuted: false,
    layers: [],
  });
  expect(snap!.id.length).toBeGreaterThan(0);
});
it('empty layers array gives empty files', () => {
  const snap = parseSnapshot({
    id: 'x',
    name: 'T',
    createdAt: '',
    main: {},
    masterVolume: 0.8,
    masterMuted: false,
    layers: [],
  });
  expect(snap!.files).toHaveLength(0);
});
it('strips blob: thumbnailUrl in layers', () => {
  const snap = parseSnapshot({
    id: 'x',
    name: 'T',
    createdAt: '',
    main: {},
    masterVolume: 0.8,
    masterMuted: false,
    layers: [
      {
        slot: 0,
        volume: 1,
        pan: 0,
        muted: false,
        soloed: false,
        thumbnailUrl: 'blob:http://localhost/xyz',
      },
    ],
  });
  expect(snap!.files[0].thumbnailUrl).toBeNull();
});
it('strips https: thumbnailUrl in layers', () => {
  const snap = parseSnapshot({
    id: 'x',
    name: 'T',
    createdAt: '',
    main: {},
    masterVolume: 0.8,
    masterMuted: false,
    layers: [
      {
        slot: 0,
        volume: 1,
        pan: 0,
        muted: false,
        soloed: false,
        thumbnailUrl: 'https://example.com/img.jpg',
      },
    ],
  });
  expect(snap!.files[0].thumbnailUrl).toBeNull();
});
it('defaults missing main fields', () => {
  const snap = parseSnapshot({
    id: 'x',
    name: 'T',
    createdAt: '',
    main: null,
    masterVolume: 0.8,
    masterMuted: false,
    layers: [],
  });
  expect(snap!.main.volume).toBe(0.8);
  expect(snap!.main.loop).toBe(false);
  expect(snap!.main.filename).toBeNull();
});
