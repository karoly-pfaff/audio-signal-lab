import { fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { beforeEach, expect, it, vi } from 'vitest';
import App from './App';

const { mockStoreState } = vi.hoisted(() => ({
  mockStoreState: {
    mainTrack: {
      id: 'main',
      name: '',
      buffer: null,
      volume: 0.8,
      loop: false,
      thumbnailUrl: null,
      loadingState: 'empty',
      metadata: null,
      analysis: null,
      bpm: null,
      bpmConfidence: null,
      bpmAnalyzing: false,
      selection: null,
      markers: [],
      fileIdentity: null,
    },
    files: [],
    transport: { playing: false, masterVolume: 0.8, masterMuted: false },
    snapshots: [],
    ab: { a: null, b: null },
    statusMessage: null,
    ...Object.fromEntries(
      'addPointMarker,addRangeMarker,applyAB,applySnapshot,assignAB,clearMainSelection,deleteSnapshot,dismissStatus,dropFiles,duplicateSnapshot,exportPreset,exportReportJson,exportReportMarkdown,importPreset,jumpBack,jumpForward,loadMainTrack,pause,play,removeMarker,renameSnapshot,resetSession,saveSnapshot,seekTo,seekToStart,setMainLoop,setMainSelection,setMasterVolume,stop,toggleMasterMute,updateMarkerLabel'
        .split(',')
        .map((name) => [name, vi.fn()]),
    ),
    canPlay: vi.fn(() => false),
  },
}));

vi.mock('./store/useAudioLabStore', () => ({
  useAudioLabStore: (selector?: (state: typeof mockStoreState) => unknown) =>
    selector ? selector(mockStoreState) : mockStoreState,
}));

vi.mock('./components/analysis/SpectrogramDisplay', () => ({
  SpectrogramDisplay: () => null,
}));

vi.mock('./audio/AudioEngine', () => ({
  audioEngine: {
    currentTime: 0,
    clearMainBuffer: vi.fn(),
    decodeFile: vi.fn(),
    getMainDuration: vi.fn(() => 0),
    getStereoLevels: vi.fn(() => ({ left: 0, right: 0 })),
    pause: vi.fn(),
    play: vi.fn(),
    removeFileBuffer: vi.fn(),
    seek: vi.fn(),
    setFileVolume: vi.fn(),
    setMainBuffer: vi.fn(),
    setMainEndedHandler: vi.fn(),
    setMainLoop: vi.fn(),
    setMainLoopPoints: vi.fn(),
    setMainVolume: vi.fn(),
    setMasterMute: vi.fn(),
    setMasterVolume: vi.fn(),
    stop: vi.fn(),
  },
}));

function canvasContext(): CanvasRenderingContext2D {
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
    setLineDash: vi.fn(),
    stroke: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

async function expectNoAxeViolations(container: HTMLElement): Promise<void> {
  const result = await axe.run(container, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
    },
    rules: {
      // jsdom cannot calculate rendered colors; browser validation covers this rule.
      'color-contrast': { enabled: false },
    },
  });
  const details = result.violations
    .map(
      (violation) =>
        `${violation.id}: ${violation.help}\n${violation.nodes
          .map((node) => `  ${node.target.join(' ')}: ${node.failureSummary ?? ''}`)
          .join('\n')}`,
    )
    .join('\n');
  expect(result.violations, details).toEqual([]);
}

// Suite: application accessibility
beforeEach(() => {
  localStorage.clear();
  Object.assign(mockStoreState.mainTrack, {
    name: '',
    buffer: null,
    loadingState: 'empty',
    selection: null,
    markers: [],
  });
  mockStoreState.canPlay.mockReturnValue(false);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext());
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1),
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

it('has no automated WCAG 2.2 A/AA violations in the initial state', async () => {
  const { container } = render(<App />);
  await expectNoAxeViolations(container);
});

it('has no automated WCAG 2.2 A/AA violations with audio loaded', async () => {
  const buffer = {
    duration: 4,
    length: 4,
    numberOfChannels: 1,
    sampleRate: 44_100,
    getChannelData: () => new Float32Array([0, 0.5, -0.5, 0]),
  } as unknown as AudioBuffer;
  Object.assign(mockStoreState.mainTrack, {
    name: 'accessible.wav',
    buffer,
    loadingState: 'loaded',
  });
  mockStoreState.canPlay.mockReturnValue(true);
  const { container } = render(<App />);
  expect(screen.getByRole('slider', { name: /Seek position/ })).toHaveAttribute('tabindex', '0');
  fireEvent.click(screen.getByRole('button', { name: 'Keyboard shortcuts' }));
  expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
  await expectNoAxeViolations(container);
});
