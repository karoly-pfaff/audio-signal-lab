import { it, expect } from 'vitest';
import { assignDropFiles } from './dropAssignment';
import type { FileState } from '../audio/types';
function makeFile(name: string, type = ''): File {
  return new File([''], name, { type });
}
function makeFileSlot(order: number, loadingState: FileState['loadingState'] = 'empty'): FileState {
  return {
    id: `layer-${order}`,
    name: '',
    buffer: null,
    volume: 1,
    loop: false,
    thumbnailUrl: null,
    order,
    loadingState,
    metadata: null,
  };
}
// Suite: assignDropFiles
it('returns empty assignments for empty file list', () => {
  const layers = [makeFileSlot(0), makeFileSlot(1)];
  const { assignments, skipped } = assignDropFiles([], layers);
  expect(assignments).toHaveLength(0);
  expect(skipped).toBe(0);
});
it('assigns a single audio file to the first empty slot', () => {
  const layers = [makeFileSlot(0), makeFileSlot(1)];
  const { assignments, skipped } = assignDropFiles([makeFile('a.mp3', 'audio/mpeg')], layers);
  expect(assignments).toHaveLength(1);
  expect(assignments[0].fileId).toBe('layer-0');
  expect(skipped).toBe(0);
});
it('skips non-audio files', () => {
  const layers = [makeFileSlot(0)];
  const { assignments, skipped } = assignDropFiles([makeFile('img.jpg', 'image/jpeg')], layers);
  expect(assignments).toHaveLength(0);
  expect(skipped).toBe(1);
});
it('assigns multiple files to consecutive empty slots', () => {
  const layers = [makeFileSlot(0), makeFileSlot(1), makeFileSlot(2)];
  const files = [makeFile('a.mp3', 'audio/mpeg'), makeFile('b.wav', 'audio/wav')];
  const { assignments, skipped } = assignDropFiles(files, layers);
  expect(assignments).toHaveLength(2);
  expect(assignments[0].fileId).toBe('layer-0');
  expect(assignments[1].fileId).toBe('layer-1');
  expect(skipped).toBe(0);
});
it('skips occupied (loaded) slots', () => {
  const layers = [makeFileSlot(0, 'loaded'), makeFileSlot(1, 'empty'), makeFileSlot(2, 'empty')];
  const files = [makeFile('a.mp3', 'audio/mpeg'), makeFile('b.wav', 'audio/wav')];
  const { assignments } = assignDropFiles(files, layers);
  expect(assignments[0].fileId).toBe('layer-1');
  expect(assignments[1].fileId).toBe('layer-2');
});
it('skips remembered slots', () => {
  const layers = [makeFileSlot(0, 'remembered'), makeFileSlot(1, 'empty')];
  const files = [makeFile('a.mp3', 'audio/mpeg')];
  const { assignments } = assignDropFiles(files, layers);
  expect(assignments[0].fileId).toBe('layer-1');
});
it('returns overflow audio files in overflowFiles (not counted as skipped)', () => {
  const layers = [makeFileSlot(0)];
  const files = [makeFile('a.mp3', 'audio/mpeg'), makeFile('b.wav', 'audio/wav')];
  const { assignments, overflowFiles, skipped } = assignDropFiles(files, layers);
  expect(assignments).toHaveLength(1);
  expect(overflowFiles).toHaveLength(1);
  expect(overflowFiles[0].name).toBe('b.wav');
  expect(skipped).toBe(0); // only non-audio counts as skipped
});
it('skipped counts only non-audio; overflow is separate in overflowFiles', () => {
  const layers = [makeFileSlot(0)];
  const files = [
    makeFile('a.mp3', 'audio/mpeg'),
    makeFile('b.wav', 'audio/wav'),
    makeFile('img.jpg', 'image/jpeg'),
  ];
  const { assignments, overflowFiles, skipped } = assignDropFiles(files, layers);
  expect(assignments).toHaveLength(1);
  expect(overflowFiles).toHaveLength(1); // b.wav
  expect(skipped).toBe(1); // img.jpg only
});
it('assigns slots in ascending order position', () => {
  // Layers supplied in non-order sequence — should still assign by order
  const layers = [makeFileSlot(2), makeFileSlot(0), makeFileSlot(1)];
  const files = [makeFile('a.mp3', 'audio/mpeg'), makeFile('b.wav', 'audio/wav')];
  const { assignments } = assignDropFiles(files, layers);
  expect(assignments[0].fileId).toBe('layer-0');
  expect(assignments[1].fileId).toBe('layer-1');
});
it('returns empty assignments when all slots are occupied; file goes to overflowFiles', () => {
  const layers = [makeFileSlot(0, 'loaded'), makeFileSlot(1, 'loaded')];
  const files = [makeFile('a.mp3', 'audio/mpeg')];
  const { assignments, overflowFiles, skipped } = assignDropFiles(files, layers);
  expect(assignments).toHaveLength(0);
  expect(overflowFiles).toHaveLength(1);
  expect(skipped).toBe(0);
});
