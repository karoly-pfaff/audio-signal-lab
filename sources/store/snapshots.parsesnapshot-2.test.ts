import { it, expect } from 'vitest';
import { parseSnapshot } from './snapshots';
// Suite: parseSnapshot
it('round-trips bpm and bpmConfidence in layers', () => {
  const raw = {
    id: 'x',
    name: 'T',
    createdAt: '',
    main: { bpm: 120, bpmConfidence: 'high' },
    masterVolume: 0.8,
    masterMuted: false,
    layers: [
      {
        slot: 0,
        volume: 1,
        pan: 0,
        muted: false,
        soloed: false,
        bpm: 60,
        bpmConfidence: 'medium',
      },
    ],
  };
  const snap = parseSnapshot(raw);
  expect(snap!.main.bpm).toBe(120);
  expect(snap!.main.bpmConfidence).toBe('high');
  expect(snap!.files[0].bpm).toBe(60);
  expect(snap!.files[0].bpmConfidence).toBe('medium');
});
it('defaults bpm fields to null when missing', () => {
  const raw = {
    id: 'x',
    name: 'T',
    createdAt: '',
    main: {},
    masterVolume: 0.8,
    masterMuted: false,
    layers: [{ slot: 0, volume: 1, pan: 0, muted: false, soloed: false }],
  };
  const snap = parseSnapshot(raw);
  expect(snap!.main.bpm).toBeNull();
  expect(snap!.main.bpmConfidence).toBeNull();
  expect(snap!.files[0].bpm).toBeNull();
});
