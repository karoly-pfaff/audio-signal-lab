import type { AnalysisDashboardProps } from './analysisDashboardTypes';
import { DashboardInstrument } from './DashboardInstrument';
import { DynamicsGauge } from './DynamicsGauge';
import { MarkerPanel } from '../markers/MarkerPanel';
import { SpectralCentroidCard } from './SpectralCentroidCard';
import { StereoImagePanel } from './StereoImagePanel';

export function DashboardInstrumentPanels(props: AnalysisDashboardProps) {
  const analysis = props.track.analysis;
  const sampleRate = props.track.buffer?.sampleRate ?? 44100;
  return (
    <div className="dash-row dash-row--instruments">
      <DashboardInstrument label="DYNAMICS">
        <DynamicsGauge
          dynamicRangeProxyDb={analysis?.dynamicRangeProxyDb ?? null}
          crestFactorDb={analysis?.crestFactorDb ?? null}
        />
      </DashboardInstrument>
      <DashboardInstrument label="STEREO IMAGE">
        <StereoImagePanel buffer={props.track.buffer} />
      </DashboardInstrument>
      <DashboardInstrument label="TONE">
        <SpectralCentroidCard spectroFrames={props.spectroFrames} sampleRate={sampleRate} />
      </DashboardInstrument>
      <DashboardInstrument label="MARKERS" scroll>
        <MarkerPanel variant="dashboard" />
      </DashboardInstrument>
    </div>
  );
}
