import type { TransportControlsProps } from './transportControlTypes';
import { TransportIconButton } from './TransportIconButton';
import { TransportPlayButton } from './TransportPlayButton';

export function TransportControls(props: TransportControlsProps) {
  return (
    <div className="transport-controls">
      <div className="transport-buttons">
        <TransportIconButton
          title="Restart from beginning (Home)"
          disabled={props.disabled}
          onClick={props.seekToStart}
          kind="jump"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
          </svg>
        </TransportIconButton>
        <TransportIconButton
          title="Jump back 5s (←)"
          disabled={props.disabled}
          onClick={props.jumpBack}
          kind="jump"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M11 18V6l-8.5 6 8.5 6zm.5-6 8.5 6V6l-8.5 6z" />
          </svg>
        </TransportIconButton>
        <TransportPlayButton {...props} />
        <TransportIconButton
          title="Stop (Esc)"
          disabled={props.disabled}
          onClick={props.stop}
          kind="stop"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <rect x="5" y="5" width="14" height="14" rx="1" />
          </svg>
        </TransportIconButton>
        <TransportIconButton
          title="Jump forward 5s (→)"
          disabled={props.disabled}
          onClick={props.jumpForward}
          kind="jump"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
          </svg>
        </TransportIconButton>
      </div>
    </div>
  );
}
