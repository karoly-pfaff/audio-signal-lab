import type { FileIdentity } from '../audio/types';

export type { FileIdentity };

export type IdentityMatchLevel = 'likely' | 'possible-mismatch' | 'unknown';

// djb2 variant — fast, deterministic, non-cryptographic
function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h) ^ s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

// Takes up to n samples from start, middle, and end of channel 0.
function extractAudioSamples(buffer: AudioBuffer, n = 8): number[] {
  const ch0 = buffer.getChannelData(0);
  const len = ch0.length;
  const indices: number[] = [];
  for (let i = 0; i < n && i < len; i++) {
    indices.push(i);
  }
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(len / 2) + i;
    if (idx < len) {
      indices.push(idx);
    }
  }
  for (let i = 0; i < n; i++) {
    const idx = Math.max(0, len - n) + i;
    if (idx < len) {
      indices.push(idx);
    }
  }
  return indices.map((i) => ch0[i]!);
}

interface QuickIdentityInput {
  name: string;
  size: number;
  lastModified: number;
  durationSeconds: number;
  sampleRate: number;
  channelCount: number;
  audioSamples: ReadonlyArray<number>;
}

export function computeQuickIdentityHash({
  name,
  size,
  lastModified,
  durationSeconds,
  sampleRate,
  channelCount,
  audioSamples,
}: QuickIdentityInput): string {
  const sampleStr = audioSamples.map((v) => v.toFixed(4)).join(',');
  const key = `${name}|${size}|${lastModified}|${durationSeconds.toFixed(3)}|${sampleRate}|${channelCount}|${sampleStr}`;
  return djb2(key).toString(16).padStart(8, '0');
}

export function buildFileIdentity(file: File, buffer: AudioBuffer): FileIdentity {
  const samples = extractAudioSamples(buffer);
  const quickHash = computeQuickIdentityHash({
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
    durationSeconds: buffer.duration,
    sampleRate: buffer.sampleRate,
    channelCount: buffer.numberOfChannels,
    audioSamples: samples,
  });
  return {
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
    durationSeconds: buffer.duration,
    sampleRate: buffer.sampleRate,
    channelCount: buffer.numberOfChannels,
    quickHash,
  };
}

export function compareFileIdentity(
  loaded: FileIdentity,
  reference: FileIdentity | null | undefined,
): IdentityMatchLevel {
  if (!reference) {
    return 'unknown';
  }

  // Both hashes present — hash result is authoritative
  if (loaded.quickHash && reference.quickHash) {
    return loaded.quickHash === reference.quickHash ? 'likely' : 'possible-mismatch';
  }

  // Hash missing from one or both — fall back to metadata
  const durationDiff = Math.abs(loaded.durationSeconds - reference.durationSeconds);
  if (durationDiff > 1.0) {
    return 'possible-mismatch';
  }

  if (
    loaded.name === reference.name &&
    loaded.size === reference.size &&
    loaded.sampleRate === reference.sampleRate &&
    loaded.channelCount === reference.channelCount
  ) {
    return 'likely';
  }

  return 'possible-mismatch';
}

export function formatIdentityWarning(level: IdentityMatchLevel): string | null {
  if (level === 'possible-mismatch') {
    return 'Loaded file may differ from the session reference; annotations were checked against its duration.';
  }
  return null;
}
