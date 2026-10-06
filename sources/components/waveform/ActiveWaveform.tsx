import type { SignalRegion } from '../../audio/analysis';
import type { Marker, SelectionRange } from '../../audio/types';
import { WaveformHoverOverlay } from './WaveformHoverOverlay';
import { WaveformMarkerOverlays } from './WaveformMarkerOverlays';
import { WaveformRegionOverlays } from './WaveformRegionOverlays';
import { WaveformRuler } from './WaveformRuler';
import { WaveformSelectionOverlay } from './WaveformSelectionOverlay';

interface ActiveWaveformProps {
  canvas: React.ReactNode;
  duration: number;
  hoverRatio: number | null;
  selection: SelectionRange | null;
  markers: Marker[];
  silentRegions: SignalRegion[];
  clippingRegions: SignalRegion[];
}

export function ActiveWaveform(props: ActiveWaveformProps) {
  const hasRegions = props.silentRegions.length > 0 || props.clippingRegions.length > 0;
  return (
    <div className="waveform-active-wrap">
      <div className="waveform-canvas-wrap">
        {props.canvas}
        {props.duration > 0 && (
          <WaveformRegionOverlays
            regions={props.silentRegions}
            duration={props.duration}
            kind="silence"
          />
        )}
        {props.duration > 0 && (
          <WaveformRegionOverlays
            regions={props.clippingRegions}
            duration={props.duration}
            kind="clipping"
          />
        )}
        <WaveformHoverOverlay ratio={props.hoverRatio} duration={props.duration} />
        <WaveformSelectionOverlay selection={props.selection} duration={props.duration} />
        <WaveformMarkerOverlays markers={props.markers} duration={props.duration} />
      </div>
      {props.duration > 0 && <WaveformRuler duration={props.duration} />}
      {hasRegions && (
        <div className="waveform-overlay-legend" aria-hidden="true">
          {props.silentRegions.length > 0 && (
            <span className="waveform-legend-item waveform-legend-item--silence">silence</span>
          )}
          {props.clippingRegions.length > 0 && (
            <span className="waveform-legend-item waveform-legend-item--clipping">clipping</span>
          )}
        </div>
      )}
    </div>
  );
}
