import { afterEach, expect, it, vi } from 'vitest';
import type { Marker } from '../audio/types';
import type { BandLanes } from './instrumentUtils';
import { renderBandLanes } from './bandLanesCanvas';
import { renderComputingSpectrum, renderIdleSpectrum, renderSpectrum } from './spectrumCanvas';
import { drawTimelineOverlays, startCanvasAnimation } from './timelineCanvas';
import { renderWaveform } from './waveformCanvas';

function createTestContext() {
  const gradient = { addColorStop: vi.fn() };
  const context = {
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    closePath: vi.fn(),
    createImageData: vi.fn((width: number, height: number) => ({
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height,
    })),
    createLinearGradient: vi.fn(() => gradient),
    drawImage: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    putImageData: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    setLineDash: vi.fn(),
    stroke: vi.fn(),
    fillStyle: '',
    font: '',
    lineWidth: 0,
    shadowBlur: 0,
    shadowColor: '',
    strokeStyle: '',
    textAlign: '',
  };
  return { context, gradient };
}

function asCanvasContext(context: ReturnType<typeof createTestContext>['context']) {
  return context as unknown as CanvasRenderingContext2D;
}

function useCanvasContext(context: CanvasRenderingContext2D | null): void {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('renders the empty waveform baseline', () => {
  const { context } = createTestContext();
  useCanvasContext(asCanvasContext(context));
  const canvas = renderWaveform(null, '#abc', 80, 20);
  expect([canvas.width, canvas.height]).toEqual([80, 20]);
  expect(context.setLineDash).toHaveBeenCalledWith([3, 8]);
  expect(context.moveTo).toHaveBeenCalledWith(0, 10);
  expect(context.lineTo).toHaveBeenCalledWith(80, 10);
  expect(context.stroke).toHaveBeenCalledOnce();
});

it('returns the waveform canvas when 2D rendering is unavailable', () => {
  useCanvasContext(null);
  const canvas = renderWaveform(null, '#abc', 24, 12);
  expect([canvas.width, canvas.height]).toEqual([24, 12]);
});

it('renders filled and stroked waveform envelopes', () => {
  const { context, gradient } = createTestContext();
  useCanvasContext(asCanvasContext(context));
  const buffer = {
    numberOfChannels: 1,
    getChannelData: () => new Float32Array([-1, -0.5, 0.5, 1]),
  } as unknown as globalThis.AudioBuffer;
  renderWaveform(buffer, '#123456', 4, 20);
  expect(context.createLinearGradient).toHaveBeenCalledTimes(2);
  expect(gradient.addColorStop).toHaveBeenCalledTimes(4);
  expect(context.fill).toHaveBeenCalledTimes(2);
  expect(context.stroke).toHaveBeenCalledOnce();
  expect(context.lineTo).toHaveBeenCalledWith(3, 20);
});

it('renders waveform events that occur outside the first channel', () => {
  const { context } = createTestContext();
  useCanvasContext(asCanvasContext(context));
  const channels = [new Float32Array(4), new Float32Array([0, 0, 0.9, 0])];
  const buffer = {
    numberOfChannels: channels.length,
    getChannelData: (channel: number) => channels[channel]!,
  } as unknown as globalThis.AudioBuffer;

  renderWaveform(buffer, '#123456', 4, 20);

  expect(
    context.lineTo.mock.calls.some(([x, y]) => x === 2 && Math.abs(Number(y) - 19) < 0.001),
  ).toBe(true);
});

it('renders non-divisible waveforms through the final canvas column', () => {
  const { context } = createTestContext();
  useCanvasContext(asCanvasContext(context));
  const buffer = {
    numberOfChannels: 1,
    getChannelData: () => new Float32Array(801).fill(1),
  } as unknown as globalThis.AudioBuffer;

  renderWaveform(buffer, '#123456', 800, 20);

  expect(context.lineTo).toHaveBeenCalledWith(799, 20);
});

it('renders idle spectrum guides and labels', () => {
  const { context } = createTestContext();
  renderIdleSpectrum(asCanvasContext(context), 8, 30, [{ hz: 100, label: '100', xRatio: 0.5 }]);
  expect(context.clearRect).toHaveBeenCalledWith(0, 0, 8, 30);
  expect(context.lineTo).toHaveBeenCalledTimes(5);
  expect(context.fillText).toHaveBeenCalledWith('100', 4, 27);
  expect(context.stroke).toHaveBeenCalledTimes(2);
});

it('renders computing, empty, and populated spectrum states', () => {
  const { context, gradient } = createTestContext();
  const canvasContext = asCanvasContext(context);
  renderComputingSpectrum(canvasContext, 100, 40);
  expect(context.fillText).toHaveBeenCalledWith('computing…', 50, 20);
  renderSpectrum(canvasContext, new Float32Array(), { width: 100, height: 40 }, []);
  expect(context.createLinearGradient).not.toHaveBeenCalled();
  renderSpectrum(canvasContext, new Float32Array([0.1, 0.8]), { width: 100, height: 40 }, [
    { hz: 1_000, label: '1k', xRatio: 0.75 },
  ]);
  expect(gradient.addColorStop).toHaveBeenCalledTimes(3);
  expect(context.fill).toHaveBeenCalledOnce();
  expect(context.stroke).toHaveBeenCalledTimes(2);
  expect(context.fillText).toHaveBeenCalledWith('1k', 75, 37);
});

it('renders band lane pixels and separators', () => {
  const { context } = createTestContext();
  const lanes: BandLanes = {
    sub: new Float32Array([0, 1]),
    bass: new Float32Array([0.25, 0.5]),
    lowMid: new Float32Array([0.5, 0.25]),
    highMid: new Float32Array([1, 0]),
  };
  renderBandLanes(asCanvasContext(context), lanes, 0, { width: 2, laneHeight: 2 });
  expect(context.createImageData).not.toHaveBeenCalled();
  renderBandLanes(asCanvasContext(context), lanes, 2, { width: 2, laneHeight: 2 });
  const image = context.createImageData.mock.results[0]!.value as {
    data: Uint8ClampedArray;
    width: number;
    height: number;
  };
  expect(image.data.some((value) => value > 0)).toBe(true);
  expect(context.putImageData).toHaveBeenCalledWith(image, 0, 0);
});

it('draws selection, cursors, point markers, and range markers', () => {
  const { context } = createTestContext();
  const markers: Marker[] = [
    { id: 'p', type: 'point', startSeconds: 2, label: 'P', createdAt: 1 },
    { id: 'r', type: 'range', startSeconds: 4, endSeconds: 7, label: 'R', createdAt: 2 },
  ];
  drawTimelineOverlays(asCanvasContext(context), {
    width: 100,
    height: 20,
    duration: 10,
    selection: { startSeconds: 1, endSeconds: 3 },
    playhead: 0.5,
    hoverRatio: 0.25,
    markers,
  });
  expect(context.fillRect).toHaveBeenCalledWith(10, 0, 20, 20);
  expect(context.fillRect).toHaveBeenCalledWith(40, 0, 30, 20);
  expect(context.moveTo).toHaveBeenCalledWith(50, 0);
  expect(context.moveTo).toHaveBeenCalledWith(25, 0);
  expect(context.stroke).toHaveBeenCalledTimes(5);
});

it('skips invalid timeline overlay inputs', () => {
  const { context } = createTestContext();
  drawTimelineOverlays(asCanvasContext(context), {
    width: 100,
    height: 20,
    duration: 0,
    selection: { startSeconds: 1, endSeconds: 2 },
    playhead: -1,
    hoverRatio: 2,
    markers: [{ id: 'p', type: 'point', startSeconds: 1, label: '', createdAt: 0 }],
  });
  expect(context.save).not.toHaveBeenCalled();
});

it('animates canvas background and overlay until cancelled', () => {
  const { context } = createTestContext();
  const canvas = document.createElement('canvas');
  useCanvasContext(asCanvasContext(context));
  let frame: FrameRequestCallback | undefined;
  const request = vi.fn((callback: FrameRequestCallback) => {
    frame = callback;
    return 7;
  });
  const cancel = vi.fn();
  vi.stubGlobal('requestAnimationFrame', request);
  vi.stubGlobal('cancelAnimationFrame', cancel);
  const background = document.createElement('canvas');
  const overlay = vi.fn();
  const stop = startCanvasAnimation({
    canvas,
    width: 20,
    height: 10,
    getBackground: () => background,
    drawOverlay: overlay,
  });
  frame!(0);
  expect(context.clearRect).toHaveBeenCalledWith(0, 0, 20, 10);
  expect(context.drawImage).toHaveBeenCalledWith(background, 0, 0);
  expect(overlay).toHaveBeenCalledWith(asCanvasContext(context));
  stop();
  expect(cancel).toHaveBeenCalledWith(7);
});

it('keeps animation scheduling when no canvas context exists', () => {
  const canvas = document.createElement('canvas');
  useCanvasContext(null);
  let frame: FrameRequestCallback | undefined;
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => ((frame = callback), 3)),
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const overlay = vi.fn();
  startCanvasAnimation({
    canvas,
    width: 1,
    height: 1,
    getBackground: () => null,
    drawOverlay: overlay,
  });
  frame!(0);
  expect(overlay).not.toHaveBeenCalled();
});
