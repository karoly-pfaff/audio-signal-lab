import type { MainTrackState } from '../../audio/types';
import { selectionDurationSeconds } from '../../utils/selectionUtils';
import { formatTime } from '../../utils/transportUtils';

interface MainTrackSelectionReadoutProps {
  selection: NonNullable<MainTrackState['selection']>;
  clear: () => void;
}

export function MainTrackSelectionReadout({ selection, clear }: MainTrackSelectionReadoutProps) {
  return (
    <div className="viz-action-bar-right">
      <span className="selection-readout">
        {formatTime(selection.startSeconds)}
        <span className="selection-readout-sep">—</span>
        {formatTime(selection.endSeconds)}
        <span className="selection-readout-dur">
          · {formatTime(selectionDurationSeconds(selection))}
        </span>
      </span>
      <button
        type="button"
        className="selection-clear-btn"
        onClick={clear}
        aria-label="Clear selection"
      >
        ✕
      </button>
    </div>
  );
}
