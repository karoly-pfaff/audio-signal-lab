import { detectTempo } from '../audio/bpmCore';

interface BpmWorkerRequest {
  data: Float32Array;
  sampleRate: number;
}

declare function postMessage(message: { bpm: number | null }): void;

self.onmessage = ({ data }: MessageEvent<BpmWorkerRequest>) => {
  postMessage({ bpm: detectTempo(data.data, data.sampleRate) });
};
