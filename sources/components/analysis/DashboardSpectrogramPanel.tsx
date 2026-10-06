import type { AnalysisDashboardProps } from './analysisDashboardTypes';
import { BandLanesDisplay } from './BandLanesDisplay';
import { DashboardPanel } from './DashboardPanel';
import { SpectrogramDisplay } from './SpectrogramDisplay';

export function DashboardSpectrogramPanel(props: AnalysisDashboardProps) {
  const sampleRate = props.track.buffer?.sampleRate ?? 44100;
  return (
    <div className="dash-row dash-row--secondary">
      <DashboardPanel label="SPECTROGRAM" className="dash-panel--spectrogram">
        <SpectrogramDisplay
          buffer={props.track.buffer}
          hoverRatio={props.hoverRatio}
          onHoverChange={props.onHoverChange}
          height={140}
          playhead={props.playhead}
          selection={props.track.selection}
          markers={props.track.markers}
          onSpectroData={props.onSpectroData}
        />
        <BandLanesDisplay
          spectroFrames={props.spectroFrames}
          sampleRate={sampleRate}
          hoverRatio={props.hoverRatio}
          onHoverChange={props.onHoverChange}
          playhead={props.playhead}
          selection={props.track.selection}
          duration={props.duration || undefined}
          laneHeight={14}
          markers={props.track.markers}
        />
      </DashboardPanel>
    </div>
  );
}
