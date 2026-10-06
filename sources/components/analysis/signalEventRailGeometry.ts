export function eventRailPercent(seconds: number, duration: number): string {
  return `${(seconds / duration) * 100}%`;
}

export function eventRailWidth(start: number, end: number, duration: number): string {
  return `${Math.max(0.15, ((end - start) / duration) * 100)}%`;
}
