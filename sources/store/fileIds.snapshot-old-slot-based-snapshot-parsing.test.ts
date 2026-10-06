import { it, expect } from 'vitest';
import { parseSnapshot } from './snapshots';

const OLD_SNAPSHOT = {
  id: 'snap1',
  name: 'My Mix',
  createdAt: '2026-01-01T00:00:00.000Z',
  main: {
    volume: 0.7,
    pan: 0,
    loop: false,
    filename: null,
    thumbnailUrl: null,
    bpm: null,
    bpmConfidence: null,
  },
  masterVolume: 0.8,
  masterMuted: false,
  layers: [
    {
      slot: 0,
      volume: 0.6,
      pan: 0,
      muted: false,
      soloed: false,
      filename: null,
      thumbnailUrl: null,
      bpm: null,
      bpmConfidence: null,
    },
    {
      slot: 3,
      volume: 0.9,
      pan: 0.5,
      muted: true,
      soloed: false,
      filename: 'kick.wav',
      thumbnailUrl: null,
      bpm: 140,
      bpmConfidence: 'medium',
    },
  ],
};

// Suite: snapshot — old slot-based snapshot parsing
it('parses old snapshot with slot-keyed layers without slot expansion', () => {
  const snap = parseSnapshot(OLD_SNAPSHOT);
  expect(snap).not.toBeNull();
  // 2 raw layers → 2 files, no slot expansion
  expect(snap!.files).toHaveLength(2);
  const file0 = snap!.files[0];
  expect(file0.id).toBe('file-0');
  expect(file0.order).toBe(0);
  expect(file0.volume).toBe(0.6);
  const file1 = snap!.files[1];
  expect(file1.id).toBe('file-3');
  expect(file1.order).toBe(3);
  expect(file1.filename).toBe('kick.wav');
});
