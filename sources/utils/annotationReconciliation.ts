import type { SelectionRange, Marker } from '../audio/types';
import { isRangeMarker, sortMarkersByTime } from './markerUtils';
import {
  hasMinimumTimeSpan,
  isLoopableSelection,
  MIN_LOOP_SELECTION_SECONDS,
} from './selectionUtils';

export interface ReconciliationResult {
  selection: SelectionRange | null;
  markers: Marker[];
  droppedCount: number;
  adjustedCount: number;
}

interface ReconciledSelection {
  selection: SelectionRange | null;
  dropped: number;
  adjusted: number;
}

function reconcileSelection(
  selection: SelectionRange | null,
  durationSeconds: number,
): ReconciledSelection {
  if (!selection) {
    return { selection: null, dropped: 0, adjusted: 0 };
  }
  if (selection.startSeconds >= durationSeconds) {
    return { selection: null, dropped: 1, adjusted: 0 };
  }
  const endSeconds = Math.min(selection.endSeconds, durationSeconds);
  if (!isLoopableSelection({ startSeconds: selection.startSeconds, endSeconds })) {
    return { selection: null, dropped: 1, adjusted: 0 };
  }
  return {
    selection: { startSeconds: selection.startSeconds, endSeconds },
    dropped: 0,
    adjusted: endSeconds < selection.endSeconds ? 1 : 0,
  };
}

function reconcileMarker(marker: Marker, durationSeconds: number): Marker | null {
  if (!isRangeMarker(marker)) {
    return marker.startSeconds <= durationSeconds ? marker : null;
  }
  if (marker.startSeconds >= durationSeconds) {
    return null;
  }
  const endSeconds = Math.min(marker.endSeconds!, durationSeconds);
  if (!hasMinimumTimeSpan(marker.startSeconds, endSeconds, MIN_LOOP_SELECTION_SECONDS)) {
    return null;
  }
  return endSeconds < marker.endSeconds! ? { ...marker, endSeconds } : marker;
}

export function reconcileAnnotationsForDuration(
  selection: SelectionRange | null,
  markers: Marker[],
  durationSeconds: number,
): ReconciliationResult {
  const reconciledSelection = reconcileSelection(selection, durationSeconds);
  const reconciledMarkers: Marker[] = [];
  let droppedCount = reconciledSelection.dropped;
  let adjustedCount = reconciledSelection.adjusted;
  for (const marker of markers) {
    const reconciled = reconcileMarker(marker, durationSeconds);
    if (!reconciled) {
      droppedCount++;
    } else {
      reconciledMarkers.push(reconciled);
      adjustedCount += reconciled === marker ? 0 : 1;
    }
  }

  return {
    selection: reconciledSelection.selection,
    markers: sortMarkersByTime(reconciledMarkers),
    droppedCount,
    adjustedCount,
  };
}
