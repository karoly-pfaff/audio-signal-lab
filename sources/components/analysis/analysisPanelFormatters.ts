import type { ClippingRisk } from '../../audio/analysis';

export function formatAnalysisDuration(seconds: number): string {
  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) {
    return `${hours}:${String(minutes % 60).padStart(2, '00')}:${String(wholeSeconds % 60).padStart(2, '0')}`;
  }
  return `${minutes}:${String(wholeSeconds % 60).padStart(2, '0')}`;
}

export function formatAnalysisHz(hz: number): string {
  return hz >= 1000 ? `${(hz / 1000).toFixed(1)} kHz` : `${hz} Hz`;
}

export function formatAnalysisChannels(count: number): string {
  if (count === 1) {
    return 'Mono';
  }
  if (count === 2) {
    return 'Stereo';
  }
  return `${count}ch`;
}

export function formatAnalysisDb(db: number | null | undefined): string {
  if (db === null || db === undefined) {
    return '—';
  }
  return `${db >= 0 ? '+' : ''}${db.toFixed(1)} dB`;
}

export function formatAnalysisDcOffset(offset: number): string {
  return Math.abs(offset) < 0.0001 ? '≈ 0' : offset.toFixed(4);
}

export function formatClippingRisk(risk: ClippingRisk): string {
  return { none: 'None', low: 'Low', medium: 'Medium', high: 'High' }[risk];
}

function formatCompactCount(count: number): string {
  if (count < 1000) {
    return String(count);
  }
  if (count < 1_000_000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return `${(count / 1_000_000).toFixed(2)}M`;
}

export function formatClippedSamples(count: number, ratio: number): string {
  if (count === 0) {
    return '0';
  }
  const percentage = ratio < 0.00001 ? '<.001%' : `${(ratio * 100).toFixed(3)}%`;
  return `${formatCompactCount(count)} (${percentage})`;
}

export function formatSilentRatio(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

export function formatLongestSilence(seconds: number): string {
  if (seconds === 0) {
    return '—';
  }
  if (seconds < 1) {
    return '< 1 s';
  }
  if (seconds < 60) {
    return `${seconds.toFixed(1)} s`;
  }
  return formatAnalysisDuration(seconds);
}
