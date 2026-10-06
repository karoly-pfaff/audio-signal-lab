import type { TransportControlsProps } from './transportControlTypes';

type TransportPlayButtonProps = Pick<
  TransportControlsProps,
  'playing' | 'disabled' | 'playable' | 'play' | 'pause'
>;

export function TransportPlayButton({
  playing,
  disabled,
  playable,
  play,
  pause,
}: TransportPlayButtonProps) {
  return (
    <button
      className={`transport-btn transport-btn--play${playing ? ' transport-btn--active' : ''}`}
      onClick={playing ? pause : play}
      disabled={disabled || !playable}
      type="button"
      title={playing ? 'Pause (Space)' : 'Play (Space)'}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        {playing ? (
          <>
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </>
        ) : (
          <path d="M8 5v14l11-7z" />
        )}
      </svg>
    </button>
  );
}
