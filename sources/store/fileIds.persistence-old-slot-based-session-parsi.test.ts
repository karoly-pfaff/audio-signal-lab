import { it, expect } from 'vitest';
import { parseSessionBody } from './persistence';

const OLD_V3_SESSION: Record<string, unknown> = {
  version: 3,
  savedAt: '2026-01-01T00:00:00.000Z',
  main: {
    loop: false,
    volume: 0.8,
    pan: 0,
    filename: null,
    thumbnailUrl: null,
    bpm: null,
    bpmConfidence: null,
  },
  layers: [
    {
      slot: 0,
      volume: 0.7,
      pan: 0.2,
      muted: true,
      soloed: false,
      filename: 'bass.mp3',
      thumbnailUrl: null,
      bpm: 120,
      bpmConfidence: 'high',
    },
    {
      slot: 2,
      volume: 0.5,
      pan: 0,
      muted: false,
      soloed: true,
      filename: null,
      thumbnailUrl: null,
      bpm: null,
      bpmConfidence: null,
    },
  ],
  transport: { masterVolume: 0.9, masterMuted: false },
  snapshots: [],
  ab: { a: null, b: null },
};

// Suite: persistence — old slot-based session parsing
it('loads old v3 session with slot-keyed layers without slot expansion', () => {
  const session = parseSessionBody(OLD_V3_SESSION);
  // 2 raw layers → 2 files, no slot expansion
  expect(session.files).toHaveLength(2);
  // Slot 0 → id inferred as 'file-0', order = 0
  const file0 = session.files[0];
  expect(file0.id).toBe('file-0');
  expect(file0.order).toBe(0);
  expect(file0.volume).toBe(0.7);
  expect(file0.filename).toBe('bass.mp3');
  // Slot 2 → id inferred as 'file-2', order = 2
  const file1 = session.files[1];
  expect(file1.id).toBe('file-2');
  expect(file1.order).toBe(2);
  expect(file1.volume).toBe(0.5);
});
