import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
const engine = vi.hoisted(() => ({ getStereoLevels: vi.fn() }));
vi.mock('../../store/useAudioLabStore', () => ({
  useAudioLabStore: (selector?: (state: Record<string, unknown>) => unknown) =>
    selector ? selector(store.state) : store.state,
}));
vi.mock('../../audio/AudioEngine', () => ({ audioEngine: engine }));

import { useGlobalShortcuts } from '../../hooks/useGlobalShortcuts';
import { KeyboardHelp } from './KeyboardHelp';
import { SessionControls } from './SessionControls';
import { StatusMessage } from './StatusMessage';
import { StereoMeter } from '../transport/StereoMeter';
import { TransportBar } from '../transport/TransportBar';

function baseStore(): Record<string, unknown> {
  const actions = Object.fromEntries(
    'play,pause,stop,toggleMasterMute,seekToStart,jumpBack,jumpForward,clearMainSelection,setMainLoop,setMasterVolume,exportPreset,importPreset,resetSession,exportReportJson,exportReportMarkdown,dismissStatus'
      .split(',')
      .map((name) => [name, vi.fn()]),
  );
  return {
    ...actions,
    mainTrack: { buffer: null, loop: false, selection: null },
    transport: { playing: false, masterVolume: 0.8, masterMuted: false },
    statusMessage: null,
    canPlay: vi.fn(() => false),
  };
}

beforeEach(() => {
  store.state = baseStore();
  engine.getStereoLevels.mockReset().mockReturnValue({ left: 0, right: 0 });
});

it('traps keyboard-help focus and closes by button, backdrop, toggle, and Escape', () => {
  render(<KeyboardHelp />);
  const trigger = screen.getByRole('button', { name: 'Keyboard shortcuts' });
  fireEvent.click(trigger);
  const close = screen.getByRole('button', { name: 'Close keyboard shortcuts' });
  expect(close).toHaveFocus();
  fireEvent.keyDown(window, { key: 'Tab' });
  expect(close).toHaveFocus();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(trigger).toHaveFocus();
  fireEvent.click(trigger);
  fireEvent.click(document.querySelector('.kb-help-backdrop')!);
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.click(trigger);
  fireEvent.click(trigger);
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('operates session import, export, reset, and report controls', () => {
  const { container } = render(<SessionControls />);
  const input = container.querySelector('input[type=file]') as HTMLInputElement;
  const click = vi.spyOn(input, 'click');
  fireEvent.click(screen.getByText('Import session'));
  expect(click).toHaveBeenCalledOnce();
  const file = new File(['{}'], 'session.json', { type: 'application/json' });
  fireEvent.change(input, { target: { files: [file] } });
  fireEvent.change(input, { target: { files: [] } });
  fireEvent.click(screen.getByText('Export session'));
  fireEvent.click(screen.getByText('Reset session'));
  fireEvent.click(screen.getByText('JSON report'));
  fireEvent.click(screen.getByText('Markdown report'));
  expect(store.state.importPreset).toHaveBeenCalledWith(file);
  expect(store.state.exportPreset).toHaveBeenCalledOnce();
  expect(store.state.resetSession).toHaveBeenCalledOnce();
  expect(store.state.exportReportJson).toHaveBeenCalledOnce();
  expect(store.state.exportReportMarkdown).toHaveBeenCalledOnce();
});

it('renders and dismisses status messages', () => {
  const { container, rerender } = render(<StatusMessage />);
  expect(container).toBeEmptyDOMElement();
  store.state.statusMessage = 'Ready';
  rerender(<StatusMessage />);
  fireEvent.click(screen.getByRole('status'));
  expect(store.state.dismissStatus).toHaveBeenCalledOnce();
});

it('routes every global shortcut and ignores interactive or foreign targets', () => {
  const { rerender, unmount } = renderHook(() => useGlobalShortcuts());
  for (const event of [
    { code: 'Space' },
    { key: 'm', altKey: true },
    { code: 'Home' },
    { code: 'ArrowLeft' },
    { code: 'ArrowRight' },
    { code: 'Escape' },
  ]) {
    fireEvent.keyDown(document.body, event);
  }
  const handledLocally = new KeyboardEvent('keydown', {
    code: 'ArrowRight',
    bubbles: true,
    cancelable: true,
  });
  handledLocally.preventDefault();
  document.body.dispatchEvent(handledLocally);
  const slider = document.createElement('canvas');
  slider.setAttribute('role', 'slider');
  document.body.append(slider);
  fireEvent.keyDown(slider, { code: 'ArrowRight' });
  slider.remove();
  expect(store.state.play).toHaveBeenCalledOnce();
  expect(store.state.toggleMasterMute).toHaveBeenCalledOnce();
  expect(store.state.seekToStart).toHaveBeenCalledOnce();
  expect(store.state.jumpBack).toHaveBeenCalledOnce();
  expect(store.state.jumpForward).toHaveBeenCalledOnce();
  expect(store.state.stop).toHaveBeenCalledOnce();
  store.state.transport = { playing: true, masterVolume: 1, masterMuted: false };
  store.state.mainTrack = {
    buffer: null,
    loop: false,
    selection: { startSeconds: 0, endSeconds: 1 },
  };
  rerender();
  fireEvent.keyDown(document.body, { code: 'Space' });
  fireEvent.keyDown(document.body, { code: 'Escape' });
  fireEvent.keyDown(document.body, { code: 'Unknown' });
  fireEvent.keyDown(document.body, { key: 'm' });
  fireEvent.keyDown(document.body, { key: 'm', ctrlKey: true });
  fireEvent.keyDown(document.body, { key: 'm', metaKey: true });
  fireEvent.keyDown(document.createElement('input'), { code: 'Space' });
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
  expect(store.state.pause).toHaveBeenCalledOnce();
  expect(store.state.clearMainSelection).toHaveBeenCalledOnce();
  unmount();
});

it('operates the transport bar for an available file', () => {
  store.state.mainTrack = { buffer: { sampleRate: 44_100 }, loop: false, selection: null };
  store.state.canPlay = vi.fn(() => true);
  render(<TransportBar />);
  fireEvent.click(screen.getByTitle('Toggle loop'));
  fireEvent.click(screen.getByTitle('Play (Space)'));
  fireEvent.click(screen.getByTitle('Restart from beginning (Home)'));
  fireEvent.click(screen.getByTitle('Stop (Esc)'));
  expect(store.state.setMainLoop).toHaveBeenCalledWith(true);
  expect(store.state.play).toHaveBeenCalledOnce();
  expect(store.state.seekToStart).toHaveBeenCalledOnce();
  expect(store.state.stop).toHaveBeenCalledOnce();
});

it('animates stereo meter attack and decay and cancels on unmount', () => {
  const callbacks: FrameRequestCallback[] = [];
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => (callbacks.push(callback), callbacks.length)),
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  store.state.transport = { playing: true, masterVolume: 1, masterMuted: false };
  engine.getStereoLevels
    .mockReturnValueOnce({ left: 2, right: 0.5 })
    .mockReturnValue({ left: 0, right: 0 });
  const { container, unmount } = render(<StereoMeter />);
  act(() => callbacks.shift()?.(0));
  const bars = container.querySelectorAll<HTMLElement>('.stereo-meter-bar');
  expect(Number.parseFloat(bars[0]!.style.width)).toBeGreaterThan(0);
  act(() => callbacks.shift()?.(16));
  expect(Number.parseFloat(bars[1]!.style.width)).toBeGreaterThan(0);
  const pending = callbacks.shift();
  unmount();
  act(() => pending?.(32));
  expect(cancelAnimationFrame).toHaveBeenCalled();
});
