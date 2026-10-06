import { getHoverLabelEdge } from '../../utils/selectionUtils';
import { formatTime } from '../../utils/transportUtils';

export function WaveformHoverOverlay({
  ratio,
  duration,
}: {
  ratio: number | null;
  duration: number;
}) {
  if (ratio === null) {
    return null;
  }
  const edge = getHoverLabelEdge(ratio);
  return (
    <div
      className="waveform-hover-indicator"
      style={{ left: `${ratio * 100}%` }}
      aria-hidden="true"
    >
      <span
        className={`waveform-hover-label${edge !== 'center' ? ` waveform-hover-label--${edge}` : ''}`}
      >
        {formatTime(ratio * duration)}
      </span>
      <div className="waveform-hover-line" />
    </div>
  );
}
