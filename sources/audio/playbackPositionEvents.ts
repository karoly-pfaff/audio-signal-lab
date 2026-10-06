export type PlaybackPositionListener = (seconds: number) => void;

const listeners = new Set<PlaybackPositionListener>();

export function publishPlaybackPosition(seconds: number): void {
  listeners.forEach((listener) => listener(seconds));
}

export function subscribePlaybackPosition(listener: PlaybackPositionListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
