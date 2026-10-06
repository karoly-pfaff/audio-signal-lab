import { useState } from 'react';
import type { FileState } from '../audio/types';
import { isAudioFile } from '../utils/dropAssignment';
import {
  FILE_DRAG_ID_TYPE,
  FILE_DRAG_ORDER_TYPE,
  reorderTargetFromDrop,
} from '../utils/layerOrder';

interface FileDragActions {
  reorder: (id: string, order: number) => void;
  load: (id: string, file: File) => void;
}

export function useFileRowDrag(file: FileState, actions: FileDragActions) {
  const [over, setOver] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [insert, setInsert] = useState<'before' | 'after' | null>(null);
  const dragOver = (event: React.DragEvent) => {
    const internal = event.dataTransfer.types.includes(FILE_DRAG_ID_TYPE);
    if (!internal && !event.dataTransfer.types.includes('Files')) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = internal ? 'move' : 'copy';
    if (internal) {
      const rect = event.currentTarget.getBoundingClientRect();
      setInsert(event.clientY - rect.top < rect.height / 2 ? 'before' : 'after');
    } else {
      setOver(true);
    }
  };
  const drop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setInsert(null);
    setOver(false);
    const draggedId = event.dataTransfer.getData(FILE_DRAG_ID_TYPE);
    if (draggedId && draggedId !== file.id) {
      const rect = event.currentTarget.getBoundingClientRect();
      const before = event.clientY - rect.top < rect.height / 2;
      const sourceOrder = Number.parseInt(event.dataTransfer.getData(FILE_DRAG_ORDER_TYPE), 10);
      const targetOrder = Number.isInteger(sourceOrder)
        ? reorderTargetFromDrop(sourceOrder, file.order, before)
        : before
          ? file.order
          : file.order + 1;
      actions.reorder(draggedId, targetOrder);
      return;
    }
    const audio = Array.from(event.dataTransfer.files).find(isAudioFile);
    if (audio) {
      actions.load(file.id, audio);
    }
  };
  const leave = (event: React.DragEvent) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setOver(false);
      setInsert(null);
    }
  };
  return { over, dragging, insert, setDragging, dragOver, drop, leave };
}
