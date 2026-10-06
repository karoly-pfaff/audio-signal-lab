import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { Slider } from './Slider';
import { ToggleButton } from './ToggleButton';

it('formats every slider unit and forwards numeric changes', () => {
  const onChange = vi.fn();
  const { rerender } = render(<Slider label="Volume" value={0} unit="dB" onChange={onChange} />);
  expect(screen.getByRole('slider')).toHaveAccessibleName('Volume (-∞)');
  rerender(<Slider label="Volume" value={0.5} unit="dB" onChange={onChange} />);
  expect(screen.getByRole('slider')).toHaveAccessibleName('Volume (-6.0 dB)');
  rerender(<Slider label="Pan" value={0} unit="L/R" onChange={onChange} />);
  expect(screen.getByRole('slider')).toHaveAccessibleName('Pan (C)');
  rerender(<Slider label="Pan" value={-0.4} unit="L/R" onChange={onChange} />);
  expect(screen.getByRole('slider')).toHaveAccessibleName('Pan (L40)');
  rerender(<Slider label="Pan" value={0.25} unit="L/R" onChange={onChange} />);
  expect(screen.getByRole('slider')).toHaveAccessibleName('Pan (R25)');
  rerender(<Slider label="" value={0.7} onChange={onChange} showLabel={false} />);
  expect(screen.getByRole('slider')).toHaveAccessibleName('70%');
  fireEvent.change(screen.getByRole('slider'), { target: { value: '0.35' } });
  expect(onChange).toHaveBeenCalledWith(0.35);
});

it('renders toggle variants, active state, disabled state, and clicks', () => {
  const onClick = vi.fn();
  const { rerender } = render(
    <ToggleButton label="Loop" active onClick={onClick} variant="loop" />,
  );
  const button = screen.getByRole('button');
  expect(button).toHaveClass('toggle-btn--loop', 'toggle-btn--active');
  expect(button).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(button);
  expect(onClick).toHaveBeenCalledOnce();
  rerender(<ToggleButton label="Off" active={false} onClick={onClick} disabled />);
  expect(screen.getByRole('button')).toBeDisabled();
});
