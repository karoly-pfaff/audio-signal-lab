import type { AnalysisDashboardProps } from './analysisDashboardTypes';
import { DashboardPanel } from './DashboardPanel';
import { SignalEventRail } from './SignalEventRail';
import { WaveformDisplay } from '../waveform/WaveformDisplay';

export function DashboardWaveformPanel(props: AnalysisDashboardProps) {
  const { track } = props;
  return (
    <div className="dash-row dash-row--primary">
      <DashboardPanel label="WAVEFORM" className="dash-panel--waveform">
        <WaveformDisplay
          buffer={track.buffer}
          height={96}
          color="#8BA8EE"
          playhead={props.playhead}
          onSeek={props.onSeek}
          variant="active"
          silentRegions={track.analysis?.silentRegions}
          clippingRegions={track.analysis?.clippingRegions}
          externalHoverRatio={props.hoverRatio}
          onHoverChange={props.onHoverChange}
          selection={track.selection}
          onSelection={props.onSelection}
          onClearSelection={track.selection ? props.onClearSelection : undefined}
          markers={track.markers}
        />
        <SignalEventRail
          duration={props.duration}
          markers={track.markers}
          clippingRegions={track.analysis?.clippingRegions ?? []}
          silentRegions={track.analysis?.silentRegions ?? []}
          selection={track.selection}
          hoverRatio={props.hoverRatio}
          playhead={props.playhead}
        />
      </DashboardPanel>
    </div>
  );
}
