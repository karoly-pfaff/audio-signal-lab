import { useId, useState } from 'react';
import { SpeakerIcon } from './SpeakerIcon';

interface MonitorControlProps {
  volume: number;
  muted: boolean;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
}

function focusRemainsInside(element: HTMLElement, next: EventTarget | null): boolean {
  return next instanceof Node && element.contains(next);
}

function useMonitorDisclosure() {
  const [open, setOpen] = useState(false);
  return {
    open,
    show: () => setOpen(true),
    leave: (event: React.MouseEvent<HTMLDivElement>) => {
      if (!focusRemainsInside(event.currentTarget, document.activeElement)) {
        setOpen(false);
      }
    },
    blur: (event: React.FocusEvent<HTMLDivElement>) => {
      if (!focusRemainsInside(event.currentTarget, event.relatedTarget)) {
        setOpen(false);
      }
    },
  };
}

export function MonitorControl({ volume, muted, setVolume, toggleMute }: MonitorControlProps) {
  const disclosure = useMonitorDisclosure();
  const overlayId = useId();
  const label = volume === 0 ? '-∞' : `${(20 * Math.log10(volume)).toFixed(1)} dB`;
  return (
    <div className="transport-right">
      <div
        className="monitor-control"
        onMouseEnter={disclosure.show}
        onMouseLeave={disclosure.leave}
        onFocus={disclosure.show}
        onBlur={disclosure.blur}
      >
        {disclosure.open && (
          <div id={overlayId} className="monitor-overlay">
            <span className="monitor-overlay-db">{label}</span>
            <input
              type="range"
              className={`monitor-slider-v${muted ? ' monitor-slider-v--muted' : ''}`}
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(event) => setVolume(parseFloat(event.target.value))}
              aria-label="Volume"
            />
          </div>
        )}
        <button
          className={`monitor-mute-btn${muted ? ' monitor-mute-btn--muted' : ''}`}
          onClick={toggleMute}
          type="button"
          aria-pressed={muted}
          aria-expanded={disclosure.open}
          aria-controls={overlayId}
          title={muted ? 'Unmute monitor' : 'Mute monitor'}
        >
          <SpeakerIcon muted={muted} />
        </button>
      </div>
    </div>
  );
}
