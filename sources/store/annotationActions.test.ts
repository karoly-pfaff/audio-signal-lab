import { expect, it, vi } from 'vitest';
import type { Marker } from '../audio/types';
import type { AudioLabState } from './audioLabStoreTypes';
import { createAnnotationActions } from './annotationActions';
import { MAX_MARKERS } from './sessionLimits';
import type { StoreContext } from './storeContext';
import { createEmptyMainTrack } from './storeState';

const engine = vi.hoisted(() => ({ currentTime: 1, seek: vi.fn() }));
vi.mock('../audio/AudioEngine', () => ({ audioEngine: engine }));

function marker(index: number): Marker {
  return { id: `${index}`, type: 'point', startSeconds: index, label: '', createdAt: index };
}

function harness(markers: Marker[]) {
  let state = {
    mainTrack: {
      ...createEmptyMainTrack({ volume: 1, loop: false }),
      buffer: { duration: 10 } as AudioBuffer,
      selection: { startSeconds: 1, endSeconds: 2 },
      markers,
    },
  } as AudioLabState;
  const setMainSelection = vi.fn((startSeconds: number, endSeconds: number) => {
    state.mainTrack.selection = { startSeconds, endSeconds };
  });
  state.setMainSelection = setMainSelection;
  const status = { show: vi.fn() };
  const context = {
    get: () => state,
    set: (patch: (current: AudioLabState) => Partial<AudioLabState>) => {
      state = { ...state, ...patch(state) };
    },
    status,
  } as unknown as StoreContext;
  return {
    actions: createAnnotationActions(context),
    state: () => state,
    status,
    setMainSelection,
  };
}

it('rejects point and range markers at the shared persistence limit', () => {
  const markers = Array.from({ length: MAX_MARKERS }, (_, index) => marker(index));
  const test = harness(markers);

  test.actions.addPointMarker();
  test.actions.addRangeMarker();

  expect(test.state().mainTrack.markers).toHaveLength(MAX_MARKERS);
  expect(test.status.show).toHaveBeenCalledTimes(2);
  expect(test.status.show).toHaveBeenLastCalledWith(`Marker limit reached (${MAX_MARKERS})`, 4000);
});

it('applies a range marker selection before seeking into its loop bounds', () => {
  const range: Marker = {
    id: 'range',
    type: 'range',
    startSeconds: 6,
    endSeconds: 8,
    label: 'Range',
    createdAt: 1,
  };
  const test = harness([range]);

  test.actions.jumpToMarker(range.id);

  expect(test.setMainSelection).toHaveBeenCalledWith(6, 8);
  expect(engine.seek).toHaveBeenCalledWith(6);
  expect(test.setMainSelection.mock.invocationCallOrder[0]).toBeLessThan(
    engine.seek.mock.invocationCallOrder[0]!,
  );
});
