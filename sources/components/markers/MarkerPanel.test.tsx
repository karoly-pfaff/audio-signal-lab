import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { Marker } from '../../audio/types';

const store = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock('../../store/useAudioLabStore', () => ({
  useAudioLabStore: () => store.state,
}));

import { MarkerPanel } from './MarkerPanel';

const MARKERS: Marker[] = [
  { id: 'later', type: 'range', startSeconds: 5, endSeconds: 5.1, label: 'Range', createdAt: 2 },
  { id: 'first', type: 'point', startSeconds: 1, label: 'Point', createdAt: 1 },
];

beforeEach(() => {
  store.state = {
    mainTrack: { markers: [] },
    jumpToMarker: vi.fn(),
    removeMarker: vi.fn(),
    updateMarkerLabel: vi.fn(),
  };
});

it('renders marker variants and operates row actions', () => {
  store.state.mainTrack = { markers: MARKERS };
  const { container } = render(<MarkerPanel />);
  expect(screen.getByText('2')).toBeInTheDocument();
  expect(container.querySelectorAll('.marker-row')[0]).toHaveTextContent('Point');
  expect(container.querySelector('.marker-type-badge--range')).toHaveAttribute(
    'title',
    'Range marker',
  );
  expect(screen.getByText('0:05.0 — 0:05.1')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Jump to Point' }));
  fireEvent.click(screen.getByRole('button', { name: 'Remove Point' }));
  expect(store.state.jumpToMarker).toHaveBeenCalledWith('first');
  expect(store.state.removeMarker).toHaveBeenCalledWith('first');
});

it('renames markers by Enter and blur and cancels with Escape', () => {
  store.state.mainTrack = { markers: MARKERS };
  render(<MarkerPanel variant="dashboard" />);
  fireEvent.click(screen.getByRole('button', { name: 'Point' }));
  let input = screen.getByRole('textbox', { name: 'Rename marker' });
  fireEvent.change(input, { target: { value: '  New point  ' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(store.state.updateMarkerLabel).toHaveBeenCalledWith('first', 'New point');
  fireEvent.click(screen.getByRole('button', { name: 'Point' }));
  input = screen.getByRole('textbox', { name: 'Rename marker' });
  fireEvent.keyDown(input, { key: 'Escape' });
  fireEvent.click(screen.getByRole('button', { name: 'Point' }));
  input = screen.getByRole('textbox', { name: 'Rename marker' });
  fireEvent.change(input, { target: { value: '   ' } });
  fireEvent.blur(input);
  expect(store.state.updateMarkerLabel).toHaveBeenCalledOnce();
});

it('shows the empty marker state and default header only in default mode', () => {
  const { rerender } = render(<MarkerPanel />);
  expect(screen.getByText('No markers yet')).toBeInTheDocument();
  expect(screen.getByText('MARKERS')).toBeInTheDocument();
  rerender(<MarkerPanel variant="dashboard" />);
  expect(screen.queryByText('MARKERS')).toBeNull();
});
