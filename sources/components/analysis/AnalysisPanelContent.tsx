import type { AnalysisPanelContentProps } from './analysisPanelTypes';
import { AnalysisSignalCells } from './AnalysisSignalCells';
import { AnalysisTechnicalCells } from './AnalysisTechnicalCells';

export function AnalysisPanelContent({ analysis, bpm }: AnalysisPanelContentProps) {
  return (
    <div className="analysis-panel">
      <div className="analysis-panel-header">
        <span className="panel-label">ANALYSIS</span>
      </div>
      <div className="analysis-grid">
        <AnalysisTechnicalCells analysis={analysis} bpm={bpm} />
        <AnalysisSignalCells analysis={analysis} />
      </div>
    </div>
  );
}
