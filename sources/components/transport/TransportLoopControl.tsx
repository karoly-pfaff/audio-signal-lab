import { ToggleButton } from '../controls/ToggleButton';

interface TransportLoopControlProps {
  active: boolean;
  disabled: boolean;
  toggle: () => void;
}

export function TransportLoopControl({ active, disabled, toggle }: TransportLoopControlProps) {
  const icon = (
    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true">
      <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
    </svg>
  );
  return (
    <div className="transport-loop">
      <ToggleButton
        label={icon}
        active={active}
        onClick={toggle}
        variant="loop"
        title="Toggle loop"
        disabled={disabled}
      />
    </div>
  );
}
