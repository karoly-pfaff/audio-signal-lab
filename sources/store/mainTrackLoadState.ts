import type { FileState, MainTrackState } from '../audio/types';

export function activeFileIdForMainTrack(
  candidateId: string | null,
  files: FileState[],
  mainTrack: MainTrackState,
): string | null {
  const candidate = files.find((file) => file.id === candidateId);
  return candidate?.buffer && candidate.buffer === mainTrack.buffer ? candidate.id : null;
}

export function mainTrackAfterLoadFailure(
  current: MainTrackState,
  previous: MainTrackState,
): MainTrackState {
  if (!previous.buffer) {
    return { ...current, loadingState: 'failed' };
  }
  return {
    ...previous,
    volume: current.volume,
    loop: current.loop,
    selection: current.selection,
    markers: current.markers,
    loadingState: 'loaded',
  };
}

export function shouldRestoreMainAnnotations(track: MainTrackState): boolean {
  if (track.buffer || track.name.length === 0) {
    return false;
  }
  return (
    track.loadingState === 'remembered' ||
    track.loadingState === 'failed' ||
    track.loadingState === 'loading'
  );
}
