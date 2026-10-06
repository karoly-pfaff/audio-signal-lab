export const MAX_AUDIO_FILE_BYTES = 256 * 1024 * 1024;
export const MAX_DECODED_SAMPLE_VALUES = 100_000_000;
export const MAX_AUDIO_DURATION_SECONDS = 60 * 60;

export function audioFileLimitError(file: File): string | null {
  if (file.size > MAX_AUDIO_FILE_BYTES) {
    return 'Audio file is too large (maximum 256 MiB).';
  }
  return null;
}

export function decodedAudioLimitError(buffer: AudioBuffer): string | null {
  if (buffer.duration > MAX_AUDIO_DURATION_SECONDS) {
    return 'Audio is too long (maximum 60 minutes).';
  }
  if (buffer.length * buffer.numberOfChannels > MAX_DECODED_SAMPLE_VALUES) {
    return 'Decoded audio is too large for safe in-browser analysis.';
  }
  return null;
}
