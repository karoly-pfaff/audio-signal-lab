import { useAudioLabStore } from '../../store/useAudioLabStore';
import { sortMarkersByTime } from '../../utils/markerUtils';
import { MarkerRow } from './MarkerRow';

interface MarkerPanelProps {
  /** 'dashboard' hides the panel's own header and removes its outer border/margin. */
  variant?: 'default' | 'dashboard';
}

export function MarkerPanel({ variant = 'default' }: MarkerPanelProps) {
  const { mainTrack, jumpToMarker, removeMarker, updateMarkerLabel } = useAudioLabStore();
  const { markers } = mainTrack;

  const sorted = sortMarkersByTime(markers);

  return (
    <div className={`marker-panel${variant === 'dashboard' ? ' marker-panel--dashboard' : ''}`}>
      {variant === 'default' && (
        <div className="marker-panel-header">
          <span className="panel-label">MARKERS</span>
          <span className="marker-count">{markers.length}</span>
        </div>
      )}
      {markers.length === 0 ? (
        <div className="marker-panel-empty">No markers yet</div>
      ) : (
        <div className="marker-list">
          {sorted.map((marker) => (
            <MarkerRow
              key={marker.id}
              marker={marker}
              onJump={() => jumpToMarker(marker.id)}
              onDelete={() => removeMarker(marker.id)}
              onRename={(label) => updateMarkerLabel(marker.id, label)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
