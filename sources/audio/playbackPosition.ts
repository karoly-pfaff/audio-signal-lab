interface PlaybackBounds {
  duration: number;
  loop: boolean;
  loopStart: number;
  loopEnd: number;
}

export function normalizePlaybackPosition(position: number, bounds: PlaybackBounds): number {
  const nonNegative = Math.max(0, position);
  if (!bounds.loop || bounds.duration <= 0) {
    return Math.min(nonNegative, bounds.duration || nonNegative);
  }
  const start = Math.max(0, Math.min(bounds.loopStart, bounds.duration));
  const configuredEnd = bounds.loopEnd > start ? bounds.loopEnd : bounds.duration;
  const end = Math.max(start, Math.min(configuredEnd, bounds.duration));
  if (nonNegative < start || end <= start) {
    return Math.min(nonNegative, bounds.duration);
  }
  return start + ((nonNegative - start) % (end - start));
}
