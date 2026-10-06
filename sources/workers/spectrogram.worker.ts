import {
  computeSpectrogramFromMono,
  flattenSpectrogramFrames,
  renderSpectrogramPixels,
} from '../utils/spectrogram';

interface SpectrogramRequest {
  id: number;
  samples: Float32Array;
  width: number;
  height: number;
}

interface SpectrogramResponse {
  id: number;
  pixels: Uint8ClampedArray<ArrayBuffer>;
  width: number;
  height: number;
  frames: Float32Array; // flattened: numFrames × binsPerFrame
  numFrames: number;
  binsPerFrame: number;
  centroidBin: number;
}

declare function postMessage(message: SpectrogramResponse, transfer: Transferable[]): void;

self.onmessage = (e: MessageEvent<SpectrogramRequest>) => {
  const { id, samples, width, height } = e.data;
  const spectro = computeSpectrogramFromMono(samples);
  const pixels = renderSpectrogramPixels(spectro, width, height);

  // Flatten Float32Array[] into a single transferable buffer.
  const { numFrames, binsPerFrame, centroidBin } = spectro;
  const frames = flattenSpectrogramFrames(spectro);

  postMessage({ id, pixels, width, height, frames, numFrames, binsPerFrame, centroidBin }, [
    pixels.buffer as ArrayBuffer,
    frames.buffer as ArrayBuffer,
  ]);
};
