import { analyzeChannelData } from '../audio/analysis';
import type { AudioAnalysisSummary } from '../audio/analysis';

interface AnalysisRequest {
  id: number;
  channels: Float32Array[];
  sampleRate: number;
  durationSeconds: number;
}

interface AnalysisResponse {
  id: number;
  summary: AudioAnalysisSummary;
}

// Redeclare postMessage to match the DedicatedWorkerGlobalScope signature.
// The DOM lib types self.postMessage as Window.postMessage which requires targetOrigin.
declare function postMessage(message: AnalysisResponse): void;

self.onmessage = (e: MessageEvent<AnalysisRequest>) => {
  const { id, channels, sampleRate, durationSeconds } = e.data;
  const summary = analyzeChannelData(channels, sampleRate, durationSeconds);
  postMessage({ id, summary });
};
