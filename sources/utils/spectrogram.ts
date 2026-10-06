const FFT_SIZE = 2048;
const ANALYSIS_HOP_SIZE = FFT_SIZE / 2;
const TARGET_FRAMES = 256;
const NUM_DISPLAY_BINS = 256;
const NUM_ANALYSIS_BINS = FFT_SIZE / 2 + 1;
const DB_FLOOR = -80;

// Pre-computed Hann window (symmetric, FFT_SIZE points)
const HANN = Float32Array.from(
  { length: FFT_SIZE },
  (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1)),
);
// One sample of endpoint weight keeps boundary impulses in the FFT without a synthetic spectrum.
const CENTROID_WINDOW = Float32Array.from(
  { length: FFT_SIZE },
  (_, i) => 1 / FFT_SIZE + (1 - 1 / FFT_SIZE) * HANN[i]!,
);

// Cooley-Tukey radix-2 DIT FFT — in-place, power-of-2 only
function fftInPlace(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      let t = re[i]!;
      re[i] = re[j]!;
      re[j] = t;
      t = im[i]!;
      im[i] = im[j]!;
      im[j] = t;
    }
  }
  // Butterfly passes
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -(2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cRe = 1;
      let cIm = 0;
      for (let j = 0; j < half; j++) {
        const uRe = re[i + j]!;
        const uIm = im[i + j]!;
        const k = i + j + half;
        const vRe = re[k]! * cRe - im[k]! * cIm;
        const vIm = re[k]! * cIm + im[k]! * cRe;
        re[i + j] = uRe + vRe;
        im[i + j] = uIm + vIm;
        re[k] = uRe - vRe;
        im[k] = uIm - vIm;
        const nr = cRe * wRe - cIm * wIm;
        cIm = cRe * wIm + cIm * wRe;
        cRe = nr;
      }
    }
  }
}

export interface SpectrogramData {
  frames: Float32Array[];
  numFrames: number;
  binsPerFrame: number;
  centroidBin: number;
}

interface SpectralTotals {
  globalMax: number;
}

interface FftBuffers {
  re: Float32Array;
  im: Float32Array;
}

function analysisFrameCount(sampleCount: number): number {
  return Math.ceil(Math.max(0, sampleCount - 1) / ANALYSIS_HOP_SIZE) + 1;
}

function analysisOffset(frame: number, frameCount: number, sampleCount: number): number {
  const lastSample = Math.max(0, sampleCount - 1);
  const center = frameCount > 1 ? Math.round((frame * lastSample) / (frameCount - 1)) : 0;
  return center - ANALYSIS_HOP_SIZE;
}

function prepareWindow(
  mono: Float32Array,
  offset: number,
  window: Float32Array,
  fft: FftBuffers,
): void {
  fft.re.fill(0);
  fft.im.fill(0);
  for (let index = 0; index < FFT_SIZE; index++) {
    const sourceIndex = offset + index;
    fft.re[index] = (sourceIndex >= 0 ? (mono[sourceIndex] ?? 0) : 0) * window[index]!;
  }
}

function accumulateSpectrum(
  fft: FftBuffers,
  displayFrame: Float32Array,
  totals: SpectralTotals,
): void {
  for (let bin = 0; bin < NUM_ANALYSIS_BINS; bin++) {
    const magnitude = Math.hypot(fft.re[bin]!, fft.im[bin]!);
    if (bin < NUM_DISPLAY_BINS && magnitude > displayFrame[bin]!) {
      displayFrame[bin] = magnitude;
      totals.globalMax = Math.max(totals.globalMax, magnitude);
    }
  }
}

function accumulateCentroid(
  fft: FftBuffers,
  frameWeight: number,
  totals: { magnitude: number; weightedBins: number },
): void {
  for (let bin = 0; bin < NUM_ANALYSIS_BINS; bin++) {
    const magnitude = Math.hypot(fft.re[bin]!, fft.im[bin]!) * frameWeight;
    totals.magnitude += magnitude;
    totals.weightedBins += magnitude * bin;
  }
}

function computeCentroid(mono: Float32Array): number {
  const fft = { re: new Float32Array(FFT_SIZE), im: new Float32Array(FFT_SIZE) };
  const totals = { magnitude: 0, weightedBins: 0 };
  const lastFullOffset = Math.max(0, mono.length - FFT_SIZE);
  const firstOffset = mono.length < FFT_SIZE ? Math.floor((mono.length - FFT_SIZE) / 2) : 0;
  const regularFrameLimit = mono.length < FFT_SIZE ? firstOffset : lastFullOffset;
  for (let offset = firstOffset; offset <= regularFrameLimit; offset += ANALYSIS_HOP_SIZE) {
    prepareWindow(mono, offset, CENTROID_WINDOW, fft);
    fftInPlace(fft.re, fft.im);
    accumulateCentroid(fft, 1, totals);
  }
  const remainder = lastFullOffset % ANALYSIS_HOP_SIZE;
  if (mono.length >= FFT_SIZE && remainder > 0) {
    prepareWindow(mono, lastFullOffset, CENTROID_WINDOW, fft);
    fftInPlace(fft.re, fft.im);
    // Fade in the anchored tail over one hop so adding one sample cannot add a full frame.
    accumulateCentroid(fft, remainder / ANALYSIS_HOP_SIZE, totals);
  }
  return totals.magnitude > 0 ? totals.weightedBins / totals.magnitude : 0;
}

function computeRawFrames(
  mono: Float32Array,
  numFrames: number,
): { frames: Float32Array[]; globalMax: number; centroidBin: number } {
  const re = new Float32Array(FFT_SIZE);
  const im = new Float32Array(FFT_SIZE);
  const fft = { re, im };
  const frames = Array.from({ length: numFrames }, () => new Float32Array(NUM_DISPLAY_BINS));
  const totals: SpectralTotals = { globalMax: 0 };
  const analysisFrames = analysisFrameCount(mono.length);
  for (let frame = 0; frame < analysisFrames; frame++) {
    const offset = analysisOffset(frame, analysisFrames, mono.length);
    prepareWindow(mono, offset, HANN, fft);
    fftInPlace(re, im);
    const displayIndex = Math.min(numFrames - 1, Math.floor((frame * numFrames) / analysisFrames));
    accumulateSpectrum(fft, frames[displayIndex]!, totals);
  }
  const centroidBin = computeCentroid(mono);
  return { frames, globalMax: totals.globalMax, centroidBin };
}

function normalizeFrames(rawFrames: Float32Array[], globalMax: number): Float32Array[] {
  return rawFrames.map((magnitudes) => {
    const normalized = new Float32Array(NUM_DISPLAY_BINS);
    for (let bin = 0; bin < NUM_DISPLAY_BINS; bin++) {
      const linear = globalMax > 0 ? magnitudes[bin]! / globalMax : 0;
      const decibels = linear < 1e-10 ? DB_FLOOR : 20 * Math.log10(linear);
      normalized[bin] = Math.max(0, (decibels - DB_FLOOR) / -DB_FLOOR);
    }
    return normalized;
  });
}

// Core FFT computation on already-downmixed mono samples.
// Used by computeSpectrogram (AudioBuffer path) and the spectrogram Web Worker.
export function computeSpectrogramFromMono(mono: Float32Array): SpectrogramData {
  const totalSamples = mono.length;
  const binsPerFrame = NUM_DISPLAY_BINS;
  if (totalSamples === 0) {
    return { frames: [], numFrames: 0, binsPerFrame, centroidBin: 0 };
  }
  const analysisFrames = analysisFrameCount(totalSamples);
  const numFrames = Math.min(TARGET_FRAMES, analysisFrames);
  const { frames: rawFrames, globalMax, centroidBin } = computeRawFrames(mono, numFrames);
  const frames = normalizeFrames(rawFrames, globalMax);
  return { frames, numFrames: frames.length, binsPerFrame, centroidBin };
}

export function downmixAudioBuffer(buffer: AudioBuffer): Float32Array {
  const totalSamples = buffer.length;
  const numCh = buffer.numberOfChannels;
  const mono = new Float32Array(totalSamples);
  for (let c = 0; c < numCh; c++) {
    const ch = buffer.getChannelData(c);
    for (let i = 0; i < totalSamples; i++) {
      mono[i] = mono[i]! + ch[i]!;
    }
  }
  if (numCh > 1) {
    const inv = 1 / numCh;
    for (let i = 0; i < totalSamples; i++) {
      mono[i] = mono[i]! * inv;
    }
  }
  return mono;
}

export function flattenSpectrogramFrames(spectro: SpectrogramData): Float32Array {
  const flat = new Float32Array(spectro.numFrames * spectro.binsPerFrame);
  for (let frameIndex = 0; frameIndex < spectro.numFrames; frameIndex++) {
    flat.set(spectro.frames[frameIndex]!, frameIndex * spectro.binsPerFrame);
  }
  return flat;
}

export function computeSpectrogram(buffer: AudioBuffer): SpectrogramData {
  const mono = downmixAudioBuffer(buffer);
  return computeSpectrogramFromMono(mono);
}

export { renderSpectrogramPixels } from './spectrogramPixels';
export { magnitudeToRGBA } from './spectrogramColor';
