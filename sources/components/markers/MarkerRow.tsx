import { useState } from 'react';
import type { Marker } from '../../audio/types';
import { formatMarkerRange, isRangeMarker } from '../../utils/markerUtils';
import { MarkerActions } from './MarkerActions';
import { MarkerLabelEditor } from './MarkerLabelEditor';

interface MarkerRowProps {
  marker: Marker;
  onJump: () => void;
  onDelete: () => void;
  onRename: (label: string) => void;
}

export function MarkerRow({ marker, onJump, onDelete, onRename }: MarkerRowProps) {
  const [editing, setEditing] = useState(false);
  const finishEdit = (label: string | null) => {
    if (label) {
      onRename(label);
    }
    setEditing(false);
  };
  return (
    <div className="marker-row">
      <span
        className={`marker-type-badge marker-type-badge--${marker.type}`}
        title={isRangeMarker(marker) ? 'Range marker' : 'Point marker'}
        aria-hidden="true"
      >
        {isRangeMarker(marker) ? '⊢' : '|'}
      </span>
      {editing ? (
        <MarkerLabelEditor marker={marker} finish={finishEdit} />
      ) : (
        <button
          className="marker-label-btn"
          onClick={() => setEditing(true)}
          type="button"
          title="Click to rename"
        >
          {marker.label}
        </button>
      )}
      <span className="marker-time">{formatMarkerRange(marker)}</span>
      <MarkerActions marker={marker} jump={onJump} remove={onDelete} />
    </div>
  );
}
