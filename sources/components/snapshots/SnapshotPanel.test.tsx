import { fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { beforeEach, expect, it, vi } from 'vitest';
import type { SessionSnapshot } from '../../store/snapshots';

const store = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock('../../store/useAudioLabStore', () => ({
  useAudioLabStore: () => store.state,
}));

import { SnapshotPanel } from './SnapshotPanel';

function snapshot(name = 'My mix'): SessionSnapshot {
  return {
    id: 'snapshot-1',
    name,
    createdAt: '2026-01-01T00:00:00.000Z',
    main: {
      volume: 0.8,
      loop: false,
      filename: null,
      thumbnailUrl: null,
      bpm: null,
      bpmConfidence: null,
    },
    masterVolume: 0.8,
    masterMuted: false,
    files: [],
  };
}

beforeEach(() => {
  store.state = {
    snapshots: [],
    ab: { a: null, b: null },
    saveSnapshot: vi.fn(),
    assignAB: vi.fn(),
    applyAB: vi.fn(),
    applySnapshot: vi.fn(),
    renameSnapshot: vi.fn(),
    duplicateSnapshot: vi.fn(),
    deleteSnapshot: vi.fn(),
  };
});

it('operates snapshot save and empty A/B slots', () => {
  render(<SnapshotPanel />);
  fireEvent.click(screen.getByRole('button', { name: 'Save current session as a snapshot' }));
  fireEvent.click(screen.getByRole('button', { name: /Assign current session.*A/ }));
  fireEvent.click(screen.getByRole('button', { name: /Assign current session.*B/ }));
  expect(store.state.saveSnapshot).toHaveBeenCalledOnce();
  expect(store.state.assignAB).toHaveBeenNthCalledWith(1, 'a');
  expect(store.state.assignAB).toHaveBeenNthCalledWith(2, 'b');
  expect(screen.getByRole('button', { name: /Apply comparison snapshot A/ })).toBeDisabled();
});

it('applies, duplicates, deletes, and compares snapshots', () => {
  const saved = snapshot();
  store.state.snapshots = [saved];
  store.state.ab = { a: saved, b: saved };
  render(<SnapshotPanel />);
  fireEvent.click(screen.getByRole('button', { name: /Apply comparison snapshot A/ }));
  fireEvent.click(screen.getByRole('button', { name: /Apply comparison snapshot B/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Apply snapshot My mix' }));
  fireEvent.click(screen.getByRole('button', { name: 'Duplicate snapshot My mix' }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete snapshot My mix' }));
  expect(store.state.applyAB).toHaveBeenCalledTimes(2);
  expect(store.state.applySnapshot).toHaveBeenCalledWith(saved.id);
  expect(store.state.duplicateSnapshot).toHaveBeenCalledWith(saved.id);
  expect(store.state.deleteSnapshot).toHaveBeenCalledWith(saved.id);
});

it('commits and cancels snapshot renaming', () => {
  store.state.snapshots = [snapshot()];
  render(<SnapshotPanel />);
  fireEvent.doubleClick(screen.getByText('My mix'));
  let input = screen.getByRole('textbox', { name: 'Snapshot name' });
  fireEvent.change(input, { target: { value: 'Renamed' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(store.state.renameSnapshot).toHaveBeenCalledWith('snapshot-1', 'Renamed');
  fireEvent.click(screen.getByRole('button', { name: 'Rename snapshot My mix' }));
  input = screen.getByRole('textbox', { name: 'Snapshot name' });
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(screen.queryByRole('textbox')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Rename snapshot My mix' }));
  input = screen.getByRole('textbox', { name: 'Snapshot name' });
  fireEvent.change(input, { target: { value: 'Blurred' } });
  fireEvent.blur(input);
  expect(store.state.renameSnapshot).toHaveBeenLastCalledWith('snapshot-1', 'Blurred');
});

it('gives the snapshot rename field an accessible name', async () => {
  store.state.snapshots = [snapshot()];
  const { container } = render(<SnapshotPanel />);
  fireEvent.click(screen.getByRole('button', { name: 'Rename snapshot My mix' }));

  const result = await axe.run(container, { runOnly: { type: 'rule', values: ['label'] } });

  expect(result.violations).toEqual([]);
});
