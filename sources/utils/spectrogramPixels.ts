import type { SpectrogramData } from './spectrogram';
import { magnitudeToRGBA } from './spectrogramColor';

interface BinRange {
  start: number;
  end: number;
}

function rowBinRange(row: number, height: number, binCount: number): BinRange {
  const upperRatio = Math.sqrt(1 - row / height);
  const lowerRatio = Math.sqrt(1 - (row + 1) / height);
  const end = Math.max(1, Math.floor(upperRatio * binCount));
  const start = Math.min(end - 1, Math.floor(lowerRatio * binCount));
  return { start, end };
}

function peakMagnitude(frame: Float32Array, range: BinRange): number {
  let peak = 0;
  for (let bin = range.start; bin < range.end; bin++) {
    peak = Math.max(peak, frame[bin] ?? 0);
  }
  return peak;
}

// Pure and DOM-free so both the worker and synchronous fallback render identically.
export function renderSpectrogramPixels(
  spectro: SpectrogramData,
  width: number,
  height: number,
): Uint8ClampedArray<ArrayBuffer> {
  const pixels = new Uint8ClampedArray(width * height * 4);
  if (spectro.numFrames === 0 || spectro.binsPerFrame === 0) {
    return pixels;
  }
  for (let y = 0; y < height; y++) {
    const range = rowBinRange(y, height, spectro.binsPerFrame);
    for (let x = 0; x < width; x++) {
      const frameIndex = Math.min(
        spectro.numFrames - 1,
        Math.floor((x / width) * spectro.numFrames),
      );
      const magnitude = peakMagnitude(spectro.frames[frameIndex]!, range);
      magnitudeToRGBA(magnitude, pixels, (y * width + x) * 4);
    }
  }
  return pixels;
}
