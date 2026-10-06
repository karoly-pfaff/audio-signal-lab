export interface TransportControlsProps {
  playing: boolean;
  disabled: boolean;
  playable: boolean;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seekToStart: () => void;
  jumpBack: () => void;
  jumpForward: () => void;
}
