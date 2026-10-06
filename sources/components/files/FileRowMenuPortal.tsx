import { createPortal } from 'react-dom';

export interface FileRowMenuPosition {
  top: number;
  right: number;
}

interface FileRowMenuPortalProps {
  position: FileRowMenuPosition;
  label: string;
  replace: () => void;
  remove: () => void;
  close: () => void;
}

export function FileRowMenuPortal({
  position,
  label,
  replace,
  remove,
  close,
}: FileRowMenuPortalProps) {
  return createPortal(
    <>
      <div
        className="file-menu-backdrop"
        onClick={(event) => {
          event.stopPropagation();
          close();
        }}
      />
      <div className="file-menu" style={position} onClick={(event) => event.stopPropagation()}>
        <button
          className="file-menu-item"
          type="button"
          onClick={() => {
            close();
            replace();
          }}
        >
          {label}
        </button>
        <div className="file-menu-separator" />
        <button
          className="file-menu-item file-menu-item--danger"
          type="button"
          onClick={() => {
            close();
            remove();
          }}
        >
          Remove
        </button>
      </div>
    </>,
    document.body,
  );
}
