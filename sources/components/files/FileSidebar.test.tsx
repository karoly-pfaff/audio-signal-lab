import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { FileState } from '../../audio/types';
import { MAX_FILE_COUNT } from '../../store/persistence';

const store = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock('../../store/useAudioLabStore', () => ({
  useAudioLabStore: () => store.state,
}));
vi.mock('./FileRow', () => ({ FileRow: ({ file }: { file: FileState }) => <div>{file.id}</div> }));
vi.mock('../snapshots/SnapshotPanel', () => ({ SnapshotPanel: () => <div>snapshots</div> }));

import { FileSidebar } from './FileSidebar';

function file(id: string, order = 0): FileState {
  return {
    id,
    order,
    name: '',
    buffer: null,
    volume: 1,
    loop: false,
    thumbnailUrl: null,
    loadingState: 'empty',
    metadata: null,
  };
}

beforeEach(() => {
  store.state = { files: [], dropFiles: vi.fn() };
});

it('opens the picker and forwards selected files', () => {
  const { container } = render(<FileSidebar />);
  expect(screen.getByText(/Click/)).toBeInTheDocument();
  const input = container.querySelector('input[type=file]') as HTMLInputElement;
  const click = vi.spyOn(input, 'click');
  fireEvent.click(screen.getByRole('button', { name: '+ File' }));
  expect(click).toHaveBeenCalledOnce();
  const audio = new File(['audio'], 'one.wav', { type: 'audio/wav' });
  fireEvent.change(input, { target: { files: [audio] } });
  expect(store.state.dropFiles).toHaveBeenCalledWith([audio]);
  fireEvent.change(input, { target: { files: [] } });
  expect(store.state.dropFiles).toHaveBeenCalledOnce();
});

it('renders rows and disables additions at the maximum', () => {
  store.state.files = Array.from({ length: MAX_FILE_COUNT }, (_, index) =>
    file(`file-${index}`, index),
  );
  render(<FileSidebar />);
  expect(screen.getByText('file-0')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '+ File' })).toBeDisabled();
});

it('handles external drops but leaves internal reorder drops to rows', () => {
  render(<FileSidebar />);
  const list = screen.getByLabelText('Files — drop audio files here to load');
  const audio = new File(['audio'], 'one.wav', { type: 'audio/wav' });
  const external = { types: ['Files'], dropEffect: '', getData: () => '', files: [audio] };
  fireEvent.dragOver(list, { dataTransfer: external });
  expect(external.dropEffect).toBe('copy');
  fireEvent.drop(list, { dataTransfer: external });
  expect(store.state.dropFiles).toHaveBeenCalledWith([audio]);
  const internal = {
    types: ['application/x-file-id'],
    dropEffect: '',
    getData: () => 'file-1',
    files: [],
  };
  fireEvent.dragOver(list, { dataTransfer: internal });
  expect(internal.dropEffect).toBe('move');
  fireEvent.drop(list, { dataTransfer: internal });
  fireEvent.dragOver(list, { dataTransfer: { types: [], dropEffect: '' } });
  expect(store.state.dropFiles).toHaveBeenCalledOnce();
});
