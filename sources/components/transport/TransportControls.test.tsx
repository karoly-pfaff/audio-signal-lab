import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { MonitorControl } from './MonitorControl';
import { TransportControls } from './TransportControls';

it('opens, adjusts, mutes, and closes the monitor control', () => {
  const setVolume = vi.fn();
  const toggleMute = vi.fn();
  const { container, rerender } = render(
    <MonitorControl volume={0} muted={false} setVolume={setVolume} toggleMute={toggleMute} />,
  );
  const control = container.querySelector('.monitor-control')!;
  fireEvent.mouseEnter(control);
  expect(screen.getByText('-∞')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('slider', { name: 'Volume' }), { target: { value: '0.4' } });
  fireEvent.click(screen.getByTitle('Mute monitor'));
  expect(setVolume).toHaveBeenCalledWith(0.4);
  expect(toggleMute).toHaveBeenCalledOnce();
  fireEvent.mouseLeave(control);
  expect(screen.queryByRole('slider', { name: 'Volume' })).toBeNull();
  rerender(<MonitorControl volume={0.5} muted setVolume={setVolume} toggleMute={toggleMute} />);
  fireEvent.mouseEnter(container.querySelector('.monitor-control')!);
  expect(screen.getByText('-6.0 dB')).toBeInTheDocument();
  expect(screen.getByTitle('Unmute monitor')).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('slider')).toHaveClass('monitor-slider-v--muted');
});

it('opens the monitor volume control from keyboard focus', () => {
  render(<MonitorControl volume={0.5} muted={false} setVolume={vi.fn()} toggleMute={vi.fn()} />);

  fireEvent.focus(screen.getByTitle('Mute monitor'));

  expect(screen.getByRole('slider', { name: 'Volume' })).toBeVisible();
  expect(screen.getByTitle('Mute monitor')).toHaveAttribute('aria-expanded', 'true');
  const slider = screen.getByRole('slider', { name: 'Volume' });
  fireEvent.blur(screen.getByTitle('Mute monitor'), { relatedTarget: slider });
  expect(slider).toBeVisible();
  fireEvent.blur(slider, { relatedTarget: null });
  expect(screen.queryByRole('slider', { name: 'Volume' })).toBeNull();
});

function transportProps() {
  return {
    playing: false,
    disabled: false,
    playable: true,
    play: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    seekToStart: vi.fn(),
    jumpBack: vi.fn(),
    jumpForward: vi.fn(),
  };
}

it('operates every transport action and switches play to pause', () => {
  const props = transportProps();
  const { rerender } = render(<TransportControls {...props} />);
  fireEvent.click(screen.getByTitle('Restart from beginning (Home)'));
  fireEvent.click(screen.getByTitle('Jump back 5s (←)'));
  fireEvent.click(screen.getByTitle('Play (Space)'));
  fireEvent.click(screen.getByTitle('Stop (Esc)'));
  fireEvent.click(screen.getByTitle('Jump forward 5s (→)'));
  expect(props.seekToStart).toHaveBeenCalledOnce();
  expect(props.jumpBack.mock.calls).toEqual([[]]);
  expect(props.play).toHaveBeenCalledOnce();
  expect(props.stop).toHaveBeenCalledOnce();
  expect(props.jumpForward.mock.calls).toEqual([[]]);
  rerender(<TransportControls {...props} playing />);
  fireEvent.click(screen.getByTitle('Pause (Space)'));
  expect(props.pause).toHaveBeenCalledOnce();
});

it('disables transport actions when unavailable', () => {
  const props = transportProps();
  const { rerender } = render(<TransportControls {...props} playable={false} />);
  expect(screen.getByTitle('Play (Space)')).toBeDisabled();
  rerender(<TransportControls {...props} disabled />);
  for (const button of screen.getAllByRole('button')) {
    expect(button).toBeDisabled();
  }
});
