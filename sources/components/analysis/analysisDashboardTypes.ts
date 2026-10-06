import type { MainTrackState } from '../../audio/types';
import type { SpectroFrames } from '../../utils/instrumentUtils';

export interface AnalysisDashboardProps {
  track: MainTrackState;
  duration: number;
  playhead?: number;
  hoverRatio: number | null;
  spectroFrames: SpectroFrames | null;
  onHoverChange: (ratio: number | null) => void;
  onSpectroData: (data: SpectroFrames) => void;
  onSeek: (ratio: number) => void;
  onSelection: (start: number, end: number) => void;
  onClearSelection: () => void;
}
