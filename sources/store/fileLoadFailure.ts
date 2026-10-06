import type { FileState } from '../audio/types';

export interface FileLoadFailure {
  fileId: string;
  generation: number;
  previous: FileState | undefined;
  message?: string;
}

export function fileStateAfterLoadFailure(
  current: FileState,
  previous: FileState | undefined,
): FileState {
  return previous?.buffer
    ? {
        ...previous,
        order: current.order,
        volume: current.volume,
        loop: current.loop,
        loadingState: 'loaded',
      }
    : { ...current, loadingState: 'failed' };
}
