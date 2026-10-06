interface TransportIconButtonProps {
  title: string;
  disabled: boolean;
  onClick: () => void;
  kind: string;
  children: React.ReactNode;
}

export function TransportIconButton({
  title,
  disabled,
  onClick,
  kind,
  children,
}: TransportIconButtonProps) {
  return (
    <button
      className={`transport-btn transport-btn--${kind}`}
      onClick={() => onClick()}
      disabled={disabled}
      type="button"
      title={title}
    >
      {children}
    </button>
  );
}
