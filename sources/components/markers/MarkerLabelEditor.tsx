import { useState } from 'react';
import type { Marker } from '../../audio/types';
import { MAX_MARKER_LABEL_LENGTH } from '../../utils/markerUtils';

interface MarkerLabelEditorProps {
  marker: Marker;
  finish: (label: string | null) => void;
}

export function MarkerLabelEditor({ marker, finish }: MarkerLabelEditorProps) {
  const [draft, setDraft] = useState(marker.label);
  const commit = () => finish(draft.trim() || null);
  return (
    <input
      className="marker-label-input"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commit();
        }
        if (event.key === 'Escape') {
          finish(null);
        }
      }}
      autoFocus
      maxLength={MAX_MARKER_LABEL_LENGTH}
      aria-label="Rename marker"
    />
  );
}
