import type { AnalysisDashboardProps } from './analysisDashboardTypes';
import { DashboardPanel } from './DashboardPanel';
import { EnergyTimelineDisplay } from './EnergyTimelineDisplay';
import { TransientsPanel } from './TransientsPanel';

export function DashboardTimelinePanels(props: AnalysisDashboardProps) {
  const shared = {
    buffer: props.track.buffer,
    hoverRatio: props.hoverRatio,
    onHoverChange: props.onHoverChange,
    playhead: props.playhead,
    selection: props.track.selection,
    markers: props.track.markers,
  };
  return (
    <>
      <div className="dash-row dash-row--loudness">
        <DashboardPanel label="LOUDNESS" className="dash-panel--loudness">
          <EnergyTimelineDisplay {...shared} height={72} />
        </DashboardPanel>
      </div>
      <div className="dash-row dash-row--transients">
        <DashboardPanel label="TRANSIENTS" className="dash-panel--transients">
          <div className="dash-panel-body">
            <TransientsPanel {...shared} />
          </div>
        </DashboardPanel>
      </div>
    </>
  );
}
