import type { SelectionRange } from '../../audio/types';

export function WaveformSelectionOverlay({
  selection,
  duration,
}: {
  selection: SelectionRange | null;
  duration: number;
}) {
  if (!selection || duration <= 0) {
    return null;
  }
  return (
    <div className="waveform-selection-layer" aria-hidden="true">
      <div
        className="waveform-selection"
        style={{
          left: `${(selection.startSeconds / duration) * 100}%`,
          width: `${Math.max(0, ((selection.endSeconds - selection.startSeconds) / duration) * 100)}%`,
        }}
      />
    </div>
  );
}
