import {
  formatClippedSamples,
  formatClippingRisk,
  formatLongestSilence,
  formatSilentRatio,
} from './analysisPanelFormatters';
import type { AnalysisPanelContentProps } from './analysisPanelTypes';
import { AnalysisCell } from './AnalysisCell';

export function AnalysisSignalCells({ analysis }: Pick<AnalysisPanelContentProps, 'analysis'>) {
  const riskClass =
    analysis.clippingRisk !== 'none' ? `analysis-risk-${analysis.clippingRisk}` : undefined;
  return (
    <>
      <div className="analysis-section-head">
        <span className="analysis-section-label">SIGNAL</span>
      </div>
      <AnalysisCell
        label="Clipping"
        value={formatClippingRisk(analysis.clippingRisk)}
        valueClass={riskClass}
        title="Samples at or near full-scale amplitude (≥ 0.999)"
      />
      <AnalysisCell
        label="Clipped Samples"
        value={formatClippedSamples(analysis.clippedSampleCount, analysis.clippedSampleRatio)}
        title="Count and percentage of samples at or near full scale"
      />
      <AnalysisCell
        label="Silence"
        value={formatSilentRatio(analysis.silentSampleRatio)}
        title="Portion of the file below a very low signal threshold (< 0.0001)"
      />
      <AnalysisCell
        label="Silent Regions"
        value={String(analysis.silentRegionCount)}
        title="Contiguous low-signal sections detected with 50 ms time windows"
      />
      <AnalysisCell
        label="Longest Silence"
        value={formatLongestSilence(analysis.longestSilentRegionSeconds)}
        title="Longest detected low-signal region"
      />
    </>
  );
}
