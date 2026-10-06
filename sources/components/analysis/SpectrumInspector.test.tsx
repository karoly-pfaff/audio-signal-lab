import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { inspectionShared } from '../../audio/inspectionShared';
import type { SpectroFrames } from '../../utils/instrumentUtils';
import { SpectrumInspector } from './SpectrumInspector';

const SPECTRO: SpectroFrames = {
  flat: new Float32Array([0.1, 0.5, 0.2, 0.8]),
  numFrames: 2,
  binsPerFrame: 2,
  centroidBin: 1,
};

function canvasContext() {
  const gradient = { addColorStop: vi.fn() };
  return {
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    closePath: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    fill: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    stroke: vi.fn(),
    fillStyle: '',
    font: '',
    lineWidth: 0,
    strokeStyle: '',
    textAlign: '',
  };
}

let context: ReturnType<typeof canvasContext>;
let frames: FrameRequestCallback[];

beforeEach(() => {
  context = canvasContext();
  frames = [];
  inspectionShared.setSpectroFrames(null);
  inspectionShared.setHoverRatio(null);
  inspectionShared.setPlayheadRatio(0);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => (frames.push(callback), frames.length)),
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  cleanup();
  inspectionShared.setSpectroFrames(null);
  inspectionShared.setHoverRatio(null);
  inspectionShared.setPlayheadRatio(0);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('switches from idle to live spectrum and back to computing', () => {
  const { container, unmount } = render(<SpectrumInspector sampleRate={48_000} />);
  expect(container.querySelector('canvas')).toHaveClass('spectrum-inspector-canvas--idle');
  expect(context.fillText).toHaveBeenCalled();
  act(() => inspectionShared.setSpectroFrames(SPECTRO));
  expect(container.querySelector('canvas')).not.toHaveClass('spectrum-inspector-canvas--idle');
  act(() => inspectionShared.setHoverRatio(1));
  act(() => frames.shift()?.(0));
  expect(context.createLinearGradient).toHaveBeenCalled();
  act(() => {
    inspectionShared.setSpectroFrames(null);
    frames.shift()?.(16);
  });
  expect(context.fillText).toHaveBeenCalledWith('computing…', 100, 50);
  unmount();
  expect(cancelAnimationFrame).toHaveBeenCalled();
});

it('keeps the animation alive when the canvas context is missing', () => {
  inspectionShared.setSpectroFrames(SPECTRO);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  const { unmount } = render(<SpectrumInspector />);
  act(() => frames.shift()?.(0));
  expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
  unmount();
});

it('uses the playhead frame when the waveform is not hovered', () => {
  act(() => inspectionShared.setSpectroFrames(SPECTRO));
  render(<SpectrumInspector sampleRate={48_000} />);
  context.moveTo.mockClear();

  act(() => inspectionShared.setPlayheadRatio(1));
  act(() => frames.shift()?.(0));

  expect(
    context.moveTo.mock.calls.some(
      ([x, y]) => x === 0 && Math.abs((y as number) - 69.2) < 0.000_01,
    ),
  ).toBe(true);
});

it('does not expose frames owned by the previously active buffer', () => {
  const previous = { duration: 1 } as AudioBuffer;
  const current = { duration: 2 } as AudioBuffer;
  inspectionShared.setSpectroFrames(SPECTRO, previous);

  const { container } = render(<SpectrumInspector buffer={current} sampleRate={48_000} />);

  expect(container.querySelector('canvas')).toHaveClass('spectrum-inspector-canvas--idle');
});
