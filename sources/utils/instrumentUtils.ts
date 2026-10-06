// The spectrogram.ts module uses FFT_SIZE=2048 (not exported).
// Band frequency bin calculations depend on this value.
const SPECTROGRAM_FFT_SIZE = 2048;

export interface SpectroFrames {
  flat: Float32Array;
  numFrames: number;
  binsPerFrame: number;
  centroidBin: number;
}

export interface BandLanes {
  sub: Float32Array;
  bass: Float32Array;
  lowMid: Float32Array;
  highMid: Float32Array;
}

export const BAND_NAMES = ['sub', 'bass', 'lowMid', 'highMid'] as const;
export type BandName = (typeof BAND_NAMES)[number];

export const BAND_LABELS: Record<BandName, string> = {
  sub: 'SUB',
  bass: 'BSS',
  lowMid: 'LMD',
  highMid: 'HMD',
};

interface BandRange {
  lo: number;
  hi: number;
}
export type BandBinRanges = Record<BandName, BandRange>;

export function getBandBinRanges(sampleRate: number, binsPerFrame: number): BandBinRanges {
  const binHz = sampleRate / SPECTROGRAM_FFT_SIZE;
  const freq2bin = (hz: number) => Math.max(0, Math.min(binsPerFrame - 1, Math.round(hz / binHz)));
  const subHi = freq2bin(60);
  const bassHi = freq2bin(250);
  const lowMidHi = freq2bin(2000);
  return {
    sub: { lo: 0, hi: subHi },
    bass: { lo: subHi + 1, hi: bassHi },
    lowMid: { lo: bassHi + 1, hi: lowMidHi },
    highMid: { lo: lowMidHi + 1, hi: binsPerFrame - 1 },
  };
}

export function computeEnergyTimeline(channels: Float32Array[], numBuckets: number): Float32Array {
  const ch = channels.length;
  const len = channels[0]?.length ?? 0;
  if (len === 0 || ch === 0 || numBuckets <= 0) {
    return new Float32Array(0);
  }

  const result = new Float32Array(numBuckets);
  for (let b = 0; b < numBuckets; b++) {
    const start = Math.min(len - 1, Math.floor((b * len) / numBuckets));
    const proportionalEnd = Math.ceil(((b + 1) * len) / numBuckets);
    const end = Math.min(len, Math.max(start + 1, proportionalEnd));
    let sumSq = 0;
    let count = 0;
    for (let c = 0; c < ch; c++) {
      const data = channels[c]!;
      for (let i = start; i < end; i++) {
        const s = data[i]!;
        sumSq += s * s;
        count++;
      }
    }
    result[b] = count > 0 ? Math.sqrt(sumSq / count) : 0;
  }

  return result;
}

export function computeBandLanes(spectro: SpectroFrames, sampleRate: number): BandLanes {
  const { flat, numFrames, binsPerFrame } = spectro;
  if (numFrames === 0) {
    return {
      sub: new Float32Array(0),
      bass: new Float32Array(0),
      lowMid: new Float32Array(0),
      highMid: new Float32Array(0),
    };
  }

  const ranges = getBandBinRanges(sampleRate, binsPerFrame);
  const result: BandLanes = {
    sub: new Float32Array(numFrames),
    bass: new Float32Array(numFrames),
    lowMid: new Float32Array(numFrames),
    highMid: new Float32Array(numFrames),
  };

  for (let f = 0; f < numFrames; f++) {
    const base = f * binsPerFrame;
    for (const name of BAND_NAMES) {
      const { lo, hi } = ranges[name];
      const count = hi - lo + 1;
      if (count <= 0) {
        continue;
      }
      let sum = 0;
      for (let b = lo; b <= hi; b++) {
        sum += flat[base + b]!;
      }
      result[name][f] = sum / count;
    }
  }

  return result;
}

export interface FrequencyTick {
  hz: number;
  label: string;
  xRatio: number;
}

const FREQ_TICK_TARGETS_HZ = [50, 200, 1000, 5000];

export function getFrequencyAxisTicks(sampleRate: number, numBins: number): FrequencyTick[] {
  if (numBins <= 0 || sampleRate <= 0) {
    return [];
  }
  const binHz = sampleRate / SPECTROGRAM_FFT_SIZE;
  const maxHz = numBins * binHz;
  const logBase = Math.log(numBins + 1);

  return FREQ_TICK_TARGETS_HZ.filter((hz) => hz < maxHz).map((hz) => {
    const bin = hz / binHz;
    const xRatio = Math.log(bin + 1) / logBase;
    const label = hz >= 1000 ? `${hz / 1000}k` : `${hz}`;
    return { hz, label, xRatio };
  });
}

export function getBandFrequencyCoverage(sampleRate: number, numBins: number): string {
  if (numBins <= 0 || sampleRate <= 0) {
    return '';
  }
  const binHz = sampleRate / SPECTROGRAM_FFT_SIZE;
  const maxHz = numBins * binHz;
  return maxHz >= 1000 ? `0–${(maxHz / 1000).toFixed(1)} kHz` : `0–${Math.round(maxHz)} Hz`;
}

// ── Dashboard instrument helpers ──────────────────────────────────────────────

/**
 * Computes positive energy differences between adjacent energy timeline buckets,
 * normalized to [0, 1]. Represents transient/onset activity over time.
 */
export function computeTransientActivity(energyTimeline: Float32Array): Float32Array {
  if (energyTimeline.length < 2) {
    return new Float32Array(0);
  }
  const out = new Float32Array(energyTimeline.length);
  for (let i = 1; i < energyTimeline.length; i++) {
    out[i] = Math.max(0, energyTimeline[i]! - energyTimeline[i - 1]!);
  }
  let max = 0;
  for (let i = 0; i < out.length; i++) {
    if (out[i]! > max) {
      max = out[i]!;
    }
  }
  if (max > 0) {
    for (let i = 0; i < out.length; i++) {
      out[i] = out[i]! / max;
    }
  }
  return out;
}

/**
 * Normalizes a dB value to [0, 1] within the given range.
 * Values below minDb clamp to 0; values above maxDb clamp to 1.
 */
export function normalizeGaugeValue(value: number, minDb: number, maxDb: number): number {
  if (maxDb <= minDb) {
    return 0;
  }
  return Math.max(0, Math.min(1, (value - minDb) / (maxDb - minDb)));
}

export interface StereoPoint {
  x: number;
  y: number;
}

/**
 * Samples up to maxPoints L/R amplitude pairs from a stereo AudioBuffer.
 * Returns an empty array for mono or null buffers.
 */
export function sampleStereoPoints(buffer: AudioBuffer, maxPoints: number): StereoPoint[] {
  if (buffer.numberOfChannels < 2 || maxPoints <= 0) {
    return [];
  }
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  const pointCount = Math.min(left.length, Math.floor(maxPoints));
  if (pointCount <= 0) {
    return [];
  }
  const points: StereoPoint[] = new Array(pointCount);
  const lastSampleIndex = left.length - 1;
  const denominator = Math.max(1, pointCount - 1);
  for (let pointIndex = 0; pointIndex < pointCount; pointIndex++) {
    const sampleIndex = Math.floor((pointIndex * lastSampleIndex) / denominator);
    points[pointIndex] = { x: left[sampleIndex]!, y: right[sampleIndex]! };
  }
  return points;
}

/**
 * Computes the average spectral centroid frequency (Hz) across all spectrogram frames.
 * Returns 0 if no data is available.
 */
export function computeSpectralCentroid(spectroFrames: SpectroFrames, sampleRate: number): number {
  if (spectroFrames.numFrames === 0 || sampleRate <= 0) {
    return 0;
  }
  return spectroFrames.centroidBin * (sampleRate / SPECTROGRAM_FFT_SIZE);
}

export function getSpectrumFrame(spectro: SpectroFrames, ratio: number): Float32Array {
  const { flat, numFrames, binsPerFrame } = spectro;
  if (numFrames === 0) {
    return new Float32Array(0);
  }
  const clamped = Math.max(0, Math.min(1, ratio));
  const frameIdx = Math.min(numFrames - 1, Math.floor(clamped * numFrames));
  return flat.subarray(frameIdx * binsPerFrame, (frameIdx + 1) * binsPerFrame);
}
