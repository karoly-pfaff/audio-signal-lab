import { it, expect } from 'vitest';
import { parsePreset, serializePreset, PRESET_SCHEMA } from './presets';
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
// Suite: serializePreset
it('produces correct schema name and version', () => {
  const preset = serializePreset(defaultSession());
  expect(preset.schema).toBe(PRESET_SCHEMA);
  expect(preset.version).toBe(4);
});
it('includes exportedAt as ISO string when not provided', () => {
  const preset = serializePreset(defaultSession());
  expect(typeof preset.exportedAt).toBe('string');
  expect(() => new Date(preset.exportedAt)).not.toThrow();
});
it('uses provided exportedAt', () => {
  const ts = '2026-05-28T12:00:00.000Z';
  const preset = serializePreset(defaultSession(), ts);
  expect(preset.exportedAt).toBe(ts);
});
it('copies main, files, and transport from session', () => {
  const session = defaultSession();
  session.main.filename = 'my-track.mp3';
  for (let i = 0; i < 5; i++) {
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
  session.files[2].volume = 0.4;
  session.transport.masterMuted = true;
  const preset = serializePreset(session);
  expect(preset.main.filename).toBe('my-track.mp3');
  expect(preset.files[2].volume).toBe(0.4);
  expect(preset.transport.masterMuted).toBe(true);
});
it('includes snapshots in preset', () => {
  const session = defaultSession();
  session.snapshots = [makeSnapshot({ name: 'My Snap' })];
  const preset = serializePreset(session);
  expect(preset.snapshots).toHaveLength(1);
  expect(preset.snapshots[0].name).toBe('My Snap');
});
it('includes ab slots in preset', () => {
  const session = defaultSession();
  session.ab.a = makeSnapshot({ name: 'A Slot' });
  const preset = serializePreset(session);
  expect(preset.ab.a).not.toBeNull();
  expect(preset.ab.a!.name).toBe('A Slot');
  expect(preset.ab.b).toBeNull();
});
it('produces empty snapshots and null ab when session has none', () => {
  const preset = serializePreset(defaultSession());
  expect(preset.snapshots).toEqual([]);
  expect(preset.ab).toEqual({ a: null, b: null });
});
it('removes browser-local media references from portable exports', () => {
  const session = defaultSession();
  const assetId = `sha256-${'d'.repeat(64)}`;
  session.main.assetId = assetId;
  session.files.push({
    id: 'file-1',
    order: 0,
    volume: 1,
    filename: 'audio.wav',
    assetId,
    thumbnailUrl: null,
    bpm: null,
    bpmConfidence: null,
  });
  const preset = serializePreset(session);
  expect(preset.main.assetId).toBeNull();
  expect(preset.files[0].assetId).toBeNull();
  expect(session.main.assetId).toBe(assetId);
});
it('omits artwork so allowed snapshot saves remain importable', () => {
  const artwork = `data:image/png;base64,${'a'.repeat(640_820)}`;
  const session = defaultSession();
  session.main.thumbnailUrl = artwork;
  session.snapshots = Array.from({ length: 3 }, (_, index) => {
    const snapshot = makeSnapshot({ id: `snap-${index}` });
    snapshot.main.thumbnailUrl = artwork;
    snapshot.files[0]!.thumbnailUrl = artwork;
    return snapshot;
  });

  const preset = serializePreset(session, '2026-10-06T00:00:00.000Z');
  const json = JSON.stringify(preset, null, 2);

  expect(preset.main.thumbnailUrl).toBeNull();
  expect(preset.snapshots.every((snapshot) => snapshot.main.thumbnailUrl === null)).toBe(true);
  expect(preset.snapshots.every((snapshot) => snapshot.files[0]!.thumbnailUrl === null)).toBe(true);
  expect(new Blob([json]).size).toBeLessThanOrEqual(2_000_000);
  expect(() => parsePreset(JSON.parse(json) as unknown)).not.toThrow();
});
