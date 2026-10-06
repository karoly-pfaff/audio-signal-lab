export interface RulerTick {
  ratio: number;
  label: string;
}

// Intervals in seconds — ordered smallest to largest
const TICK_INTERVALS_S = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];

const MAX_TICKS = 8;

export function formatTickLabel(seconds: number): string {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function generateRulerTicks(duration: number): RulerTick[] {
  if (duration < 1) {
    return [{ ratio: 0, label: '0:00' }];
  }

  const interval =
    TICK_INTERVALS_S.find((iv) => Math.floor(duration / iv) < MAX_TICKS) ??
    TICK_INTERVALS_S[TICK_INTERVALS_S.length - 1]!;

  const numTicks = Math.floor(duration / interval) + 1;
  const ticks: RulerTick[] = [];
  for (let i = 0; i < numTicks; i++) {
    const t = i * interval;
    if (t > duration + 0.001) {
      break;
    }
    ticks.push({ ratio: t / duration, label: formatTickLabel(t) });
  }
  return ticks;
}
