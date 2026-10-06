import { it, expect } from 'vitest';
import { assignDropFiles } from '../utils/dropAssignment';
import type { FileState } from '../audio/types';
// Suite: assignDropFiles — overflowFiles
function makeFileSlot(order: number, loadingState: FileState['loadingState'] = 'empty'): FileState {
  return {
    id: `layer-${order}`,
    name: '',
    buffer: null,
    volume: 1,
    loop: true,
    thumbnailUrl: null,
    order,
    loadingState,
    metadata: null,
  };
}
function makeFile(name: string, type = 'audio/mpeg'): File {
  return new File([''], name, { type });
}
it('overflow audio files appear in overflowFiles, not skipped', () => {
  const layers = [makeFileSlot(0)]; // only 1 empty slot
  const files = [makeFile('a.mp3'), makeFile('b.mp3'), makeFile('c.mp3')];
  const { assignments, overflowFiles, skipped } = assignDropFiles(files, layers);
  expect(assignments).toHaveLength(1);
  expect(overflowFiles).toHaveLength(2);
  expect(overflowFiles[0].name).toBe('b.mp3');
  expect(overflowFiles[1].name).toBe('c.mp3');
  expect(skipped).toBe(0);
});
it('non-audio files count as skipped; audio overflow goes to overflowFiles', () => {
  const layers: FileState[] = []; // no empty slots
  const files = [makeFile('a.mp3'), new File([''], 'photo.jpg', { type: 'image/jpeg' })];
  const { assignments, overflowFiles, skipped } = assignDropFiles(files, layers);
  expect(assignments).toHaveLength(0);
  expect(overflowFiles).toHaveLength(1);
  expect(overflowFiles[0].name).toBe('a.mp3');
  expect(skipped).toBe(1); // photo.jpg
});
it('no overflow when all files fit in empty slots', () => {
  const layers = [makeFileSlot(0), makeFileSlot(1), makeFileSlot(2)];
  const files = [makeFile('a.mp3'), makeFile('b.mp3')];
  const { assignments, overflowFiles, skipped } = assignDropFiles(files, layers);
  expect(assignments).toHaveLength(2);
  expect(overflowFiles).toHaveLength(0);
  expect(skipped).toBe(0);
});
it('all files overflow when no empty slots exist', () => {
  const layers = [makeFileSlot(0, 'loaded'), makeFileSlot(1, 'loaded')];
  const files = [makeFile('a.mp3'), makeFile('b.mp3'), makeFile('c.mp3')];
  const { assignments, overflowFiles, skipped } = assignDropFiles(files, layers);
  expect(assignments).toHaveLength(0);
  expect(overflowFiles).toHaveLength(3);
  expect(skipped).toBe(0);
});
