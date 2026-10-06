interface SessionFileInputProps {
  inputRef: React.RefObject<HTMLInputElement>;
  importSession: (file: File) => void;
}

export function SessionFileInput({ inputRef, importSession }: SessionFileInputProps) {
  const change = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importSession(file);
    }
    event.target.value = '';
  };
  return (
    <input
      ref={inputRef}
      type="file"
      accept=".json"
      className="preset-file-input"
      onChange={change}
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}
