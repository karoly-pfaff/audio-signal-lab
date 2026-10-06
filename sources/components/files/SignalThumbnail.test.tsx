import { render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { SignalThumbnail } from './SignalThumbnail';

afterEach(() => vi.restoreAllMocks());

it('draws thumbnail energy from a non-first audio channel', () => {
  const fillRect = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    clearRect: vi.fn(),
    fillRect,
    fillStyle: '',
  } as unknown as CanvasRenderingContext2D);
  const channels = [new Float32Array(4), new Float32Array([0, 0.75, 0, 0])];
  const buffer = {
    numberOfChannels: channels.length,
    getChannelData: (channel: number) => channels[channel]!,
  } as unknown as AudioBuffer;

  render(<SignalThumbnail buffer={buffer} size={4} />);

  expect(fillRect.mock.calls.some(([, , , height]) => Number(height) > 1)).toBe(true);
});
