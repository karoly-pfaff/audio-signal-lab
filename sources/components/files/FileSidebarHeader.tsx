import { MAX_FILE_COUNT } from '../../store/persistence';

interface FileSidebarHeaderProps {
  count: number;
  pick: () => void;
}

export function FileSidebarHeader({ count, pick }: FileSidebarHeaderProps) {
  return (
    <div className="sidebar-section-header">
      <span className="panel-label">FILES</span>
      <button
        className="add-file-btn"
        type="button"
        onClick={pick}
        title="Add audio files"
        disabled={count >= MAX_FILE_COUNT}
      >
        + File
      </button>
    </div>
  );
}
