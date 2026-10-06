interface SessionControlButtonProps {
  label: string;
  title: string;
  onClick: () => void;
  reset?: boolean;
}

export function SessionControlButton({
  label,
  title,
  onClick,
  reset = false,
}: SessionControlButtonProps) {
  return (
    <button
      className={`preset-btn${reset ? ' preset-btn--reset' : ''}`}
      onClick={onClick}
      type="button"
      title={title}
    >
      {label}
    </button>
  );
}
