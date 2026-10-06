import { it, expect } from 'vitest';
import { FILE_COUNT } from './persistence';
import { buildSnapshot, parseSnapshot } from './snapshots';
import type { FileState, MainTrackState, TransportState } from '../audio/types';
// Suite: snapshot — new id/order snapshot round-trip
it('buildSnapshot serializes id and order from FileState', () => {
  const layers: FileState[] = [
    {
      id: 'layer-0',
      order: 0,
      name: 'bass.mp3',
      buffer: null,
      volume: 0.8,
      loop: true,
      thumbnailUrl: null,
      loadingState: 'loaded',
      metadata: null,
    },
    {
      id: 'layer-1',
      order: 1,
      name: '',
      buffer: null,
      volume: 1,
      loop: true,
      thumbnailUrl: null,
      loadingState: 'empty',
      metadata: null,
    },
  ];
  const main: Pick<
    MainTrackState,
    'volume' | 'loop' | 'name' | 'thumbnailUrl' | 'bpm' | 'bpmConfidence'
  > = {
    volume: 0.8,
    loop: false,
    name: '',
    thumbnailUrl: null,
    bpm: null,
    bpmConfidence: null,
  };
  const transport: Pick<TransportState, 'masterVolume' | 'masterMuted'> = {
    masterVolume: 0.9,
    masterMuted: false,
  };
  const snap = buildSnapshot(main, transport, layers, 'Test');
  expect(snap.files[0].id).toBe('layer-0');
  expect(snap.files[0].order).toBe(0);
  expect(snap.files[1].id).toBe('layer-1');
  expect(snap.files[1].order).toBe(1);
});
it('round-trips a snapshot that was built from new-format layers', () => {
  const layers: FileState[] = Array.from({ length: FILE_COUNT }, (_, i) => ({
    id: `layer-${i}`,
    order: i,
    name: i === 2 ? 'drums.wav' : '',
    buffer: null,
    volume: 1,
    loop: true,
    thumbnailUrl: null,
    loadingState: 'empty' as const,
    metadata: null,
  }));
  const main: Pick<
    MainTrackState,
    'volume' | 'loop' | 'name' | 'thumbnailUrl' | 'bpm' | 'bpmConfidence'
  > = {
    volume: 0.8,
    loop: false,
    name: '',
    thumbnailUrl: null,
    bpm: null,
    bpmConfidence: null,
  };
  const transport: Pick<TransportState, 'masterVolume' | 'masterMuted'> = {
    masterVolume: 0.8,
    masterMuted: false,
  };
  const built = buildSnapshot(main, transport, layers, 'Round-trip');
  const parsed = parseSnapshot(built);
  expect(parsed).not.toBeNull();
  expect(parsed!.files).toHaveLength(FILE_COUNT);
  parsed!.files.forEach((sl, i) => {
    expect(sl.id).toBe(`layer-${i}`);
    expect(sl.order).toBe(i);
  });
  expect(parsed!.files[2].filename).toBe('drums.wav');
});
