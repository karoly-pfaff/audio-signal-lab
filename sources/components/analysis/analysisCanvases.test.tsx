import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Marker } from '../../audio/types';
import type { SpectroFrames } from '../../utils/instrumentUtils';
import { BandLanesDisplay } from './BandLanesDisplay';
import { EnergyTimelineDisplay } from './EnergyTimelineDisplay';
import { SpectrogramMarkerOverlays } from './SpectrogramMarkerOverlays';
import { SpectrogramSelectionOverlay } from './SpectrogramSelectionOverlay';
import { StereoImagePanel } from './StereoImagePanel';
import { TransientsPanel } from './TransientsPanel';

function testContext() {
  const gradient = { addColorStop: vi.fn() };
  return {
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
    stroke: vi.fn(),
    fillStyle: '',
    font: '',
    lineWidth: 0,
    shadowBlur: 0,
    shadowColor: '',
    strokeStyle: '',
    textAlign: '',
  };
}

function audioBuffer(channels = 2): AudioBuffer {
  const data = [new Float32Array([0, 0.8, -0.4, 0.2]), new Float32Array([0, -0.2, 0.6, -0.8])];
  return {
    duration: 4,
    length: 4,
    numberOfChannels: channels,
    sampleRate: 44_100,
    getChannelData: (index: number) => data[index]!,
  } as unknown as AudioBuffer;
}

let context: ReturnType<typeof testContext>;
let frames: FrameRequestCallback[];

beforeEach(() => {
  context = testContext();
  frames = [];
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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function runFrame(): void {
  act(() => frames.shift()?.(0));
}

function setRect(element: Element): void {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    left: 10,
    width: 100,
  } as DOMRect);
}

it('draws empty, mono, and stereo image states', () => {
  const { rerender } = render(<StereoImagePanel buffer={null} />);
  expect(context.stroke).toHaveBeenCalledTimes(2);
  rerender(<StereoImagePanel buffer={audioBuffer(1)} />);
  expect(context.fillRect).toHaveBeenCalledWith(31, 70, 28, 14);
  expect(context.fillText).toHaveBeenCalledWith('MONO', 45, 80);
  const fillRectOrder = context.fillRect.mock.invocationCallOrder;
  const fillTextOrder = context.fillText.mock.invocationCallOrder;
  expect(fillRectOrder[fillRectOrder.length - 1]!).toBeLessThan(
    fillTextOrder[fillTextOrder.length - 1]!,
  );
  rerender(<StereoImagePanel buffer={audioBuffer()} />);
  expect(context.fillRect).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 2, 2);
});

it('tolerates a missing stereo image context', () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  expect(() => render(<StereoImagePanel buffer={audioBuffer()} />)).not.toThrow();
});

it('draws energy backgrounds, overlays, and hover changes', () => {
  const onHoverChange = vi.fn();
  const { container, rerender, unmount } = render(
    <EnergyTimelineDisplay buffer={null} hoverRatio={null} onHoverChange={onHoverChange} />,
  );
  expect(context.fillRect).toHaveBeenCalledWith(0, 0, 800, 36);
  rerender(
    <EnergyTimelineDisplay
      buffer={audioBuffer()}
      hoverRatio={0.2}
      playhead={0.5}
      selection={{ startSeconds: 1, endSeconds: 2 }}
      markers={[]}
      onHoverChange={onHoverChange}
      height={40}
    />,
  );
  expect(context.createLinearGradient).toHaveBeenCalled();
  runFrame();
  const wrapper = container.querySelector('.energy-timeline-wrap')!;
  setRect(wrapper);
  fireEvent.mouseMove(wrapper, { clientX: 70 });
  fireEvent.mouseLeave(wrapper);
  expect(onHoverChange.mock.calls.map(([ratio]) => ratio)).toEqual([0.6, null]);
  unmount();
  expect(cancelAnimationFrame).toHaveBeenCalled();
});

it('draws transient activity and clamps hover positions', () => {
  const onHoverChange = vi.fn();
  const { container, rerender } = render(
    <TransientsPanel buffer={null} hoverRatio={null} onHoverChange={onHoverChange} />,
  );
  rerender(
    <TransientsPanel buffer={audioBuffer()} hoverRatio={0.2} onHoverChange={onHoverChange} />,
  );
  expect(context.fillRect).toHaveBeenCalled();
  runFrame();
  const canvas = container.querySelector('canvas')!;
  setRect(canvas);
  fireEvent.mouseMove(canvas, { clientX: -10 });
  fireEvent.mouseMove(canvas, { clientX: 200 });
  fireEvent.mouseLeave(canvas);
  expect(onHoverChange.mock.calls.map(([ratio]) => ratio)).toEqual([0, 1, null]);
});

const SPECTRO: SpectroFrames = {
  flat: new Float32Array([0, 0.5, 1, 0.25, 0.2, 0.8, 0.1, 0.4]),
  numFrames: 2,
  binsPerFrame: 4,
  centroidBin: 2,
};
const MARKERS: Marker[] = [
  { id: 'p', type: 'point', startSeconds: 1, label: '', createdAt: 1 },
  { id: 'r', type: 'range', startSeconds: 2, endSeconds: 3, label: '', createdAt: 2 },
];

it('renders band lanes, labels, markers, and hover behavior', () => {
  const onHoverChange = vi.fn();
  const { container, rerender } = render(
    <BandLanesDisplay spectroFrames={null} sampleRate={44_100} hoverRatio={null} laneHeight={10} />,
  );
  expect(container).toBeEmptyDOMElement();
  rerender(
    <BandLanesDisplay
      spectroFrames={SPECTRO}
      sampleRate={44_100}
      hoverRatio={0.5}
      onHoverChange={onHoverChange}
      playhead={0.4}
      selection={{ startSeconds: 1, endSeconds: 2 }}
      duration={4}
      laneHeight={10}
      markers={MARKERS}
    />,
  );
  expect(container.querySelectorAll('.band-lane-label')).toHaveLength(4);
  expect(container.querySelector('.band-lanes-marker-point')).toBeInTheDocument();
  expect(container.querySelector('.band-lanes-marker-range')).toBeInTheDocument();
  expect(requestAnimationFrame).toHaveBeenCalled();
  runFrame();
  expect(context.drawImage).toHaveBeenCalled();
  const canvas = container.querySelector('canvas')!;
  setRect(canvas);
  fireEvent.mouseMove(canvas, { clientX: 60 });
  fireEvent.mouseLeave(canvas);
  expect(onHoverChange.mock.calls.map(([ratio]) => ratio)).toEqual([0.5, null]);
});

it('renders band lanes without optional marker metadata', () => {
  const { container } = render(
    <BandLanesDisplay spectroFrames={SPECTRO} sampleRate={44_100} hoverRatio={null} />,
  );
  expect(container.querySelector('.band-lanes-marker-layer')).toBeNull();
});

it('renders spectrogram selections and both marker types only for valid timelines', () => {
  const { container, rerender } = render(
    <>
      <SpectrogramSelectionOverlay selection={null} duration={4} />
      <SpectrogramMarkerOverlays markers={undefined} duration={4} />
    </>,
  );
  expect(container).toBeEmptyDOMElement();
  rerender(
    <>
      <SpectrogramSelectionOverlay selection={{ startSeconds: 1, endSeconds: 3 }} duration={4} />
      <SpectrogramMarkerOverlays markers={MARKERS} duration={4} />
    </>,
  );
  expect(container.querySelector('.spectrogram-selection')).toHaveStyle({ left: '25%' });
  expect(container.querySelector('.spectrogram-marker-point')).toBeInTheDocument();
  expect(container.querySelector('.spectrogram-marker-range')).toBeInTheDocument();
  rerender(
    <>
      <SpectrogramSelectionOverlay selection={{ startSeconds: 1, endSeconds: 3 }} duration={0} />
      <SpectrogramMarkerOverlays markers={MARKERS} duration={0} />
    </>,
  );
  expect(container).toBeEmptyDOMElement();
});
