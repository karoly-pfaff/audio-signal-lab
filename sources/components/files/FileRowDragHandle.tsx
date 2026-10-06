import type { FileState } from '../../audio/types';
import { useAudioLabStore } from '../../store/useAudioLabStore';
import { FILE_DRAG_ID_TYPE, FILE_DRAG_ORDER_TYPE } from '../../utils/layerOrder';

interface FileRowDragHandleProps {
  file: FileState;
  setDragging: (value: boolean) => void;
}

export function FileRowDragHandle({ file, setDragging }: FileRowDragHandleProps) {
  const reorder = useAudioLabStore((state) => state.reorderFile);
  const keyDown = (event: React.KeyboardEvent) => {
    if (!event.altKey) {
      return;
    }
    if (event.code === 'ArrowUp') {
      event.preventDefault();
      reorder(file.id, file.order - 1);
    } else if (event.code === 'ArrowDown') {
      event.preventDefault();
      reorder(file.id, file.order + 1);
    }
  };
  return (
    <div
      className="drag-handle"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(FILE_DRAG_ID_TYPE, file.id);
        event.dataTransfer.setData(FILE_DRAG_ORDER_TYPE, String(file.order));
        event.dataTransfer.effectAllowed = 'move';
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      tabIndex={0}
      role="button"
      aria-label="Drag to reorder"
      title="Drag to reorder · Alt+↑/↓ to move"
      onKeyDown={keyDown}
    >
      <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden="true">
        {[2, 7, 12].flatMap((y) =>
          [3, 7].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.2" />),
        )}
      </svg>
    </div>
  );
}
