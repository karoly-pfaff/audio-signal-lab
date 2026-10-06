import { it, expect, beforeEach, vi } from 'vitest';
import { loadSession, saveSession, clearSession, defaultSession } from './persistence';
// Suite: persistence
beforeEach(() => {
  localStorage.clear();
});
it('returns defaults for corrupted JSON', () => {
  localStorage.setItem('audio-signal-lab-session', '{{not json}}');
  const session = loadSession();
  const def = defaultSession();
  expect(session.main.filename).toBe(def.main.filename);
  expect(session.main.loop).toBe(def.main.loop);
});
it('returns defaults for wrong schema version', () => {
  localStorage.setItem('audio-signal-lab-session', JSON.stringify({ version: 999, main: {} }));
  const session = loadSession();
  expect(session.version).toBe(4);
  expect(session.files).toHaveLength(0);
});
it('returns defaults for non-object stored value', () => {
  localStorage.setItem('audio-signal-lab-session', '"just a string"');
  const session = loadSession();
  expect(session.main.filename).toBeNull();
});
it('clears session from storage', () => {
  expect(saveSession(defaultSession())).toBe(true);
  expect(clearSession()).toBe(true);
  expect(localStorage.getItem('audio-signal-lab-session')).toBeNull();
});
it('reports local storage write and removal failures', () => {
  const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Quota exceeded', 'QuotaExceededError');
  });
  expect(saveSession(defaultSession())).toBe(false);
  setItem.mockRestore();
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
    throw new DOMException('Denied', 'SecurityError');
  });
  expect(clearSession()).toBe(false);
  vi.restoreAllMocks();
});
it('preserves file order across save and load', () => {
  const session = defaultSession();
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
  session.files[2].filename = 'bass-loop.mp3';
  session.files[2].volume = 0.7;
  session.files[4].bpm = 130;
  saveSession(session);
  const loaded = loadSession();
  expect(loaded.files[2].filename).toBe('bass-loop.mp3');
  expect(loaded.files[2].volume).toBe(0.7);
  expect(loaded.files[4].bpm).toBe(130);
});
it('falls back to layer defaults for missing layer fields', () => {
  const raw = {
    version: 2,
    savedAt: new Date().toISOString(),
    main: { loop: false, volume: 0.8, filename: null, thumbnailUrl: null },
    layers: [{ slot: 0 }], // only slot, missing all other fields
    transport: { masterVolume: 0.8, masterMuted: false },
  };
  localStorage.setItem('audio-signal-lab-session', JSON.stringify(raw));
  const session = loadSession();
  expect(session.files[0].volume).toBe(1); // default
  expect(session.files[0].bpm).toBeNull(); // default
});
it('falls back for missing layers array to empty files', () => {
  const raw = {
    version: 2,
    savedAt: new Date().toISOString(),
    main: { loop: false, volume: 0.8, filename: null, thumbnailUrl: null },
    transport: { masterVolume: 0.8, masterMuted: false },
    // no layers key
  };
  localStorage.setItem('audio-signal-lab-session', JSON.stringify(raw));
  const session = loadSession();
  expect(session.files).toHaveLength(0);
});
it('strips network thumbnail URLs from stored sessions', () => {
  const session = defaultSession();
  session.main.thumbnailUrl = 'https://example.com/thumb.jpg';
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
    thumbnailUrl: 'https://example.com/layer.jpg',
    bpm: null,
    bpmConfidence: null,
  });
  saveSession(session);
  const loaded = loadSession();
  expect(loaded.main.thumbnailUrl).toBeNull();
  expect(loaded.files[1].thumbnailUrl).toBeNull();
});
it('defaultSession produces an empty loaded files array', () => {
  const def = defaultSession();
  expect(def.files).toHaveLength(0);
  expect(def.files).toEqual([]);
});
it('defaultSession includes null selection and empty markers', () => {
  const def = defaultSession();
  expect(def.main.selection).toBeNull();
  expect(def.main.markers).toEqual([]);
});
it('round-trips selection through save and load', () => {
  const session = defaultSession();
  session.main.selection = { startSeconds: 1.5, endSeconds: 3.75 };
  saveSession(session);
  const loaded = loadSession();
  expect(loaded.main.selection).toEqual({ startSeconds: 1.5, endSeconds: 3.75 });
});
it('round-trips point and range markers through save and load', () => {
  const session = defaultSession();
  session.main.markers = [
    { id: 'pt1', type: 'point', startSeconds: 2.0, label: 'Intro hit', createdAt: 1000 },
    {
      id: 'rng1',
      type: 'range',
      startSeconds: 5.0,
      endSeconds: 10.0,
      label: 'Verse',
      createdAt: 2000,
    },
  ];
  saveSession(session);
  const loaded = loadSession();
  expect(loaded.main.markers).toHaveLength(2);
  const pt = loaded.main.markers.find((m) => m.id === 'pt1');
  expect(pt).toBeDefined();
  expect(pt!.type).toBe('point');
  expect(pt!.startSeconds).toBe(2.0);
  expect(pt!.endSeconds).toBeUndefined();
  const rng = loaded.main.markers.find((m) => m.id === 'rng1');
  expect(rng).toBeDefined();
  expect(rng!.type).toBe('range');
  expect(rng!.startSeconds).toBe(5.0);
  expect(rng!.endSeconds).toBe(10.0);
});
it('defaults missing selection to null when loading older session', () => {
  const raw = {
    version: 3,
    savedAt: new Date().toISOString(),
    main: { loop: false, volume: 0.8, filename: null, thumbnailUrl: null },
    files: [],
    transport: { masterVolume: 0.8, masterMuted: false },
  };
  localStorage.setItem('audio-signal-lab-session', JSON.stringify(raw));
  const loaded = loadSession();
  expect(loaded.main.selection).toBeNull();
});
it('defaults missing markers to [] when loading older session', () => {
  const raw = {
    version: 3,
    savedAt: new Date().toISOString(),
    main: { loop: false, volume: 0.8, filename: null, thumbnailUrl: null },
    files: [],
    transport: { masterVolume: 0.8, masterMuted: false },
  };
  localStorage.setItem('audio-signal-lab-session', JSON.stringify(raw));
  const loaded = loadSession();
  expect(loaded.main.markers).toEqual([]);
});
it('discards marker with invalid type', () => {
  const raw = {
    version: 3,
    savedAt: new Date().toISOString(),
    main: {
      loop: false,
      volume: 0.8,
      filename: null,
      thumbnailUrl: null,
      markers: [{ id: 'm1', type: 'note', startSeconds: 1.0, label: 'Bad', createdAt: 100 }],
    },
    files: [],
    transport: { masterVolume: 0.8, masterMuted: false },
  };
  localStorage.setItem('audio-signal-lab-session', JSON.stringify(raw));
  const loaded = loadSession();
  expect(loaded.main.markers).toHaveLength(0);
});
