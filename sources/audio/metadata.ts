export interface AudioMetadata {
  title: string | null;
  artist: string | null;
  album: string | null;
  artworkUrl: string | null;
}

const EMPTY_META: AudioMetadata = { title: null, artist: null, album: null, artworkUrl: null };

export async function extractMetadata(file: File): Promise<AudioMetadata> {
  try {
    const { parseBlob } = await import('music-metadata');
    const meta = await parseBlob(file, { skipCovers: false });

    let artworkUrl: string | null = null;
    const picture = meta.common.picture?.[0];
    if (picture) {
      const imageData = Uint8Array.from(picture.data);
      const blob = new Blob([imageData], { type: picture.format || 'image/jpeg' });
      artworkUrl = URL.createObjectURL(blob);
    }

    return {
      title: meta.common.title?.trim() || null,
      artist: meta.common.artist?.trim() || null,
      album: meta.common.album?.trim() || null,
      artworkUrl,
    };
  } catch {
    return EMPTY_META;
  }
}

export function revokeArtworkUrl(url: string | null): void {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}
