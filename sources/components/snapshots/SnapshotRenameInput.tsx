interface SnapshotRenameInputProps {
  inputRef: React.RefObject<HTMLInputElement>;
  name: string;
  setName: (name: string) => void;
  commit: () => void;
  cancel: () => void;
}

export function SnapshotRenameInput({
  inputRef,
  name,
  setName,
  commit,
  cancel,
}: SnapshotRenameInputProps) {
  return (
    <input
      ref={inputRef}
      className="snapshot-rename-input"
      aria-label="Snapshot name"
      value={name}
      onChange={(event) => setName(event.target.value.slice(0, 40))}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commit();
        }
        if (event.key === 'Escape') {
          cancel();
        }
      }}
    />
  );
}
