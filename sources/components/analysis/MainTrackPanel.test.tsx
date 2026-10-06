import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { inspectionShared } from '../../audio/inspectionShared';
import type { MainTrackState } from '../../audio/types';
import type { SpectroFrames } from '../../utils/instrumentUtils';

const store = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
const engine = vi.hoisted(() => ({ currentTime: 3, getMainDuration: vi.fn(() => 12) }));
vi.mock('../../store/useAudioLabStore', () => ({
  useAudioLabStore: () => store.state,
}));
vi.mock('../../audio/AudioEngine', () => ({ audioEngine: engine }));
vi.mock('./SpectrogramDisplay', async () => {
  const React = await import('react');
  const frames = {
    flat: new Float32Array([0.5]),
    numFrames: 1,
    binsPerFrame: 1,
    centroidBin: 0,
  };
  return {
    SpectrogramDisplay: ({ onSpectroData }: { onSpectroData: (data: SpectroFrames) => void }) => {
      React.useEffect(() => onSpectroData(frames), [onSpectroData]);
      return (
        <button type="button" onClick={() => onSpectroData(frames)}>
          spectrogram
        </button>
      );
    },
  };
});

import { MainTrackPanel } from './MainTrackPanel';

function audioBuffer(): AudioBuffer {
  return {
    duration: 12,
    length: 4,
    numberOfChannels: 2,
    sampleRate: 44_100,
    getChannelData: (channel: number) =>
      channel ? new Float32Array([0, -0.2, 0.4, -0.6]) : new Float32Array([0, 0.5, -0.5, 0]),
  } as unknown as AudioBuffer;
}

function mainTrack(buffer: AudioBuffer | null): MainTrackState {
  return {
    id: 'main',
    name: buffer ? 'main.wav' : '',
    buffer,
    volume: 0.8,
    loop: false,
    thumbnailUrl: null,
    loadingState: buffer ? 'loaded' : 'empty',
    metadata: null,
    analysis: buffer
      ? {
          durationSeconds: 12,
          sampleRate: 44_100,
          channelCount: 2,
          peakAmplitude: 1,
          peakDb: 0,
          rmsAmplitude: 0.5,
          rmsDb: -6,
          crestFactorDb: 6,
          dynamicRangeProxyDb: 12,
          dcOffset: 0,
          clippedSampleCount: 1,
          clippedSampleRatio: 0.001,
          clippingRisk: 'high',
          silentSampleRatio: 0.1,
          silentRegionCount: 1,
          longestSilentRegionSeconds: 1,
          silentRegions: [{ startSeconds: 0, endSeconds: 1 }],
          clippingRegions: [{ startSeconds: 3, endSeconds: 3.1 }],
        }
      : null,
    bpm: 120,
    bpmConfidence: 'high',
    bpmAnalyzing: false,
    selection: buffer ? { startSeconds: 2, endSeconds: 4 } : null,
    markers: buffer
      ? [{ id: 'm', type: 'point', startSeconds: 1, label: 'One', createdAt: 1 }]
      : [],
    fileIdentity: null,
  };
}

function canvasContext(): CanvasRenderingContext2D {
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
    setLineDash: vi.fn(),
    stroke: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

beforeEach(() => {
  inspectionShared.setSpectroFrames(null);
  store.state = {
    mainTrack: mainTrack(null),
    addPointMarker: vi.fn(),
    addRangeMarker: vi.fn(),
    clearMainSelection: vi.fn(),
    jumpToMarker: vi.fn(),
    loadMainTrack: vi.fn(),
    removeMarker: vi.fn(),
    seekTo: vi.fn(),
    setMainSelection: vi.fn(),
    updateMarkerLabel: vi.fn(),
  };
  vi.stubGlobal('PointerEvent', MouseEvent);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext());
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1),
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

function drag(panel: Element, type: string, files: File[], types = ['Files']): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    relatedTarget: document.body,
  });
  Object.defineProperty(event, 'dataTransfer', { value: { types, files, dropEffect: '' } });
  fireEvent(panel, event);
}

it('stays empty and accepts only audio file drops', () => {
  const { container } = render(<MainTrackPanel />);
  const panel = container.querySelector('.main-track-panel')!;
  expect(panel).not.toHaveClass('main-track-panel--loaded');
  drag(panel, 'dragover', []);
  expect(panel).toHaveClass('main-track-panel--drag-over');
  drag(panel, 'dragleave', []);
  expect(panel).not.toHaveClass('main-track-panel--drag-over');
  drag(panel, 'dragover', [], []);
  const text = new File(['text'], 'notes.txt', { type: 'text/plain' });
  drag(panel, 'drop', [text]);
  expect(store.state.loadMainTrack).not.toHaveBeenCalled();
  const audio = new File(['audio'], 'main.wav', { type: 'audio/wav' });
  drag(panel, 'drop', [audio]);
  expect(store.state.loadMainTrack).toHaveBeenCalledWith(audio);
});

it('renders the dashboard and routes marker, selection, spectrogram, and seek actions', () => {
  store.state.mainTrack = mainTrack(audioBuffer());
  const { container } = render(<MainTrackPanel />);
  expect(container.querySelector('.main-track-panel')).toHaveClass('main-track-panel--loaded');
  fireEvent.click(screen.getByText('+ Marker'));
  fireEvent.click(screen.getByText('+ From Selection'));
  fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
  fireEvent.click(screen.getByText('spectrogram'));
  expect(store.state.addPointMarker).toHaveBeenCalledOnce();
  expect(store.state.addRangeMarker).toHaveBeenCalledOnce();
  expect(store.state.clearMainSelection).toHaveBeenCalledOnce();
  const waveform = screen.getByRole('slider') as HTMLCanvasElement;
  waveform.setPointerCapture = vi.fn();
  vi.spyOn(waveform, 'getBoundingClientRect').mockReturnValue({ left: 0, width: 100 } as DOMRect);
  fireEvent.pointerDown(waveform, { clientX: 50, pointerId: 1 });
  fireEvent.pointerUp(waveform, { clientX: 50, pointerId: 1 });
  expect(store.state.seekTo).toHaveBeenCalledWith(6);
  expect(container.querySelector('.band-lanes-section')).toBeInTheDocument();
});

it('keeps synchronously published spectrogram frames for the current buffer', async () => {
  const buffer = audioBuffer();
  store.state.mainTrack = mainTrack(buffer);
  render(<MainTrackPanel />);
  await waitFor(() => expect(inspectionShared.hasSpectroFramesFor(buffer)).toBe(true));
});
