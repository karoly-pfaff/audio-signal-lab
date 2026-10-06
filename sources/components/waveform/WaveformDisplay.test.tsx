import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Marker } from '../../audio/types';
import { WaveformDisplay } from './WaveformDisplay';

function audioBuffer(duration = 10): AudioBuffer {
  return {
    duration,
    length: 4,
    numberOfChannels: 1,
    sampleRate: 44_100,
    getChannelData: () => new Float32Array([0, 0.5, -0.5, 0]),
  } as unknown as AudioBuffer;
}

function canvasContext(): CanvasRenderingContext2D {
  const gradient = { addColorStop: vi.fn() };
  return {
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    closePath: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    drawImage: vi.fn(),
    fill: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    setLineDash: vi.fn(),
    stroke: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

beforeEach(() => {
  vi.stubGlobal('PointerEvent', MouseEvent);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext());
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1),
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function prepareCanvas(canvas: HTMLCanvasElement): void {
  canvas.setPointerCapture = vi.fn();
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 10, width: 100 } as DOMRect);
}

it('is interactive only when a buffer and an action are available', () => {
  const { container, rerender } = render(<WaveformDisplay buffer={null} />);
  expect(screen.queryByRole('slider')).toBeNull();
  rerender(<WaveformDisplay buffer={audioBuffer()} />);
  expect(screen.queryByRole('slider')).toBeNull();
  rerender(<WaveformDisplay buffer={audioBuffer()} onSeek={vi.fn()} playhead={0.25} />);
  expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '25');
  expect(screen.getByRole('slider')).toHaveAttribute('tabindex', '0');
  expect(container.querySelector('canvas')).toHaveClass('waveform-canvas--seekable');
});

it('supports keyboard seeking, range selection, and clearing', () => {
  const onSeek = vi.fn();
  const onSelection = vi.fn();
  const onClearSelection = vi.fn();
  const { rerender } = render(
    <WaveformDisplay
      buffer={audioBuffer()}
      playhead={0.5}
      onSeek={onSeek}
      onSelection={onSelection}
      onClearSelection={onClearSelection}
    />,
  );
  const canvas = screen.getByRole('slider');
  fireEvent.keyDown(canvas, { key: 'ArrowRight' });
  expect(onSeek).toHaveBeenLastCalledWith(0.51);
  fireEvent.keyDown(canvas, { key: 'End' });
  expect(onSeek).toHaveBeenLastCalledWith(1);
  fireEvent.keyDown(canvas, { key: 'ArrowLeft', shiftKey: true });
  expect(onSelection).toHaveBeenLastCalledWith(9.9, 10);
  fireEvent.keyDown(canvas, { key: 'Escape' });
  expect(onClearSelection).toHaveBeenCalledOnce();
  rerender(
    <WaveformDisplay
      buffer={audioBuffer()}
      playhead={0.8}
      onSeek={onSeek}
      onSelection={onSelection}
      onClearSelection={onClearSelection}
    />,
  );
  fireEvent.keyDown(canvas, { key: 'ArrowLeft' });
  expect(onSeek).toHaveBeenLastCalledWith(0.79);
});

it('starts a fresh keyboard selection after the audio changes', () => {
  const onSelection = vi.fn();
  const firstBuffer = audioBuffer(100);
  const secondBuffer = audioBuffer(20);
  const { rerender } = render(
    <WaveformDisplay buffer={firstBuffer} playhead={0.5} onSelection={onSelection} />,
  );
  const canvas = screen.getByRole('slider');
  fireEvent.keyDown(canvas, { key: 'ArrowRight', shiftKey: true });
  fireEvent.keyDown(canvas, { key: 'ArrowRight', shiftKey: true });
  expect(onSelection).toHaveBeenLastCalledWith(50, 52);

  rerender(<WaveformDisplay buffer={secondBuffer} playhead={0} onSelection={onSelection} />);
  fireEvent.keyDown(canvas, { key: 'ArrowRight', shiftKey: true });
  expect(onSelection).toHaveBeenLastCalledWith(0, 0.2);
});

it('starts a fresh keyboard selection after external clearing', () => {
  const buffer = audioBuffer(10);
  const onSelection = vi.fn();
  const { rerender } = render(
    <WaveformDisplay buffer={buffer} playhead={0.5} selection={null} onSelection={onSelection} />,
  );
  const canvas = screen.getByRole('slider');
  fireEvent.keyDown(canvas, { key: 'ArrowRight', shiftKey: true });
  rerender(
    <WaveformDisplay
      buffer={buffer}
      playhead={0.5}
      selection={{ startSeconds: 5, endSeconds: 5.1 }}
      onSelection={onSelection}
    />,
  );
  fireEvent.keyDown(canvas, { key: 'ArrowRight', shiftKey: true });
  expect(onSelection).toHaveBeenLastCalledWith(5, 5.2);
  rerender(
    <WaveformDisplay buffer={buffer} playhead={0.5} selection={null} onSelection={onSelection} />,
  );
  fireEvent.keyDown(canvas, { key: 'ArrowRight', shiftKey: true });
  expect(onSelection).toHaveBeenLastCalledWith(5, 5.1);
});

it('seeks for a click-sized pointer gesture', () => {
  const onSeek = vi.fn();
  render(<WaveformDisplay buffer={audioBuffer()} onSeek={onSeek} />);
  const canvas = screen.getByRole('slider') as HTMLCanvasElement;
  prepareCanvas(canvas);
  fireEvent.pointerDown(canvas, { clientX: 50, pointerId: 1 });
  fireEvent.pointerUp(canvas, { clientX: 50, pointerId: 1 });
  expect(onSeek).toHaveBeenCalledWith(0.4);
  fireEvent.pointerUp(canvas, { clientX: 80, pointerId: 1 });
  expect(onSeek).toHaveBeenCalledOnce();
});

it('creates a sorted selection and exposes its live overlay', () => {
  const onSelection = vi.fn();
  const onHoverChange = vi.fn();
  const onClearSelection = vi.fn();
  const { container } = render(
    <WaveformDisplay
      buffer={audioBuffer()}
      variant="active"
      onSelection={onSelection}
      onHoverChange={onHoverChange}
      onClearSelection={onClearSelection}
    />,
  );
  const canvas = screen.getByRole('slider') as HTMLCanvasElement;
  prepareCanvas(canvas);
  fireEvent.pointerDown(canvas, { clientX: 90, pointerId: 1 });
  fireEvent.pointerMove(canvas, { clientX: 30, buttons: 1 });
  expect(container.querySelector('.waveform-selection')).toHaveStyle({ left: '20%', width: '60%' });
  fireEvent.pointerUp(canvas, { clientX: 30, pointerId: 1 });
  expect(onSelection).toHaveBeenCalledWith(2, 8);
  fireEvent.pointerLeave(canvas);
  fireEvent.doubleClick(canvas);
  expect(onHoverChange).toHaveBeenLastCalledWith(null);
  expect(onClearSelection).toHaveBeenCalledOnce();
});

it('manages internal hover and ignores compact hover callbacks', () => {
  const { container, rerender } = render(
    <WaveformDisplay buffer={audioBuffer()} variant="active" onSeek={vi.fn()} />,
  );
  let canvas = screen.getByRole('slider') as HTMLCanvasElement;
  prepareCanvas(canvas);
  fireEvent.pointerMove(canvas, { clientX: 105, buttons: 0 });
  expect(container.querySelector('.waveform-hover-label')).toHaveTextContent('0:09.5');
  fireEvent.pointerLeave(canvas);
  expect(container.querySelector('.waveform-hover-label')).toBeNull();
  rerender(<WaveformDisplay buffer={audioBuffer()} variant="compact" onSeek={vi.fn()} />);
  canvas = screen.getByRole('slider') as HTMLCanvasElement;
  prepareCanvas(canvas);
  fireEvent.pointerMove(canvas, { clientX: 50, buttons: 0 });
  fireEvent.pointerLeave(canvas);
  expect(container.querySelector('.waveform-hover-label')).toBeNull();
});

const MARKERS: Marker[] = [
  { id: 'p', type: 'point', startSeconds: 2, label: 'P', createdAt: 1 },
  { id: 'r', type: 'range', startSeconds: 4, endSeconds: 5, label: 'R', createdAt: 2 },
];

it('renders active regions, selection, markers, ruler, and legends', () => {
  const { container } = render(
    <WaveformDisplay
      buffer={audioBuffer(65)}
      variant="active"
      externalHoverRatio={0.01}
      selection={{ startSeconds: 5, endSeconds: 10 }}
      markers={MARKERS}
      silentRegions={[{ startSeconds: 0, endSeconds: 1 }]}
      clippingRegions={[{ startSeconds: 20, endSeconds: 20.01 }]}
    />,
  );
  expect(container.querySelector('.waveform-overlay--silence')).toBeInTheDocument();
  expect(container.querySelector('.waveform-overlay--clipping')).toBeInTheDocument();
  expect(container.querySelector('.waveform-selection')).toBeInTheDocument();
  expect(container.querySelector('.waveform-marker-point')).toBeInTheDocument();
  expect(container.querySelector('.waveform-marker-range')).toBeInTheDocument();
  expect(container.querySelectorAll('.waveform-ruler-tick').length).toBeGreaterThan(1);
  expect(container.querySelector('.waveform-legend-item--silence')).toBeInTheDocument();
  expect(container.querySelector('.waveform-legend-item--clipping')).toBeInTheDocument();
  expect(container.querySelector('.waveform-hover-label--left')).toBeInTheDocument();
});

it('omits active overlays when duration and optional data are empty', () => {
  const { container } = render(
    <WaveformDisplay buffer={audioBuffer(0)} variant="active" externalHoverRatio={null} />,
  );
  expect(container.querySelector('.waveform-ruler')).toBeNull();
  expect(container.querySelector('.waveform-selection')).toBeNull();
  expect(container.querySelector('.waveform-marker-layer')).toBeNull();
  expect(container.querySelector('.waveform-overlay-legend')).toBeNull();
});
