import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { publishPlaybackPosition } from '../audio/playbackPositionEvents';

const engine = vi.hoisted(() => ({ currentTime: 0 }));

vi.mock('../audio/AudioEngine', () => ({ audioEngine: engine }));

import { usePlaybackTime } from './usePlaybackTime';

it('publishes a discrete engine position before the next animation frame', () => {
  const { result, unmount } = renderHook(() => usePlaybackTime());

  act(() => publishPlaybackPosition(5));

  expect(result.current).toBe(5);
  unmount();
});
