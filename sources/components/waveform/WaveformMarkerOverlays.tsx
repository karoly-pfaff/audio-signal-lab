import type { Marker } from '../../audio/types';
import { isRangeMarker } from '../../utils/markerUtils';

export function WaveformMarkerOverlays({
  markers,
  duration,
}: {
  markers: Marker[];
  duration: number;
}) {
  if (!markers.length || duration <= 0) {
    return null;
  }
  return (
    <div className="waveform-marker-layer" aria-hidden="true">
      {markers.map((marker) =>
        isRangeMarker(marker) ? (
          <div
            key={marker.id}
            className="waveform-marker-range"
            style={{
              left: `${(marker.startSeconds / duration) * 100}%`,
              width: `${Math.max(0.25, ((marker.endSeconds! - marker.startSeconds) / duration) * 100)}%`,
            }}
          />
        ) : (
          <div
            key={marker.id}
            className="waveform-marker-point"
            style={{ left: `${(marker.startSeconds / duration) * 100}%` }}
          />
        ),
      )}
    </div>
  );
}
