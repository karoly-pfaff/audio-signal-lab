import type { FileState } from '../../audio/types';
import { useFileRowDrag } from '../../hooks/useFileRowDrag';
import { useAudioLabStore } from '../../store/useAudioLabStore';
import { FileRowDragHandle } from './FileRowDragHandle';
import { FileActivationButton } from './FileActivationButton';
import { FileRowMenu } from './FileRowMenu';
import { Slider } from '../controls/Slider';

function rowClass(
  file: FileState,
  active: boolean,
  drag: { over: boolean; dragging: boolean; insert: 'before' | 'after' | null },
) {
  return [
    'file-row',
    `file-row--${file.loadingState}`,
    active ? 'file-row--active' : '',
    drag.over ? 'file-row--drag-over' : '',
    drag.dragging ? 'file-row--dragging' : '',
    drag.insert ? `file-row--drag-insert-${drag.insert}` : '',
    file.buffer ? 'file-row--clickable' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function FileRow({ file }: { file: FileState }) {
  const store = useAudioLabStore();
  const drag = useFileRowDrag(file, { reorder: store.reorderFile, load: store.loadFile });
  const active = store.activeFileId === file.id;
  return (
    <div
      className={rowClass(file, active, drag)}
      onDragOver={drag.dragOver}
      onDragLeave={drag.leave}
      onDrop={drag.drop}
    >
      <FileRowDragHandle file={file} setDragging={drag.setDragging} />
      <FileActivationButton file={file} active={active} activate={store.activateFile} />
      <div className="file-controls">
        <Slider
          label="VOL"
          value={file.volume}
          onChange={(volume) => store.setFileVolume(file.id, volume)}
          unit="dB"
          className="file-slider"
        />
      </div>
      <FileRowMenu file={file} />
    </div>
  );
}
