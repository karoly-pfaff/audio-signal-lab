import { it, expect, beforeEach } from 'vitest';
import { loadSession, saveSession, defaultSession, SCHEMA_VERSION } from './persistence';
// Suite: persistence
beforeEach(() => {
  localStorage.clear();
});
it('returns default session when storage is empty', () => {
  const session = loadSession();
  const def = defaultSession();
  expect(session.version).toBe(def.version);
  expect(session.main.loop).toBe(false);
  expect(session.main.filename).toBeNull();
  expect(session.files).toHaveLength(0);
});
it('defaultSession is schema version 4', () => {
  expect(defaultSession().version).toBe(4);
  expect(SCHEMA_VERSION).toBe(4);
});
it('defaultSession includes empty snapshots and ab', () => {
  const def = defaultSession();
  expect(def.snapshots).toEqual([]);
  expect(def.ab).toEqual({ a: null, b: null });
});
it('round-trips a session through save and load', () => {
  const session = defaultSession();
  session.main.filename = 'my-track.mp3';
  session.main.loop = true;
  session.main.volume = 0.6;
  session.files.push({
    id: 'file-0',
    order: 0,
    volume: 0.5,
    filename: null,
    thumbnailUrl: null,
    bpm: null,
    bpmConfidence: null,
  });
  session.transport.masterMuted = true;
  session.transport.masterVolume = 0.9;
  saveSession(session);
  const loaded = loadSession();
  expect(loaded.main.filename).toBe('my-track.mp3');
  expect(loaded.main.loop).toBe(true);
  expect(loaded.main.volume).toBe(0.6);
  expect(loaded.files[0].volume).toBe(0.5);
  expect(loaded.transport.masterMuted).toBe(true);
  expect(loaded.transport.masterVolume).toBe(0.9);
});
it('round-trips snapshots through save and load', () => {
  const session = defaultSession();
  session.snapshots = [
    {
      id: 'snap1',
      name: 'My Mix',
      createdAt: '2026-01-01T00:00:00.000Z',
      main: {
        volume: 0.7,
        loop: true,
        filename: 'beat.mp3',
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
    },
  ];
  saveSession(session);
  const loaded = loadSession();
  expect(loaded.snapshots).toHaveLength(1);
  expect(loaded.snapshots[0].name).toBe('My Mix');
  expect(loaded.snapshots[0].main.volume).toBe(0.7);
});
it('round-trips ab slots through save and load', () => {
  const session = defaultSession();
  session.ab.a = {
    id: 'ab-a',
    name: 'A',
    createdAt: '',
    main: {
      volume: 0.5,
      loop: false,
      filename: null,
      thumbnailUrl: null,
      bpm: null,
      bpmConfidence: null,
    },
    masterVolume: 0.8,
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
  };
  saveSession(session);
  const loaded = loadSession();
  expect(loaded.ab.a).not.toBeNull();
  expect(loaded.ab.a!.id).toBe('ab-a');
  expect(loaded.ab.b).toBeNull();
});
it('migrates v1 session (adds empty snapshots, ab, and null BPM)', () => {
  const v1 = {
    version: 1,
    savedAt: '2026-01-01T00:00:00.000Z',
    main: { loop: true, volume: 0.6, filename: 'old.mp3', thumbnailUrl: null },
    layers: [
      {
        slot: 0,
        volume: 0.7,
        pan: 0.1,
        muted: true,
        soloed: false,
        filename: 'bass.mp3',
        thumbnailUrl: null,
      },
    ],
    transport: { masterVolume: 0.9, masterMuted: false },
    // no snapshots, no ab, no bpm
  };
  localStorage.setItem('audio-signal-lab-session', JSON.stringify(v1));
  const loaded = loadSession();
  // Existing v1 data preserved
  expect(loaded.main.filename).toBe('old.mp3');
  expect(loaded.main.loop).toBe(true);
  expect(loaded.main.volume).toBe(0.6);
  expect(loaded.files[0].volume).toBe(0.7);
  // New fields default to empty / null
  expect(loaded.snapshots).toEqual([]);
  expect(loaded.ab).toEqual({ a: null, b: null });
  expect(loaded.main.bpm).toBeNull();
  expect(loaded.main.bpmConfidence).toBeNull();
  expect(loaded.files[0].bpm).toBeNull();
  expect(loaded.version).toBe(4);
});
it('migrates v2 session to v4 (newer fields default to null)', () => {
  const v2 = {
    version: 2,
    savedAt: '2026-01-01T00:00:00.000Z',
    main: { loop: false, volume: 0.8, filename: 'track.mp3', thumbnailUrl: null },
    layers: [
      {
        slot: 0,
        volume: 1,
        pan: 0,
        muted: false,
        soloed: false,
        filename: 'loop.wav',
        thumbnailUrl: null,
      },
    ],
    transport: { masterVolume: 0.8, masterMuted: false },
    snapshots: [],
    ab: { a: null, b: null },
    // no bpm fields
  };
  localStorage.setItem('audio-signal-lab-session', JSON.stringify(v2));
  const loaded = loadSession();
  expect(loaded.main.filename).toBe('track.mp3');
  expect(loaded.main.bpm).toBeNull();
  expect(loaded.main.bpmConfidence).toBeNull();
  expect(loaded.files[0].bpm).toBeNull();
  expect(loaded.files[0].bpmConfidence).toBeNull();
  expect(loaded.version).toBe(4);
});
it('round-trips bpm and bpmConfidence through save and load', () => {
  const session = defaultSession();
  session.main.bpm = 124;
  session.main.bpmConfidence = 'high';
  session.files.push({
    id: 'file-0',
    order: 0,
    volume: 1,
    filename: null,
    thumbnailUrl: null,
    bpm: 62,
    bpmConfidence: 'medium',
  });
  saveSession(session);
  const loaded = loadSession();
  expect(loaded.main.bpm).toBe(124);
  expect(loaded.main.bpmConfidence).toBe('high');
  expect(loaded.files[0].bpm).toBe(62);
  expect(loaded.files[0].bpmConfidence).toBe('medium');
});
