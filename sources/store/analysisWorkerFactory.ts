import type { AudioAnalysisSummary } from '../audio/analysis';

export interface AnalysisWorkerResult {
  id: number;
  summary: AudioAnalysisSummary;
}

export function createAnalysisWorker(
  onResult: (result: AnalysisWorkerResult) => void,
  onError?: () => void,
): Worker | null {
  if (typeof Worker === 'undefined') {
    return null;
  }
  try {
    const worker = new Worker(new URL('../workers/analysis.worker', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (event: MessageEvent<AnalysisWorkerResult>) => onResult(event.data);
    worker.onerror = () => onError?.();
    return worker;
  } catch {
    return null;
  }
}
