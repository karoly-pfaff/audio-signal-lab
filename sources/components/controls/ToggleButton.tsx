interface ToggleButtonProps {
  label: React.ReactNode;
  active: boolean;
  onClick: () => void;
  variant?: 'loop' | 'default';
  title?: string;
  disabled?: boolean;
}

export function ToggleButton({
  label,
  active,
  onClick,
  variant = 'default',
  title,
  disabled,
}: ToggleButtonProps) {
  return (
    <button
      className={`toggle-btn toggle-btn--${variant}${active ? ' toggle-btn--active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      type="button"
      aria-pressed={active}
      title={title}
    >
      {label}
    </button>
  );
}
