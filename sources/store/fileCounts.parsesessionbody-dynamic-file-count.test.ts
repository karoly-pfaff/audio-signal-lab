import { it, expect } from 'vitest';
import { defaultSession, parseSessionBody, FILE_COUNT } from './persistence';
// Suite: parseSessionBody — dynamic file count
function rawFile(id: string, order: number, volume: number, filename: string | null = null) {
  return {
    id,
    order,
    volume,
    pan: 0,
    muted: false,
    soloed: false,
    filename,
    thumbnailUrl: null,
    bpm: null,
    bpmConfidence: null,
  };
}

function rawSession(layers: unknown[]) {
  return {
    version: 3,
    savedAt: '2026-01-01T00:00:00.000Z',
    main: {
      loop: false,
      volume: 0.8,
      filename: null,
      thumbnailUrl: null,
      bpm: null,
      bpmConfidence: null,
    },
    layers,
    transport: { masterVolume: 0.8, masterMuted: false },
  };
}

it('parses a new-format session with 3 files as exactly 3 files', () => {
  const raw = rawSession([
    rawFile('layer-0', 0, 0.9),
    rawFile('layer-1', 1, 0.8, 'bass.mp3'),
    rawFile('layer-2', 2, 0.7),
  ]);
  const session = parseSessionBody(raw as Record<string, unknown>);
  expect(session.files).toHaveLength(3);
  expect(session.files[0].id).toBe('layer-0');
  expect(session.files[1].filename).toBe('bass.mp3');
  expect(session.files[2].volume).toBe(0.7);
});
it('parses a new-format session with 7 files as exactly 7 files', () => {
  const raw = {
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
    layers: Array.from({ length: 7 }, (_, i) => ({
      id: `layer-${i}`,
      order: i,
      volume: 1,
      pan: 0,
      muted: false,
      soloed: false,
      filename: null,
      thumbnailUrl: null,
      bpm: null,
      bpmConfidence: null,
    })),
    transport: { masterVolume: 0.8, masterMuted: false },
  };
  const session = parseSessionBody(raw as Record<string, unknown>);
  expect(session.files).toHaveLength(7);
  session.files.forEach((l, i) => {
    expect(l.id).toBe(`layer-${i}`);
    expect(l.order).toBe(i);
  });
});
it('new-format session round-trips through JSON with dynamic file count', () => {
  const original = defaultSession();
  // Simulate adding 2 files to the pool
  original.files.push({
    id: 'file-custom-a',
    order: 0,
    volume: 0.6,
    filename: 'kick.wav',
    thumbnailUrl: null,
    bpm: 120,
    bpmConfidence: 'high',
  });
  original.files.push({
    id: 'file-custom-b',
    order: 1,
    volume: 1,
    filename: null,
    thumbnailUrl: null,
    bpm: null,
    bpmConfidence: null,
  });
  const serialized = JSON.parse(JSON.stringify(original)) as Record<string, unknown>;
  const parsed = parseSessionBody(serialized);
  expect(parsed.files).toHaveLength(2);
  expect(parsed.files[0].id).toBe('file-custom-a');
  expect(parsed.files[0].filename).toBe('kick.wav');
  expect(parsed.files[0].volume).toBe(0.6);
  expect(parsed.files[1].id).toBe('file-custom-b');
  expect(parsed.files[1].order).toBe(1);
});
it('old slot-based 5-file session still produces FILE_COUNT files', () => {
  const raw = {
    version: 2,
    savedAt: '',
    main: {},
    layers: Array.from({ length: 5 }, (_, i) => ({
      slot: i,
      volume: 1,
      pan: 0,
      muted: false,
      soloed: false,
      filename: null,
      thumbnailUrl: null,
    })),
    transport: { masterVolume: 0.8, masterMuted: false },
  };
  const session = parseSessionBody(raw as Record<string, unknown>);
  expect(session.files).toHaveLength(FILE_COUNT);
});
it('empty files array produces empty files', () => {
  const raw = {
    version: 3,
    savedAt: '',
    main: {},
    layers: [],
    transport: { masterVolume: 0.8, masterMuted: false },
  };
  const session = parseSessionBody(raw as Record<string, unknown>);
  expect(session.files).toHaveLength(0);
});
