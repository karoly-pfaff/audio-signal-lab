import type { AudioAnalysisSummary } from '../../audio/analysis';

export interface AnalysisPanelContentProps {
  analysis: AudioAnalysisSummary;
  bpm: number | null | undefined;
}
