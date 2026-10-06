import type { FileState } from '../../audio/types';
import { FileRow } from './FileRow';

interface FileSidebarListProps {
  files: FileState[];
  dragOver: (event: React.DragEvent) => void;
  drop: (event: React.DragEvent) => void;
}

export function FileSidebarList({ files, dragOver, drop }: FileSidebarListProps) {
  return (
    <div
      className="files-list"
      onDragOver={dragOver}
      onDrop={drop}
      aria-label="Files — drop audio files here to load"
    >
      {files.length === 0 && (
        <div className="files-empty">
          Click <strong>+ File</strong> or drop audio here
        </div>
      )}
      {files.map((file) => (
        <FileRow key={file.id} file={file} />
      ))}
    </div>
  );
}
