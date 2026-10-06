import { it, expect } from 'vitest';
import { buildSnapshot, parseSnapshot } from './snapshots';
import type { FileState, MainTrackState, TransportState } from '../audio/types';
// Suite: applyReorder — snapshot captures reordered order
const main: Pick<
  MainTrackState,
  'volume' | 'loop' | 'name' | 'thumbnailUrl' | 'bpm' | 'bpmConfidence'
> = {
  volume: 1,
  loop: false,
  name: '',
  thumbnailUrl: null,
  bpm: null,
  bpmConfidence: null,
};
const transport: Pick<TransportState, 'masterVolume' | 'masterMuted'> = {
  masterVolume: 1,
  masterMuted: false,
};
it('buildSnapshot serializes the reordered file order', () => {
  // layer-1 first, layer-0 second (after reorder)
  const layers: FileState[] = [
    {
      id: 'layer-1',
      order: 0,
      name: 'b.mp3',
      buffer: null,
      volume: 1,
      loop: false,
      thumbnailUrl: null,
      loadingState: 'loaded',
      metadata: null,
    },
    {
      id: 'layer-0',
      order: 1,
      name: 'a.mp3',
      buffer: null,
      volume: 1,
      loop: false,
      thumbnailUrl: null,
      loadingState: 'loaded',
      metadata: null,
    },
    {
      id: 'layer-2',
      order: 2,
      name: '',
      buffer: null,
      volume: 1,
      loop: false,
      thumbnailUrl: null,
      loadingState: 'empty',
      metadata: null,
    },
  ];
  const snap = buildSnapshot(main, transport, layers, 'Reordered');
  expect(snap.files[0].id).toBe('layer-1');
  expect(snap.files[0].order).toBe(0);
  expect(snap.files[1].id).toBe('layer-0');
  expect(snap.files[1].order).toBe(1);
});
it('snapshot round-trips the reordered layer positions', () => {
  const layers: FileState[] = [
    {
      id: 'layer-2',
      order: 0,
      name: '',
      buffer: null,
      volume: 1,
      loop: false,
      thumbnailUrl: null,
      loadingState: 'empty',
      metadata: null,
    },
    {
      id: 'layer-0',
      order: 1,
      name: '',
      buffer: null,
      volume: 1,
      loop: false,
      thumbnailUrl: null,
      loadingState: 'empty',
      metadata: null,
    },
    {
      id: 'layer-1',
      order: 2,
      name: '',
      buffer: null,
      volume: 1,
      loop: false,
      thumbnailUrl: null,
      loadingState: 'empty',
      metadata: null,
    },
  ];
  const snap = buildSnapshot(main, transport, layers, 'Test');
  const parsed = parseSnapshot(snap);
  expect(parsed).not.toBeNull();
  expect(parsed!.files[0].id).toBe('layer-2');
  expect(parsed!.files[1].id).toBe('layer-0');
  expect(parsed!.files[2].id).toBe('layer-1');
  parsed!.files.forEach((sl, i) => {
    expect(sl.order).toBe(i);
  });
});
it('A/B snapshot captures reordered order', () => {
  // Simulate A/B capture after reordering: layer-4 moved to first
  const layers: FileState[] = [
    {
      id: 'layer-4',
      order: 0,
      name: 'kick.wav',
      buffer: null,
      volume: 0.9,
      loop: false,
      thumbnailUrl: null,
      loadingState: 'loaded',
      metadata: null,
    },
    {
      id: 'layer-0',
      order: 1,
      name: '',
      buffer: null,
      volume: 1,
      loop: false,
      thumbnailUrl: null,
      loadingState: 'empty',
      metadata: null,
    },
    {
      id: 'layer-1',
      order: 2,
      name: 'bass.mp3',
      buffer: null,
      volume: 0.8,
      loop: false,
      thumbnailUrl: null,
      loadingState: 'loaded',
      metadata: null,
    },
  ];
  const snap = buildSnapshot(main, transport, layers, 'A');
  const parsed = parseSnapshot(snap);
  expect(parsed).not.toBeNull();
  expect(parsed!.files[0].id).toBe('layer-4');
  expect(parsed!.files[0].filename).toBe('kick.wav');
  expect(parsed!.files[2].filename).toBe('bass.mp3');
});
