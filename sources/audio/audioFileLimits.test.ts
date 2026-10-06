import { expect, it } from 'vitest';
import {
  audioFileLimitError,
  decodedAudioLimitError,
  MAX_AUDIO_FILE_BYTES,
  MAX_AUDIO_DURATION_SECONDS,
  MAX_DECODED_SAMPLE_VALUES,
} from './audioFileLimits';

function fileWithSize(size: number): File {
  return { size } as File;
}

function bufferWith(duration: number, length: number, channels: number): AudioBuffer {
  return { duration, length, numberOfChannels: channels } as AudioBuffer;
}

it('enforces encoded file size while accepting the boundary', () => {
  expect(audioFileLimitError(fileWithSize(MAX_AUDIO_FILE_BYTES))).toBeNull();
  expect(audioFileLimitError(fileWithSize(MAX_AUDIO_FILE_BYTES + 1))).toContain('256 MiB');
});

it('enforces duration and decoded sample limits', () => {
  expect(decodedAudioLimitError(bufferWith(MAX_AUDIO_DURATION_SECONDS, 1, 1))).toBeNull();
  expect(decodedAudioLimitError(bufferWith(MAX_AUDIO_DURATION_SECONDS + 1, 1, 1))).toContain(
    '60 minutes',
  );
  expect(decodedAudioLimitError(bufferWith(1, MAX_DECODED_SAMPLE_VALUES + 1, 1))).toContain(
    'too large',
  );
});
