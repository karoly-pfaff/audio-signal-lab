import type { Marker } from '../../audio/types';
import { isRangeMarker } from '../../utils/markerUtils';
import { eventRailPercent, eventRailWidth } from './signalEventRailGeometry';

export function SignalEventMarkers({ markers, duration }: { markers: Marker[]; duration: number }) {
  return markers.map((marker) =>
    isRangeMarker(marker) ? (
      <div
        key={marker.id}
        className="event-rail-marker-range"
        style={{
          left: eventRailPercent(marker.startSeconds, duration),
          width: eventRailWidth(marker.startSeconds, marker.endSeconds!, duration),
        }}
      />
    ) : (
      <div
        key={marker.id}
        className="event-rail-marker-point"
        style={{ left: eventRailPercent(marker.startSeconds, duration) }}
      />
    ),
  );
}
