import type { Marker } from '../../audio/types';

interface MarkerActionsProps {
  marker: Marker;
  jump: () => void;
  remove: () => void;
}

export function MarkerActions({ marker, jump, remove }: MarkerActionsProps) {
  return (
    <>
      <button
        className="marker-jump-btn"
        onClick={jump}
        type="button"
        aria-label={`Jump to ${marker.label}`}
        title="Jump to marker"
      >
        ↵
      </button>
      <button
        className="marker-delete-btn"
        onClick={remove}
        type="button"
        aria-label={`Remove ${marker.label}`}
        title="Remove marker"
      >
        ✕
      </button>
    </>
  );
}
