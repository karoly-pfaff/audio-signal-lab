import { revokeArtworkUrl } from '../audio/metadata';
import type { FileState, MainTrackState } from '../audio/types';

interface ArtworkState {
  mainTrack: Pick<MainTrackState, 'thumbnailUrl'>;
  files: Array<Pick<FileState, 'thumbnailUrl'>>;
}

function isArtworkReferenced(url: string, state: ArtworkState): boolean {
  return (
    state.mainTrack.thumbnailUrl === url || state.files.some((file) => file.thumbnailUrl === url)
  );
}

export function releaseArtworkIfUnreferenced(url: string | null, state: ArtworkState): void {
  if (url && !isArtworkReferenced(url, state)) {
    revokeArtworkUrl(url);
  }
}

export function releaseAllArtwork(state: ArtworkState): void {
  const urls = new Set<string>();
  if (state.mainTrack.thumbnailUrl) {
    urls.add(state.mainTrack.thumbnailUrl);
  }
  state.files.forEach((file) => {
    if (file.thumbnailUrl) {
      urls.add(file.thumbnailUrl);
    }
  });
  urls.forEach((url) => revokeArtworkUrl(url));
}
