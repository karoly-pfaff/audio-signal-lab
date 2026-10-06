import type { AnalysisDashboardProps } from './analysisDashboardTypes';
import { DashboardInstrumentPanels } from './DashboardInstrumentPanels';
import { DashboardSpectrogramPanel } from './DashboardSpectrogramPanel';
import { DashboardTimelinePanels } from './DashboardTimelinePanels';
import { DashboardWaveformPanel } from './DashboardWaveformPanel';

export type { AnalysisDashboardProps } from './analysisDashboardTypes';

export function AnalysisDashboard(props: AnalysisDashboardProps) {
  return (
    <div className="analysis-dashboard">
      <DashboardWaveformPanel {...props} />
      <DashboardSpectrogramPanel {...props} />
      <DashboardTimelinePanels {...props} />
      <DashboardInstrumentPanels {...props} />
    </div>
  );
}
