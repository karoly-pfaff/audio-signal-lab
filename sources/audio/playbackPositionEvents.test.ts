import { expect, it, vi } from 'vitest';
import { publishPlaybackPosition, subscribePlaybackPosition } from './playbackPositionEvents';

it('publishes positions synchronously until the listener unsubscribes', () => {
  const listener = vi.fn();
  const unsubscribe = subscribePlaybackPosition(listener);

  publishPlaybackPosition(5);
  expect(listener).toHaveBeenLastCalledWith(5);

  unsubscribe();
  publishPlaybackPosition(8);
  expect(listener).toHaveBeenCalledOnce();
});
