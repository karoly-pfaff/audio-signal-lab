import type { SignalRegion } from './analysis';

export const CLIP_THRESHOLD = 0.999;
export const SILENCE_THRESHOLD = 0.0001;

const SILENCE_WINDOW_MS = 50;
const CLIPPING_WINDOW_MS = 10;
const MAX_CLIPPING_REGIONS = 200;

function windowMaxAmplitude(channels: readonly Float32Array[], start: number, end: number): number {
  let maximum = 0;
  for (const channel of channels) {
    for (let index = start; index < end; index++) {
      maximum = Math.max(maximum, Math.abs(channel[index]!));
    }
  }
  return maximum;
}

function appendRegion(
  regions: SignalRegion[],
  startSample: number,
  endSample: number,
  sampleRate: number,
): void {
  regions.push({
    startSeconds: startSample / sampleRate,
    endSeconds: endSample / sampleRate,
  });
}

export function computeSilenceStats(
  channels: readonly Float32Array[],
  sampleRate: number,
  length: number,
): {
  silentRegionCount: number;
  longestSilentRegionSeconds: number;
  silentRegions: SignalRegion[];
} {
  const windowLength = Math.max(1, Math.floor((sampleRate * SILENCE_WINDOW_MS) / 1000));
  const windowCount = Math.ceil(length / windowLength);
  const regions: SignalRegion[] = [];
  let longestRunSamples = 0;
  let currentRunSamples = 0;
  let regionStart: number | null = null;

  for (let windowIndex = 0; windowIndex < windowCount; windowIndex++) {
    const start = windowIndex * windowLength;
    const end = Math.min(start + windowLength, length);
    const silent = windowMaxAmplitude(channels, start, end) < SILENCE_THRESHOLD;
    currentRunSamples = silent ? currentRunSamples + (end - start) : 0;
    longestRunSamples = Math.max(longestRunSamples, currentRunSamples);
    if (silent && regionStart === null) {
      regionStart = start;
    }
    if (!silent && regionStart !== null) {
      appendRegion(regions, regionStart, start, sampleRate);
      regionStart = null;
    }
  }
  if (regionStart !== null) {
    appendRegion(regions, regionStart, length, sampleRate);
  }
  return {
    silentRegionCount: regions.length,
    longestSilentRegionSeconds: longestRunSamples / sampleRate,
    silentRegions: regions,
  };
}

export function computeClippingRegions(
  channels: readonly Float32Array[],
  sampleRate: number,
  length: number,
): SignalRegion[] {
  const windowLength = Math.max(1, Math.floor((sampleRate * CLIPPING_WINDOW_MS) / 1000));
  const windowCount = Math.ceil(length / windowLength);
  const regions: SignalRegion[] = [];
  let regionStart: number | null = null;

  for (let windowIndex = 0; windowIndex < windowCount; windowIndex++) {
    const start = windowIndex * windowLength;
    const end = Math.min(start + windowLength, length);
    const clipped = windowMaxAmplitude(channels, start, end) >= CLIP_THRESHOLD;
    if (clipped && regionStart === null) {
      regionStart = start;
    }
    if (!clipped && regionStart !== null) {
      appendRegion(regions, regionStart, start, sampleRate);
      regionStart = null;
    }
  }
  if (regionStart !== null) {
    appendRegion(regions, regionStart, length, sampleRate);
  }
  return regions.slice(0, MAX_CLIPPING_REGIONS);
}

export function computeDynamicRangeProxy(
  channels: readonly Float32Array[],
  sampleRate: number,
  length: number,
): number | null {
  const windowLength = Math.floor(sampleRate * 0.1);
  if (windowLength < 1 || length < windowLength * 2) {
    return null;
  }
  let maximum = 0;
  let minimum = Infinity;
  for (let start = 0; start + windowLength <= length; start += windowLength) {
    let sum = 0;
    for (const channel of channels) {
      for (let index = start; index < start + windowLength; index++) {
        sum += channel[index]! ** 2;
      }
    }
    const rms = Math.sqrt(sum / (windowLength * channels.length));
    if (rms > 1e-6) {
      maximum = Math.max(maximum, rms);
      minimum = Math.min(minimum, rms);
    }
  }
  return maximum > 0 && minimum < Infinity ? 20 * Math.log10(maximum / minimum) : null;
}
