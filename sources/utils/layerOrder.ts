export const FILE_DRAG_ID_TYPE = 'application/x-file-id';
export const FILE_DRAG_ORDER_TYPE = 'application/x-file-order';

export function reorderTargetFromDrop(
  sourceOrder: number,
  targetOrder: number,
  before: boolean,
): number {
  const insertionOrder = before ? targetOrder : targetOrder + 1;
  return sourceOrder < insertionOrder ? insertionOrder - 1 : insertionOrder;
}

// Moves the file with fileId to targetOrder, recompacts orders 0..N-1.
// Returns a new array; original is not mutated. If fileId is not found, returns the original array.
export function applyReorder<T extends { id: string; order: number }>(
  files: readonly T[],
  fileId: string,
  targetOrder: number,
): T[] {
  const fromIdx = files.findIndex((f) => f.id === fileId);
  if (fromIdx === -1) {
    return files as T[];
  }
  const clamped = Math.max(0, Math.min(files.length - 1, targetOrder));
  const result = [...files];
  const [moved] = result.splice(fromIdx, 1);
  result.splice(clamped, 0, moved!);
  return result.map((f, i) => ({ ...f, order: i })) as T[];
}
