import type { Marker } from '../../audio/types';
import { isRangeMarker } from '../../utils/markerUtils';

interface BandLanesMarkerLayerProps {
  markers: Marker[] | undefined;
  duration: number | undefined;
}

export function BandLanesMarkerLayer({ markers, duration }: BandLanesMarkerLayerProps) {
  if (!markers?.length || !duration) {
    return null;
  }
  return (
    <div className="band-lanes-marker-layer" aria-hidden="true">
      {markers.map((marker) =>
        isRangeMarker(marker) ? (
          <div
            key={marker.id}
            className="band-lanes-marker-range"
            style={{
              left: `${(marker.startSeconds / duration) * 100}%`,
              width: `${Math.max(0.25, ((marker.endSeconds! - marker.startSeconds) / duration) * 100)}%`,
            }}
          />
        ) : (
          <div
            key={marker.id}
            className="band-lanes-marker-point"
            style={{ left: `${(marker.startSeconds / duration) * 100}%` }}
          />
        ),
      )}
    </div>
  );
}
