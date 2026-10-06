import { it, expect } from 'vitest';
import { buildSnapshot, MAX_NAME_LENGTH } from './snapshots';
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
// Suite: buildSnapshot
it('captures main volume and loop', () => {
  const snap = buildSnapshot(makeMain({ volume: 0.6, loop: true }), makeTransport(), [], 'Test');
  expect(snap.main.volume).toBe(0.6);
  expect(snap.main.loop).toBe(true);
});
it('captures selection and markers without retaining mutable references', () => {
  const marker = {
    id: 'point',
    type: 'point' as const,
    startSeconds: 2,
    label: 'Hit',
    createdAt: 1,
  };
  const main = makeMain({ selection: { startSeconds: 1, endSeconds: 3 }, markers: [marker] });
  const snap = buildSnapshot(main, makeTransport(), [], 'Annotated');
  main.markers[0]!.label = 'Changed';
  expect(snap.main.selection).toEqual({ startSeconds: 1, endSeconds: 3 });
  expect(snap.main.markers?.[0]?.label).toBe('Hit');
});
it('captures master volume and mute', () => {
  const snap = buildSnapshot(
    makeMain(),
    makeTransport({ masterVolume: 0.7, masterMuted: true }),
    [],
    'Test',
  );
  expect(snap.masterVolume).toBe(0.7);
  expect(snap.masterMuted).toBe(true);
});
it('captures layer volume and filename', () => {
  const layers = [makeFile(0, { volume: 0.5, name: 'kick.wav' })];
  const snap = buildSnapshot(makeMain(), makeTransport(), layers, 'Test');
  expect(snap.files[0].volume).toBe(0.5);
  expect(snap.files[0].filename).toBe('kick.wav');
});
it('captures layer filename, id, and order', () => {
  const layers = [makeFile(2, { name: 'drums.mp3' })];
  const snap = buildSnapshot(makeMain(), makeTransport(), layers, 'Test');
  expect(snap.files[0].id).toBe('layer-2');
  expect(snap.files[0].order).toBe(2);
  expect(snap.files[0].filename).toBe('drums.mp3');
});
it('strips blob: thumbnailUrls to null', () => {
  const layers = [makeFile(0, { thumbnailUrl: 'blob:http://localhost/xyz' })];
  const snap = buildSnapshot(
    makeMain({ thumbnailUrl: 'blob:http://localhost/abc' }),
    makeTransport(),
    layers,
    'Test',
  );
  expect(snap.main.thumbnailUrl).toBeNull();
  expect(snap.files[0].thumbnailUrl).toBeNull();
});
it('strips https: thumbnailUrls', () => {
  const layers = [makeFile(0, { thumbnailUrl: 'https://example.com/img.jpg' })];
  const snap = buildSnapshot(makeMain(), makeTransport(), layers, 'Test');
  expect(snap.files[0].thumbnailUrl).toBeNull();
});
it('truncates name to MAX_NAME_LENGTH', () => {
  const longName = 'A'.repeat(MAX_NAME_LENGTH + 10);
  const snap = buildSnapshot(makeMain(), makeTransport(), [], longName);
  expect(snap.name.length).toBe(MAX_NAME_LENGTH);
});
it('assigns a non-empty id', () => {
  const snap = buildSnapshot(makeMain(), makeTransport(), [], 'Test');
  expect(typeof snap.id).toBe('string');
  expect(snap.id.length).toBeGreaterThan(0);
});
it('captures bpm and bpmConfidence from main when present', () => {
  const snap = buildSnapshot(
    makeMain({ bpm: 128, bpmConfidence: 'high' }),
    makeTransport(),
    [],
    'Test',
  );
  expect(snap.main.bpm).toBe(128);
  expect(snap.main.bpmConfidence).toBe('high');
});
it('captures bpm and bpmConfidence from layers when present', () => {
  const layers = [makeFile(0, { bpm: 64, bpmConfidence: 'medium' })];
  const snap = buildSnapshot(makeMain(), makeTransport(), layers, 'Test');
  expect(snap.files[0].bpm).toBe(64);
  expect(snap.files[0].bpmConfidence).toBe('medium');
});
