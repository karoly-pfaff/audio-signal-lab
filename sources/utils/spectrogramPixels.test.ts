import { expect, it } from 'vitest';
import {
  computeSpectrogramFromMono,
  renderSpectrogramPixels,
  type SpectrogramData,
} from './spectrogram';

const DISPLAY_HEIGHT = 140;

function singleBinSpectrogram(bin: number): SpectrogramData {
  const frame = new Float32Array(256);
  frame[bin] = 1;
  return { frames: [frame], numFrames: 1, binsPerFrame: frame.length, centroidBin: bin };
}

it('maps every stored FFT bin into the rendered display', () => {
  for (let bin = 0; bin < 256; bin++) {
    const pixels = renderSpectrogramPixels(singleBinSpectrogram(bin), 1, DISPLAY_HEIGHT);
    expect(
      pixels.some((value, index) => index % 4 === 3 && value > 0),
      `bin ${bin}`,
    ).toBe(true);
  }
});

it('renders a sustained 86 Hz tone in a production-height middle column', () => {
  const sampleRate = 44_100;
  const frequency = (4 * sampleRate) / 2_048;
  const samples = Float32Array.from({ length: sampleRate }, (_, index) =>
    Math.sin((2 * Math.PI * frequency * index) / sampleRate),
  );
  const spectrogram = computeSpectrogramFromMono(samples);
  const pixels = renderSpectrogramPixels(spectrogram, spectrogram.numFrames, DISPLAY_HEIGHT);
  const middleX = Math.floor(spectrogram.numFrames / 2);
  const visible = Array.from(
    { length: DISPLAY_HEIGHT },
    (_, y) => pixels[(y * spectrogram.numFrames + middleX) * 4 + 3]!,
  );

  expect(visible.some((alpha) => alpha > 0)).toBe(true);
});
