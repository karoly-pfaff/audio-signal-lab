import type { MainTrackState } from '../../audio/types';
import { MainTrackSelectionReadout } from './MainTrackSelectionReadout';

interface MainTrackActionBarProps {
  track: MainTrackState;
  addPoint: () => void;
  addRange: () => void;
  clear: () => void;
}

export function MainTrackActionBar({ track, addPoint, addRange, clear }: MainTrackActionBarProps) {
  return (
    <div className="viz-action-bar">
      <div className="viz-action-bar-left">
        <button
          type="button"
          className="marker-add-btn"
          onClick={addPoint}
          title="Add a point marker at the current playhead position"
        >
          + Marker
        </button>
        {track.selection && (
          <button
            type="button"
            className="marker-add-btn"
            onClick={addRange}
            title="Add a range marker from the current selection"
          >
            + From Selection
          </button>
        )}
      </div>
      {track.selection && <MainTrackSelectionReadout selection={track.selection} clear={clear} />}
    </div>
  );
}
