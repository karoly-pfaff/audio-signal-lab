import { extractMetadata, revokeArtworkUrl, type AudioMetadata } from './metadata';

export interface AudioLoadResources {
  buffer: AudioBuffer;
  metadata: AudioMetadata;
}

export async function loadAudioResources(
  file: File,
  decode: (file: File) => Promise<AudioBuffer>,
): Promise<AudioLoadResources> {
  const [decoded, metadata] = await Promise.allSettled([decode(file), extractMetadata(file)]);
  if (decoded.status === 'rejected') {
    if (metadata.status === 'fulfilled') {
      revokeArtworkUrl(metadata.value.artworkUrl);
    }
    throw decoded.reason;
  }
  if (metadata.status === 'rejected') {
    throw metadata.reason;
  }
  return { buffer: decoded.value, metadata: metadata.value };
}
