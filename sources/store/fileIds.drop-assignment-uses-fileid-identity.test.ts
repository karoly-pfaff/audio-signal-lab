import { it, expect } from 'vitest';
import { assignDropFiles } from '../utils/dropAssignment';
import type { FileState } from '../audio/types';
// Suite: drop assignment uses fileId identity
it('returned assignments carry layerId string, not a slot number', () => {
  const layers: FileState[] = Array.from({ length: 3 }, (_, i) => ({
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
  const files = [new File([''], 'a.mp3', { type: 'audio/mpeg' })];
  const { assignments } = assignDropFiles(files, layers);
  expect(assignments[0].fileId).toBe('layer-0');
  expect(Object.keys(assignments[0])).not.toContain('slot');
});
it('assigns by order when layers are supplied out of order', () => {
  // Layers deliberately in reverse order in the array
  const layers: FileState[] = [
    {
      id: 'layer-4',
      order: 4,
      name: '',
      buffer: null,
      volume: 1,
      loop: true,
      thumbnailUrl: null,
      loadingState: 'empty',
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
      id: 'layer-0',
      order: 0,
      name: '',
      buffer: null,
      volume: 1,
      loop: true,
      thumbnailUrl: null,
      loadingState: 'empty',
      metadata: null,
    },
  ];
  const files = [new File([''], 'a.mp3', { type: 'audio/mpeg' })];
  const { assignments } = assignDropFiles(files, layers);
  // Should assign to the layer with lowest order, which is layer-0
  expect(assignments[0].fileId).toBe('layer-0');
});
