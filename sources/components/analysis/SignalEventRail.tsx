import type { SignalRegion } from '../../audio/analysis';
import type { Marker, SelectionRange } from '../../audio/types';
import { eventRailPercent, eventRailWidth } from './signalEventRailGeometry';
import { SignalEventMarkers } from './SignalEventMarkers';
import { SignalEventRegions } from './SignalEventRegions';

interface SignalEventRailProps {
  duration: number;
  markers: Marker[];
  clippingRegions: SignalRegion[];
  silentRegions: SignalRegion[];
  selection: SelectionRange | null;
  hoverRatio?: number | null;
  playhead?: number;
}

export function SignalEventRail(props: SignalEventRailProps) {
  const { duration, markers, clippingRegions, silentRegions, selection, hoverRatio, playhead } =
    props;
  if (duration <= 0) {
    return null;
  }
  return (
    <div className="signal-event-rail" aria-hidden="true">
      {selection && (
        <div
          className="event-rail-selection"
          style={{
            left: eventRailPercent(selection.startSeconds, duration),
            width: eventRailWidth(selection.startSeconds, selection.endSeconds, duration),
          }}
        />
      )}
      <SignalEventRegions regions={silentRegions} duration={duration} kind="silence" />
      <SignalEventRegions regions={clippingRegions} duration={duration} kind="clip" />
      <SignalEventMarkers markers={markers} duration={duration} />
      {hoverRatio !== null && hoverRatio !== undefined && hoverRatio >= 0 && hoverRatio <= 1 && (
        <div className="event-rail-hover" style={{ left: `${hoverRatio * 100}%` }} />
      )}
      {playhead !== undefined && playhead >= 0 && playhead <= 1 && (
        <div className="event-rail-playhead" style={{ left: `${playhead * 100}%` }} />
      )}
    </div>
  );
}
