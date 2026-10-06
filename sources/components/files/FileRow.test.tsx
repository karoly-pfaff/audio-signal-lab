import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { FileState } from '../../audio/types';

const store = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock('../../store/useAudioLabStore', () => ({
  useAudioLabStore: (selector?: (state: Record<string, unknown>) => unknown) =>
    selector ? selector(store.state) : store.state,
}));

import { FileRow } from './FileRow';

function file(overrides: Partial<FileState> = {}): FileState {
  return {
    id: 'file-1',
    order: 1,
    name: '',
    buffer: null,
    volume: 0.8,
    loop: false,
    thumbnailUrl: null,
    loadingState: 'empty',
    metadata: null,
    ...overrides,
  };
}

function audioBuffer(): AudioBuffer {
  return {
    duration: 4,
    length: 4,
    numberOfChannels: 1,
    sampleRate: 44_100,
    getChannelData: () => new Float32Array([0, 0.5, -1, 0.2]),
  } as unknown as AudioBuffer;
}

beforeEach(() => {
  store.state = {
    activeFileId: null,
    activateFile: vi.fn(),
    loadFile: vi.fn(),
    removeFile: vi.fn(),
    reorderFile: vi.fn(),
    setFileVolume: vi.fn(),
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: '',
  } as unknown as CanvasRenderingContext2D);
});

it('renders empty, loading, failed, remembered, and metadata states', () => {
  const { rerender } = render(<FileRow file={file()} />);
  expect(screen.getByText(/drop audio here/)).toBeInTheDocument();
  rerender(<FileRow file={file({ loadingState: 'loading' })} />);
  expect(screen.getByText('Loading…')).toBeInTheDocument();
  rerender(<FileRow file={file({ loadingState: 'failed' })} />);
  expect(screen.getByText('Decode failed')).toBeInTheDocument();
  rerender(<FileRow file={file({ name: 'saved.wav', loadingState: 'remembered' })} />);
  expect(screen.getByText('saved.wav')).toHaveClass('track-name--pending');
  rerender(
    <FileRow
      file={file({
        name: 'file.wav',
        buffer: audioBuffer(),
        loadingState: 'loaded',
        metadata: { title: 'Title', artist: 'Artist', album: 'Album' },
      })}
    />,
  );
  expect(screen.getByText('Title')).toBeInTheDocument();
  expect(screen.getByText('Artist · Album')).toBeInTheDocument();
  rerender(
    <FileRow
      file={file({
        name: 'cover.wav',
        thumbnailUrl: 'blob:cover-art',
        loadingState: 'loaded',
      })}
    />,
  );
  expect(document.querySelector('.signal-thumbnail-img')).toHaveAttribute('src', 'blob:cover-art');
});

it('activates loaded rows and changes volume without activating', () => {
  const loaded = file({ buffer: audioBuffer(), loadingState: 'loaded', name: 'file.wav' });
  store.state.activeFileId = loaded.id;
  const { container } = render(<FileRow file={loaded} />);
  const row = container.querySelector('.file-row')!;
  expect(row).toHaveClass('file-row--active', 'file-row--clickable');
  const activation = screen.getByRole('button', { name: 'Activate file.wav' });
  expect(activation).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(activation);
  expect(store.state.activateFile).toHaveBeenCalledWith(loaded.id);
  fireEvent.change(screen.getByRole('slider'), { target: { value: '0.4' } });
  expect(store.state.setFileVolume).toHaveBeenCalledWith(loaded.id, 0.4);
  expect(store.state.activateFile).toHaveBeenCalledOnce();
});

it('supports accessible keyboard reorder and drag lifecycle', () => {
  const { container } = render(<FileRow file={file()} />);
  const handle = screen.getByRole('button', { name: 'Drag to reorder' });
  fireEvent.keyDown(handle, { code: 'ArrowUp' });
  fireEvent.keyDown(handle, { code: 'ArrowUp', altKey: true });
  fireEvent.keyDown(handle, { code: 'ArrowDown', altKey: true });
  fireEvent.keyDown(handle, { code: 'End', altKey: true });
  expect(store.state.reorderFile).toHaveBeenNthCalledWith(1, 'file-1', 0);
  expect(store.state.reorderFile).toHaveBeenNthCalledWith(2, 'file-1', 2);
  const transfer = { setData: vi.fn(), effectAllowed: '' };
  fireEvent.dragStart(handle, { dataTransfer: transfer });
  expect(transfer.setData).toHaveBeenCalledWith('application/x-file-id', 'file-1');
  expect(container.querySelector('.file-row')).toHaveClass('file-row--dragging');
  fireEvent.dragEnd(handle);
  expect(container.querySelector('.file-row')).not.toHaveClass('file-row--dragging');
});

function drag(
  row: Element,
  type: string,
  transfer: Record<string, unknown>,
  clientY = 10,
  relatedTarget: EventTarget | null = null,
): void {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientY, relatedTarget });
  Object.defineProperty(event, 'dataTransfer', { value: transfer });
  fireEvent(row, event);
}

it('handles internal reorder, external audio, and drag leave', () => {
  const { container } = render(<FileRow file={file()} />);
  const row = container.querySelector('.file-row')!;
  vi.spyOn(row, 'getBoundingClientRect').mockReturnValue({ top: 0, height: 100 } as DOMRect);
  const internal = {
    types: ['application/x-file-id'],
    dropEffect: '',
    getData: (type: string) => (type === 'application/x-file-id' ? 'source' : '0'),
    files: [],
  };
  drag(row, 'dragover', internal, 10);
  expect(row).toHaveClass('file-row--drag-insert-before');
  drag(row, 'drop', internal, 10);
  expect(store.state.reorderFile).toHaveBeenLastCalledWith('source', 0);
  drag(row, 'drop', internal, 90);
  expect(store.state.reorderFile).toHaveBeenLastCalledWith('source', 1);
  drag(row, 'drop', { ...internal, getData: () => 'file-1' });
  const audio = new File(['audio'], 'clip.wav', { type: 'audio/wav' });
  const files = { types: ['Files'], dropEffect: '', getData: () => '', files: [audio] };
  drag(row, 'dragover', files);
  expect(row).toHaveClass('file-row--drag-over');
  drag(row, 'dragleave', files, 0, document.body);
  drag(row, 'drop', files);
  expect(store.state.loadFile).toHaveBeenCalledWith('file-1', audio);
});

it('operates file menu replacement, removal, toggle, backdrop, and Escape', () => {
  const loaded = file({ buffer: audioBuffer(), name: 'clip.wav', loadingState: 'loaded' });
  const { container } = render(<FileRow file={loaded} />);
  const menu = screen.getByRole('button', { name: 'File options' });
  vi.spyOn(menu, 'getBoundingClientRect').mockReturnValue({ bottom: 20, right: 30 } as DOMRect);
  fireEvent.click(menu);
  expect(screen.getByText('Replace file')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Replace file'));
  const input = container.querySelector('input[type=file]') as HTMLInputElement;
  fireEvent.change(input, {
    target: { files: [new File(['x'], 'new.wav', { type: 'audio/wav' })] },
  });
  expect(store.state.loadFile).toHaveBeenCalled();
  fireEvent.change(input, { target: { files: [] } });
  fireEvent.click(menu);
  fireEvent.keyDown(document, { key: 'Escape' });
  fireEvent.click(menu);
  fireEvent.click(screen.getByText('Remove'));
  expect(store.state.removeFile).toHaveBeenCalledWith('file-1');
  fireEvent.click(menu);
  fireEvent.click(document.querySelector('.file-menu-backdrop')!);
  expect(screen.queryByText('Remove')).toBeNull();
});
