import type { Marker } from '../../audio/types';
import { isRangeMarker } from '../../utils/markerUtils';

interface SpectrogramMarkerOverlaysProps {
  markers: Marker[] | undefined;
  duration: number;
}

export function SpectrogramMarkerOverlays({ markers, duration }: SpectrogramMarkerOverlaysProps) {
  if (!markers?.length || duration <= 0) {
    return null;
  }
  return markers.map((marker) =>
    isRangeMarker(marker) ? (
      <div
        key={marker.id}
        className="spectrogram-marker-range"
        style={{
          left: `${(marker.startSeconds / duration) * 100}%`,
          width: `${Math.max(0.25, ((marker.endSeconds! - marker.startSeconds) / duration) * 100)}%`,
        }}
        aria-hidden="true"
      />
    ) : (
      <div
        key={marker.id}
        className="spectrogram-marker-point"
        style={{ left: `${(marker.startSeconds / duration) * 100}%` }}
        aria-hidden="true"
      />
    ),
  );
}
