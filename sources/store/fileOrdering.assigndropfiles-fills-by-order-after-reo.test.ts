import { it, expect } from 'vitest';
import { assignDropFiles } from '../utils/dropAssignment';
import type { FileState } from '../audio/types';
// Suite: assignDropFiles — fills by order after reorder
it('assigns to the lowest-order empty layer even when array is out of insertion order', () => {
  // After reorder: layer-2 is at order 0, layer-0 is at order 1 (loaded), layer-1 at order 2
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
      name: 'loaded.mp3',
      buffer: null,
      volume: 1,
      loop: false,
      thumbnailUrl: null,
      loadingState: 'loaded',
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
  const files = [new File([''], 'new.mp3', { type: 'audio/mpeg' })];
  const { assignments } = assignDropFiles(files, layers);
  // layer-2 has order 0 and is empty — should be first assignment
  expect(assignments[0].fileId).toBe('layer-2');
});
it('assigns to both empty layers in order after reorder', () => {
  const layers: FileState[] = [
    {
      id: 'layer-3',
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
      id: 'layer-1',
      order: 1,
      name: '',
      buffer: null,
      volume: 1,
      loop: false,
      thumbnailUrl: null,
      loadingState: 'empty',
      metadata: null,
    },
  ];
  const files = [
    new File([''], 'a.mp3', { type: 'audio/mpeg' }),
    new File([''], 'b.mp3', { type: 'audio/mpeg' }),
  ];
  const { assignments } = assignDropFiles(files, layers);
  expect(assignments[0].fileId).toBe('layer-3'); // order 0 first
  expect(assignments[1].fileId).toBe('layer-1'); // order 1 second
});
