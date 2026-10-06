import { it, expect, beforeEach } from 'vitest';
import { loadSession } from './persistence';
// Suite: persistence
beforeEach(() => {
  localStorage.clear();
});
it('discards marker with invalid startSeconds', () => {
  const raw = {
    version: 3,
    savedAt: new Date().toISOString(),
    main: {
      loop: false,
      volume: 0.8,
      filename: null,
      thumbnailUrl: null,
      markers: [{ id: 'm1', type: 'point', startSeconds: -1, label: 'Neg', createdAt: 100 }],
    },
    files: [],
    transport: { masterVolume: 0.8, masterMuted: false },
  };
  localStorage.setItem('audio-signal-lab-session', JSON.stringify(raw));
  const loaded = loadSession();
  expect(loaded.main.markers).toHaveLength(0);
});
it('discards range marker with missing or invalid endSeconds', () => {
  const raw = {
    version: 3,
    savedAt: new Date().toISOString(),
    main: {
      loop: false,
      volume: 0.8,
      filename: null,
      thumbnailUrl: null,
      markers: [
        { id: 'm1', type: 'range', startSeconds: 5.0, label: 'No end', createdAt: 100 },
        {
          id: 'm2',
          type: 'range',
          startSeconds: 5.0,
          endSeconds: 3.0,
          label: 'End before start',
          createdAt: 200,
        },
      ],
    },
    files: [],
    transport: { masterVolume: 0.8, masterMuted: false },
  };
  localStorage.setItem('audio-signal-lab-session', JSON.stringify(raw));
  const loaded = loadSession();
  expect(loaded.main.markers).toHaveLength(0);
});
it('trims marker labels to 80 chars on load', () => {
  const longLabel = 'A'.repeat(100);
  const raw = {
    version: 3,
    savedAt: new Date().toISOString(),
    main: {
      loop: false,
      volume: 0.8,
      filename: null,
      thumbnailUrl: null,
      markers: [{ id: 'm1', type: 'point', startSeconds: 1.0, label: longLabel, createdAt: 100 }],
    },
    files: [],
    transport: { masterVolume: 0.8, masterMuted: false },
  };
  localStorage.setItem('audio-signal-lab-session', JSON.stringify(raw));
  const loaded = loadSession();
  expect(loaded.main.markers[0].label.length).toBe(80);
});
it('discards invalid selection (endSeconds <= startSeconds)', () => {
  const raw = {
    version: 3,
    savedAt: new Date().toISOString(),
    main: {
      loop: false,
      volume: 0.8,
      filename: null,
      thumbnailUrl: null,
      selection: { startSeconds: 5.0, endSeconds: 2.0 },
    },
    files: [],
    transport: { masterVolume: 0.8, masterMuted: false },
  };
  localStorage.setItem('audio-signal-lab-session', JSON.stringify(raw));
  const loaded = loadSession();
  expect(loaded.main.selection).toBeNull();
});
it('discards invalid selection (non-numeric values)', () => {
  const raw = {
    version: 3,
    savedAt: new Date().toISOString(),
    main: {
      loop: false,
      volume: 0.8,
      filename: null,
      thumbnailUrl: null,
      selection: { startSeconds: 'bad', endSeconds: 'also bad' },
    },
    files: [],
    transport: { masterVolume: 0.8, masterMuted: false },
  };
  localStorage.setItem('audio-signal-lab-session', JSON.stringify(raw));
  const loaded = loadSession();
  expect(loaded.main.selection).toBeNull();
});
it('v1 session migration defaults selection and markers', () => {
  const v1 = {
    version: 1,
    savedAt: '2026-01-01T00:00:00.000Z',
    main: { loop: false, volume: 0.8, filename: 'track.mp3', thumbnailUrl: null },
    files: [],
    transport: { masterVolume: 0.8, masterMuted: false },
  };
  localStorage.setItem('audio-signal-lab-session', JSON.stringify(v1));
  const loaded = loadSession();
  expect(loaded.main.selection).toBeNull();
  expect(loaded.main.markers).toEqual([]);
});
