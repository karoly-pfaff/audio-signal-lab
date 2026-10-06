import { it, expect } from 'vitest';
import { computeSpectrogram, computeSpectrogramFromMono } from './spectrogram';
function makeMono(data: Float32Array, sampleRate = 44100): AudioBuffer {
  return {
    length: data.length,
    duration: data.length / sampleRate,
    numberOfChannels: 1,
    sampleRate,
    getChannelData: () => data,
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as unknown as AudioBuffer;
}
function makeStereo(left: Float32Array, right: Float32Array, sampleRate = 44100): AudioBuffer {
  const channels = [left, right];
  return {
    length: left.length,
    duration: left.length / sampleRate,
    numberOfChannels: 2,
    sampleRate,
    getChannelData: (c: number) => channels[c],
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as unknown as AudioBuffer;
}

type Tone = [frequency: number, amplitude: number, phase?: number];

function sineMix(sampleRate: number, tones: Tone[], length = 8192): Float32Array {
  return Float32Array.from({ length }, (_, index) =>
    tones.reduce(
      (sample, [frequency, amplitude, phase = 0]) =>
        sample + amplitude * Math.sin((2 * Math.PI * frequency * index) / sampleRate + phase),
      0,
    ),
  );
}

function centroidHz(data: Float32Array, sampleRate: number): number {
  return computeSpectrogram(makeMono(data, sampleRate)).centroidBin * (sampleRate / 2048);
}
// Suite: computeSpectrogram
it('zero-pads and analyses a buffer shorter than one FFT window', () => {
  const buffer = makeMono(new Float32Array(100));
  const result = computeSpectrogram(buffer);
  expect(result.frames).toHaveLength(2);
  expect(result.numFrames).toBe(2);
});
it('returns frames for a 1-second buffer', () => {
  const buffer = makeMono(new Float32Array(44100));
  const result = computeSpectrogram(buffer);
  expect(result.numFrames).toBeGreaterThan(0);
  expect(result.frames).toHaveLength(result.numFrames);
});
it('silent buffer produces zero magnitudes in every frame', () => {
  const buffer = makeMono(new Float32Array(44100 * 2));
  const result = computeSpectrogram(buffer);
  expect(result.numFrames).toBeGreaterThan(0);
  for (const frame of result.frames) {
    for (const v of frame) {
      expect(v).toBe(0);
    }
  }
});
it('all normalized magnitudes are in [0, 1]', () => {
  const data = new Float32Array(44100);
  data[500] = 0.8;
  data[1000] = -0.9;
  data[5000] = 0.5;
  const buffer = makeMono(data);
  const result = computeSpectrogram(buffer);
  for (const frame of result.frames) {
    for (const v of frame) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  }
});
it('every frame has binsPerFrame bins', () => {
  const buffer = makeMono(new Float32Array(44100 * 3));
  const result = computeSpectrogram(buffer);
  for (const frame of result.frames) {
    expect(frame.length).toBe(result.binsPerFrame);
  }
});
it('handles stereo buffer without throwing', () => {
  const left = new Float32Array(22050);
  const right = new Float32Array(22050);
  left[100] = 0.5;
  right[200] = -0.7;
  const buffer = makeStereo(left, right, 22050);
  expect(() => computeSpectrogram(buffer)).not.toThrow();
});
it('stereo buffer produces at least one frame', () => {
  const left = new Float32Array(44100);
  const right = new Float32Array(44100);
  left[1000] = 0.8;
  const buffer = makeStereo(left, right);
  const result = computeSpectrogram(buffer);
  expect(result.numFrames).toBeGreaterThan(0);
});

it('measures a 10 kHz tone using the full positive spectrum', () => {
  expect(centroidHz(sineMix(48_000, [[10_000, 1]]), 48_000)).toBeCloseTo(10_000, -2);
});

it('weights mixed tones by linear magnitude instead of display pixels', () => {
  const measured = centroidHz(
    sineMix(48_000, [
      [1_000, 1],
      [4_000, 0.1],
    ]),
    48_000,
  );
  expect(measured).toBeCloseTo(1273, -2);
});

it('detects a short burst at an arbitrary position in a long file', () => {
  const sampleRate = 48_000;
  const data = new Float32Array(sampleRate * 60);
  for (let index = 5_000; index < 7_000; index++) {
    data[index] = Math.sin((2 * Math.PI * 1_000 * index) / sampleRate);
  }
  const result = computeSpectrogram(makeMono(data, sampleRate));
  const nonZeroBins = result.frames.reduce(
    (count, frame) => count + frame.filter((value) => value > 0).length,
    0,
  );
  const strongestBin = result.frames.reduce(
    (best, frame) =>
      frame.reduce(
        (frameBest, value, bin) => (value > frameBest.value ? { bin, value } : frameBest),
        best,
      ),
    { bin: 0, value: 0 },
  ).bin;
  expect(nonZeroBins).toBeGreaterThan(0);
  expect(strongestBin * (sampleRate / 2048)).toBeCloseTo(1_000, -2);
  expect(result.centroidBin).toBeGreaterThan(0);
}, 10_000);

it('includes a tone that exists only in the trailing partial FFT window', () => {
  const sampleRate = 48_000;
  const data = new Float32Array(9_000);
  for (let index = 8_300; index < data.length; index++) {
    data[index] = Math.sin((2 * Math.PI * 1_000 * index) / sampleRate);
  }

  expect(centroidHz(data, sampleRate)).toBeGreaterThan(500);
});

it.each([1_025, 1_026, 2_049, 2_050, 4_097, 4_098, 44_034])(
  'does not append a silent display frame to %i constant samples',
  (length) => {
    const result = computeSpectrogramFromMono(new Float32Array(length).fill(0.5));
    const lastFrame = result.frames[result.frames.length - 1]!;
    expect(lastFrame.some((value) => value > 0)).toBe(true);
  },
);

it.each([1_026, 2_050, 4_098])('includes a signal at the last sample of %i samples', (length) => {
  const samples = new Float32Array(length);
  samples[length - 1] = 1;
  const result = computeSpectrogramFromMono(samples);
  const lastFrame = result.frames[result.frames.length - 1]!;
  expect(lastFrame.some((value) => value > 0)).toBe(true);
});

it.each([2_049, 4_097, 8_193])(
  'includes a broadband impulse at the first sample of %i samples in the centroid',
  (length) => {
    const samples = new Float32Array(length);
    samples[0] = 1;

    expect(computeSpectrogramFromMono(samples).centroidBin).toBeCloseTo(512, 0);
  },
);

it.each([2_048, 2_049, 4_096, 4_097, 8_192, 8_193])(
  'keeps a low tone phase-stable at %i samples',
  (length) => {
    const sampleRate = 48_000;
    const frequency = (4 * sampleRate) / 2_048;
    const sine = centroidHz(sineMix(sampleRate, [[frequency, 1]], length), sampleRate);
    const cosine = centroidHz(
      sineMix(sampleRate, [[frequency, 1, Math.PI / 2]], length),
      sampleRate,
    );
    expect(sine).toBeCloseTo(frequency, 0);
    expect(cosine).toBeCloseTo(frequency, 0);
    expect(Math.abs(sine - cosine)).toBeLessThan(1);
  },
);

it.each([2_048, 4_096, 8_192])(
  'changes the mixed-tone centroid continuously after appending to %i samples',
  (length) => {
    const sampleRate = 48_000;
    const tones: Tone[] = [
      [1_000, 1],
      [4_000, 0.1],
    ];
    const before = centroidHz(sineMix(sampleRate, tones, length), sampleRate);
    const after = centroidHz(sineMix(sampleRate, tones, length + 1), sampleRate);

    expect(before).toBeCloseTo(1_273, -2);
    expect(after).toBeCloseTo(1_273, -2);
    expect(Math.abs(before - after)).toBeLessThan(5);
  },
);
