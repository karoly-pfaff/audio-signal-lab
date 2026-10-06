import {
  formatAnalysisChannels,
  formatAnalysisDb,
  formatAnalysisDcOffset,
  formatAnalysisDuration,
  formatAnalysisHz,
} from './analysisPanelFormatters';
import type { AnalysisPanelContentProps } from './analysisPanelTypes';
import { AnalysisCell } from './AnalysisCell';

export function AnalysisTechnicalCells({ analysis, bpm }: AnalysisPanelContentProps) {
  return (
    <>
      <AnalysisCell label="Duration" value={formatAnalysisDuration(analysis.durationSeconds)} />
      <AnalysisCell label="Sample Rate" value={formatAnalysisHz(analysis.sampleRate)} />
      <AnalysisCell label="Channels" value={formatAnalysisChannels(analysis.channelCount)} />
      <AnalysisCell
        label="Peak"
        value={formatAnalysisDb(analysis.peakDb)}
        title="Highest sample amplitude in the file"
      />
      <AnalysisCell
        label="RMS"
        value={formatAnalysisDb(analysis.rmsDb)}
        title="Average signal energy across the file"
      />
      <AnalysisCell
        label="Crest Factor"
        value={formatAnalysisDb(analysis.crestFactorDb)}
        title="Peak minus RMS — higher values indicate more transient or dynamic content"
      />
      <AnalysisCell
        label="DR Proxy"
        value={formatAnalysisDb(analysis.dynamicRangeProxyDb)}
        title="Range between loudest and quietest 100 ms windows — rough estimate, not mastering-grade"
      />
      <AnalysisCell
        label="DC Offset"
        value={formatAnalysisDcOffset(analysis.dcOffset)}
        title="Mean sample value — should be near 0; a large offset indicates DC bias"
      />
      {bpm !== null && bpm !== undefined && <AnalysisCell label="BPM" value={bpm.toFixed(1)} />}
    </>
  );
}
