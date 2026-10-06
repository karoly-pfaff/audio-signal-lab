export function formatTime(seconds: number): string {
  const t = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const wholeSeconds = Math.floor(t);
  const m = Math.floor(wholeSeconds / 60);
  const s = wholeSeconds % 60;
  const tenth = Math.min(9, Math.floor((t - wholeSeconds) * 10 + 1e-9));
  return `${m}:${String(s).padStart(2, '0')}.${tenth}`;
}

export function wrapLayerOffset(offset: number, duration: number): number {
  if (duration <= 0) {
    return 0;
  }
  return offset % duration;
}

export function resolveMasterGain(volume: number, muted: boolean): number {
  return muted ? 0 : volume;
}
