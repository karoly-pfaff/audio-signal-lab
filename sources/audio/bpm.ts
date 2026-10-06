import type { BpmConfidence } from './types';

export type { BpmConfidence };

export type BpmRelation = 'compatible' | 'close' | 'halfDouble' | 'mismatch';

export interface BpmResult {
  bpm: number;
  confidence: BpmConfidence;
}

interface BpmWorkerResponse {
  bpm: number | null;
}

// Fold bpm into the [60, 120) octave for half/double comparison.
export function normalizeBpm(bpm: number): number {
  let n = bpm;
  while (n >= 120) {
    n /= 2;
  }
  while (n < 60) {
    n *= 2;
  }
  return n;
}

export function maybeHalfDoubleMatch(bpm1: number, bpm2: number): boolean {
  return Math.abs(normalizeBpm(bpm1) - normalizeBpm(bpm2)) <= 5;
}

export function getBpmRelation(bpm1: number, bpm2: number): BpmRelation {
  const diff = Math.abs(bpm1 - bpm2);
  if (diff <= 2) {
    return 'compatible';
  }
  if (diff <= 5) {
    return 'close';
  }
  if (maybeHalfDoubleMatch(bpm1, bpm2)) {
    return 'halfDouble';
  }
  return 'mismatch';
}

export function areBpmsCompatible(bpm1: number, bpm2: number): boolean {
  return getBpmRelation(bpm1, bpm2) !== 'mismatch';
}

export function formatBpm(
  bpm: number | null | undefined,
  confidence?: BpmConfidence | null,
): string {
  if (bpm === null || bpm === undefined) {
    return '';
  }
  const prefix = confidence === 'low' ? '~' : '';
  return `${prefix}${Math.round(bpm)} BPM`;
}

function confidenceFromValue(bpm: number): BpmConfidence {
  if (bpm >= 60 && bpm <= 160) {
    return 'high';
  }
  if (bpm >= 40 && bpm <= 220) {
    return 'medium';
  }
  return 'low';
}

function mixChannels(buffer: AudioBuffer, signal?: AbortSignal): Float32Array | null {
  const maxSamples = Math.min(buffer.length, buffer.sampleRate * 60);
  const data = new Float32Array(maxSamples);
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let index = 0; index < maxSamples; index++) {
      if (index % 16_384 === 0 && signal?.aborted) {
        return null;
      }
      data[index] = data[index]! + channelData[index]! / buffer.numberOfChannels;
    }
  }
  return data;
}

function detectTempoInWorker(
  worker: Worker | null,
  data: Float32Array,
  sampleRate: number,
  signal?: AbortSignal,
): Promise<number | null> | null {
  if (!worker) {
    return null;
  }
  return new Promise((resolve) => {
    let finished = false;
    const finish = (bpm: number | null) => {
      if (finished) {
        return;
      }
      finished = true;
      signal?.removeEventListener('abort', abort);
      worker.terminate();
      resolve(bpm);
    };
    const abort = () => finish(null);
    if (signal?.aborted) {
      finish(null);
      return;
    }
    signal?.addEventListener('abort', abort, { once: true });
    worker.onmessage = ({ data: response }: MessageEvent<BpmWorkerResponse>) =>
      finish(response.bpm);
    worker.onerror = () => finish(null);
    try {
      worker.postMessage({ data, sampleRate }, [data.buffer]);
    } catch {
      finish(null);
    }
  });
}

async function detectTempo(
  data: Float32Array,
  sampleRate: number,
  signal?: AbortSignal,
): Promise<number | null> {
  if (signal?.aborted) {
    return null;
  }
  const { createBpmWorker } = await import('./bpmWorkerFactory');
  const workerResult = detectTempoInWorker(createBpmWorker(), data, sampleRate, signal);
  if (workerResult) {
    return workerResult;
  }
  const core = await import('./bpmCore');
  return signal?.aborted ? null : core.detectTempo(data, sampleRate);
}

export async function detectBpm(
  buffer: AudioBuffer,
  signal?: AbortSignal,
): Promise<BpmResult | null> {
  try {
    const mixed = mixChannels(buffer, signal);
    if (!mixed) {
      return null;
    }
    const bpm = await detectTempo(mixed, buffer.sampleRate, signal);
    if (bpm === null) {
      return null;
    }
    return { bpm: Math.round(bpm * 10) / 10, confidence: confidenceFromValue(bpm) };
  } catch {
    return null;
  }
}
