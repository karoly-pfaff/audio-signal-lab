import { beforeEach, expect, it, vi } from 'vitest';
import type { FileState, MainTrackState } from '../audio/types';

const revokeArtworkUrl = vi.hoisted(() => vi.fn());
vi.mock('../audio/metadata', () => ({ revokeArtworkUrl }));

import { releaseAllArtwork, releaseArtworkIfUnreferenced } from './artworkLifecycle';

function artworkState(mainUrl: string | null, fileUrls: Array<string | null>) {
  return {
    mainTrack: { thumbnailUrl: mainUrl } as MainTrackState,
    files: fileUrls.map((thumbnailUrl) => ({ thumbnailUrl }) as FileState),
  };
}

beforeEach(() => vi.clearAllMocks());

it('keeps artwork while either the main track or a sidebar file still references it', () => {
  const shared = 'blob:shared';
  releaseArtworkIfUnreferenced(shared, artworkState(shared, []));
  releaseArtworkIfUnreferenced(shared, artworkState(null, [shared]));
  expect(revokeArtworkUrl).not.toHaveBeenCalled();
});

it('releases unreferenced artwork and de-duplicates full-session cleanup', () => {
  releaseArtworkIfUnreferenced('blob:direct', artworkState('blob:new', ['blob:shared']));
  expect(revokeArtworkUrl).toHaveBeenCalledWith('blob:direct');
  revokeArtworkUrl.mockClear();

  releaseAllArtwork(artworkState('blob:shared', ['blob:shared', 'blob:other']));
  expect(revokeArtworkUrl.mock.calls).toEqual([['blob:shared'], ['blob:other']]);
});
