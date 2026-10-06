import { useEffect, useMemo, useState } from 'react';
import type { SpectroFrames } from '../utils/instrumentUtils';
import {
  computeSpectrogramFromMono,
  downmixAudioBuffer,
  flattenSpectrogramFrames,
  renderSpectrogramPixels,
} from '../utils/spectrogram';
import { createSpectrogramWorker } from './spectrogramWorkerFactory';

interface WorkerResult {
  id: number;
  pixels: Uint8ClampedArray<ArrayBuffer>;
  width: number;
  height: number;
  frames: Float32Array;
  numFrames: number;
  binsPerFrame: number;
  centroidBin: number;
}

function createBackground(pixels: Uint8ClampedArray<ArrayBuffer>, width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')?.putImageData(new ImageData(pixels, width, height), 0, 0);
  return canvas;
}

class SpectrogramController {
  readonly background: React.MutableRefObject<HTMLCanvasElement | null> = { current: null };
  private worker: Worker | null = null;
  private pendingId = 0;
  private pendingBuffer: AudioBuffer | null = null;
  private pendingSize: { width: number; height: number } | null = null;
  private onData?: (data: SpectroFrames) => void;
  private onReady?: (buffer: AudioBuffer) => void;

  setCallbacks(
    onData: ((data: SpectroFrames) => void) | undefined,
    onReady: (buffer: AudioBuffer) => void,
  ) {
    this.onData = onData;
    this.onReady = onReady;
  }

  start(): void {
    this.worker = createSpectrogramWorker();
    if (!this.worker) {
      return;
    }
    this.worker.onmessage = (event: MessageEvent<WorkerResult>) => this.handleResult(event.data);
    this.worker.onerror = () => this.recoverWorker();
  }

  stop(): void {
    this.worker?.terminate();
    this.worker = null;
  }

  clear(): void {
    this.pendingBuffer = null;
    this.pendingSize = null;
    this.background.current = null;
  }

  compute(buffer: AudioBuffer, size: { width: number; height: number }): void {
    this.pendingBuffer = buffer;
    this.pendingSize = size;
    const id = ++this.pendingId;
    if (this.worker) {
      const mono = downmixAudioBuffer(buffer);
      try {
        this.worker.postMessage({ id, samples: mono, ...size }, [mono.buffer]);
        return;
      } catch {
        this.worker.terminate();
        this.worker = null;
      }
    }
    this.computeSynchronously(buffer, size);
  }

  private computeSynchronously(buffer: AudioBuffer, size: { width: number; height: number }): void {
    const mono = downmixAudioBuffer(buffer);
    const spectrogram = computeSpectrogramFromMono(mono);
    this.background.current = createBackground(
      renderSpectrogramPixels(spectrogram, size.width, size.height),
      size.width,
      size.height,
    );
    this.onReady?.(buffer);
    this.onData?.({
      flat: flattenSpectrogramFrames(spectrogram),
      numFrames: spectrogram.numFrames,
      binsPerFrame: spectrogram.binsPerFrame,
      centroidBin: spectrogram.centroidBin,
    });
  }

  private recoverWorker(): void {
    this.worker?.terminate();
    this.worker = null;
    if (this.pendingBuffer && this.pendingSize) {
      this.computeSynchronously(this.pendingBuffer, this.pendingSize);
    }
  }

  private handleResult(data: WorkerResult): void {
    if (data.id !== this.pendingId) {
      return;
    }
    this.background.current = createBackground(data.pixels, data.width, data.height);
    if (this.pendingBuffer) {
      this.onReady?.(this.pendingBuffer);
    }
    this.onData?.({
      flat: data.frames,
      numFrames: data.numFrames,
      binsPerFrame: data.binsPerFrame,
      centroidBin: data.centroidBin,
    });
  }
}

export function useSpectrogram(
  buffer: AudioBuffer | null,
  width: number,
  height: number,
  onData?: (data: SpectroFrames) => void,
) {
  const [controller] = useState(() => new SpectrogramController());
  const [readyBuffer, setReadyBuffer] = useState<AudioBuffer | null>(null);
  const size = useMemo(() => ({ width, height }), [height, width]);
  useEffect(() => controller.setCallbacks(onData, setReadyBuffer), [controller, onData]);
  useEffect(() => {
    controller.start();
    return () => controller.stop();
  }, [controller]);
  useEffect(() => {
    if (buffer) {
      controller.compute(buffer, size);
    } else {
      controller.clear();
    }
  }, [buffer, controller, size]);
  const state = !buffer ? 'idle' : readyBuffer === buffer ? 'ready' : 'computing';
  return { background: controller.background, state } as const;
}
