import { useEffect, useRef, useState } from 'react';
import type { FileState } from '../../audio/types';
import { useAudioLabStore } from '../../store/useAudioLabStore';
import { FileRowMenuPortal } from './FileRowMenuPortal';
import type { FileRowMenuPosition } from './FileRowMenuPortal';

function loadLabel(file: FileState): string {
  if (file.buffer) {
    return 'Replace file';
  }
  if (file.loadingState === 'remembered') {
    return 'Reload file';
  }
  if (file.loadingState === 'failed') {
    return 'Retry';
  }
  return 'Load file';
}

function useEscapeClose(open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [close, open]);
}

export function FileRowMenu({ file }: { file: FileState }) {
  const { loadFile, removeFile } = useAudioLabStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [position, setPosition] = useState<FileRowMenuPosition | null>(null);
  const close = () => setPosition(null);
  useEscapeClose(Boolean(position), close);
  const toggle = (event: React.MouseEvent) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setPosition(position ? null : { top: rect.bottom + 4, right: window.innerWidth - rect.right });
  };
  const choose = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (selected) {
      loadFile(file.id, selected);
    }
    event.target.value = '';
  };
  return (
    <>
      <button
        className={`file-menu-btn${position ? ' file-menu-btn--open' : ''}`}
        type="button"
        onClick={toggle}
        title="File options"
        aria-label="File options"
        aria-haspopup="true"
        aria-expanded={Boolean(position)}
      >
        ⋮
      </button>
      {position && (
        <FileRowMenuPortal
          position={position}
          label={loadLabel(file)}
          replace={() => inputRef.current?.click()}
          remove={() => removeFile(file.id)}
          close={close}
        />
      )}
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={choose}
      />
    </>
  );
}
