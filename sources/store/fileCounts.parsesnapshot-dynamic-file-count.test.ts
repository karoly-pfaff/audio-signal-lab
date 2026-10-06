import { it, expect } from 'vitest';
import { buildSnapshot, parseSnapshot } from './snapshots';
import type { FileState, MainTrackState, TransportState } from '../audio/types';
// Suite: parseSnapshot — dynamic file count
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
it('buildSnapshot + parseSnapshot round-trips a 3-file set', () => {
  const layers: FileState[] = Array.from({ length: 3 }, (_, i) => ({
    id: `layer-${i}`,
    order: i,
    name: i === 1 ? 'bass.mp3' : '',
    buffer: null,
    volume: 1,
    loop: false,
    thumbnailUrl: null,
    loadingState: 'empty' as const,
    metadata: null,
  }));
  const built = buildSnapshot(main, transport, layers, 'Three');
  const parsed = parseSnapshot(built);
  expect(parsed).not.toBeNull();
  expect(parsed!.files).toHaveLength(3);
  parsed!.files.forEach((sl, i) => {
    expect(sl.id).toBe(`layer-${i}`);
    expect(sl.order).toBe(i);
  });
  expect(parsed!.files[1].filename).toBe('bass.mp3');
});
it('buildSnapshot + parseSnapshot round-trips a 7-file set', () => {
  const layers: FileState[] = Array.from({ length: 7 }, (_, i) => ({
    id: `layer-${i}`,
    order: i,
    name: '',
    buffer: null,
    volume: 1,
    loop: true,
    thumbnailUrl: null,
    loadingState: 'empty' as const,
    metadata: null,
  }));
  const built = buildSnapshot(main, transport, layers, 'Seven');
  const parsed = parseSnapshot(built);
  expect(parsed).not.toBeNull();
  expect(parsed!.files).toHaveLength(7);
});
it('old slot-based snapshot is parsed as-is without slot expansion', () => {
  const raw = {
    id: 'old1',
    name: 'Old',
    createdAt: '2026-01-01T00:00:00.000Z',
    main: {
      volume: 0.8,
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
        volume: 0.7,
        pan: 0,
        muted: false,
        soloed: false,
        filename: null,
        thumbnailUrl: null,
        bpm: null,
        bpmConfidence: null,
      },
      {
        slot: 2,
        volume: 0.5,
        pan: 0,
        muted: true,
        soloed: false,
        filename: null,
        thumbnailUrl: null,
        bpm: null,
        bpmConfidence: null,
      },
    ],
  };
  const parsed = parseSnapshot(raw);
  expect(parsed).not.toBeNull();
  expect(parsed!.files).toHaveLength(2);
  expect(parsed!.files[0].volume).toBe(0.7);
  expect(parsed!.files[1].volume).toBe(0.5);
});
it('snapshot with empty layers array has empty files', () => {
  const raw = {
    id: 'x',
    name: 'Empty',
    createdAt: '',
    main: {},
    masterVolume: 0.8,
    masterMuted: false,
    layers: [],
  };
  const parsed = parseSnapshot(raw);
  expect(parsed).not.toBeNull();
  expect(parsed!.files).toHaveLength(0);
});
it('A/B snapshot with custom file count round-trips', () => {
  // Simulate an A/B snapshot built from a 3-layer session
  const layers: FileState[] = [
    {
      id: 'layer-0',
      order: 0,
      name: 'a.mp3',
      buffer: null,
      volume: 0.9,
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
    {
      id: 'layer-2',
      order: 2,
      name: 'b.mp3',
      buffer: null,
      volume: 0.5,
      loop: true,
      thumbnailUrl: null,
      loadingState: 'loaded',
      metadata: null,
    },
  ];
  const snap = buildSnapshot(main, transport, layers, 'A');
  expect(snap.files).toHaveLength(3);
  const reparsed = parseSnapshot(snap);
  expect(reparsed).not.toBeNull();
  expect(reparsed!.files).toHaveLength(3);
  expect(reparsed!.files[0].filename).toBe('a.mp3');
  expect(reparsed!.files[2].volume).toBe(0.5);
});
