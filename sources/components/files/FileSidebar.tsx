import { useRef } from 'react';
import { useAudioLabStore } from '../../store/useAudioLabStore';
import { FileSidebarHeader } from './FileSidebarHeader';
import { FileSidebarList } from './FileSidebarList';
import { SnapshotPanel } from '../snapshots/SnapshotPanel';

export function FileSidebar() {
  const { files, dropFiles } = useAudioLabStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragOver = (event: React.DragEvent) => {
    if (
      event.dataTransfer.types.includes('application/x-file-id') ||
      event.dataTransfer.types.includes('Files')
    ) {
      event.preventDefault();
      event.dataTransfer.dropEffect = event.dataTransfer.types.includes('application/x-file-id')
        ? 'move'
        : 'copy';
    }
  };
  const drop = (event: React.DragEvent) => {
    event.preventDefault();
    if (!event.dataTransfer.getData('application/x-file-id')) {
      dropFiles(Array.from(event.dataTransfer.files));
    }
  };
  const choose = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    if (picked.length) {
      dropFiles(picked);
    }
    event.target.value = '';
  };
  return (
    <aside className="sidebar">
      <div className="sidebar-section sidebar-section--files">
        <FileSidebarHeader count={files.length} pick={() => inputRef.current?.click()} />
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          multiple
          style={{ display: 'none' }}
          onChange={choose}
        />
        <FileSidebarList files={files} dragOver={dragOver} drop={drop} />
        <SnapshotPanel />
      </div>
    </aside>
  );
}
