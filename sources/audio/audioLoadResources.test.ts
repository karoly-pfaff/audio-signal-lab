import { expect, it, vi } from 'vitest';

const metadata = vi.hoisted(() => ({
  extract: vi.fn(),
  revoke: vi.fn(),
}));
vi.mock('./metadata', () => ({
  extractMetadata: metadata.extract,
  revokeArtworkUrl: metadata.revoke,
}));

import { loadAudioResources } from './audioLoadResources';

it('releases metadata artwork when decoding fails', async () => {
  metadata.extract.mockResolvedValue({
    title: null,
    artist: null,
    album: null,
    artworkUrl: 'blob:cover',
  });
  const decode = vi.fn(async () => {
    throw new Error('decode failed');
  });

  await expect(loadAudioResources(new File(['x'], 'broken.wav'), decode)).rejects.toThrow(
    'decode failed',
  );
  expect(metadata.revoke).toHaveBeenCalledWith('blob:cover');
});

it('propagates metadata failure after decoding succeeds', async () => {
  const buffer = { duration: 1 } as AudioBuffer;
  metadata.extract.mockRejectedValueOnce(new Error('metadata failed'));

  await expect(
    loadAudioResources(
      new File(['x'], 'track.wav'),
      vi.fn(async () => buffer),
    ),
  ).rejects.toThrow('metadata failed');
});

it('prefers the decode failure when metadata extraction also fails', async () => {
  metadata.extract.mockRejectedValueOnce(new Error('metadata failed'));
  const decode = vi.fn(async () => {
    throw new Error('decode failed');
  });

  await expect(loadAudioResources(new File(['x'], 'broken.wav'), decode)).rejects.toThrow(
    'decode failed',
  );
});

it('returns both decoded audio and metadata on success', async () => {
  const buffer = { duration: 1 } as AudioBuffer;
  const details = { title: 'Track', artist: null, album: null, artworkUrl: null };
  metadata.extract.mockResolvedValueOnce(details);

  await expect(
    loadAudioResources(
      new File(['x'], 'track.wav'),
      vi.fn(async () => buffer),
    ),
  ).resolves.toEqual({ buffer, metadata: details });
});
