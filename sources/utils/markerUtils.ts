import type { Marker } from '../audio/types';
import { formatTime } from './transportUtils';

export const MAX_MARKER_LABEL_LENGTH = 80;

function genId(): string {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function createPointMarker(timeSeconds: number, index: number): Marker {
  return {
    id: genId(),
    type: 'point',
    startSeconds: timeSeconds,
    label: `Marker ${index}`,
    createdAt: Date.now(),
  };
}

export function createRangeMarker(startSeconds: number, endSeconds: number, index: number): Marker {
  return {
    id: genId(),
    type: 'range',
    startSeconds: Math.min(startSeconds, endSeconds),
    endSeconds: Math.max(startSeconds, endSeconds),
    label: `Marker ${index}`,
    createdAt: Date.now(),
  };
}

export function isRangeMarker(marker: Marker): marker is Marker & { endSeconds: number } {
  return marker.type === 'range' && marker.endSeconds !== undefined;
}

export function sortMarkersByTime(markers: Marker[]): Marker[] {
  return [...markers].sort((a, b) => a.startSeconds - b.startSeconds);
}

export function formatMarkerRange(marker: Marker): string {
  if (isRangeMarker(marker)) {
    return `${formatTime(marker.startSeconds)} — ${formatTime(marker.endSeconds!)}`;
  }
  return formatTime(marker.startSeconds);
}
