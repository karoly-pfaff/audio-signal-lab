import { audioEngine } from '../audio/AudioEngine';
import type { Marker } from '../audio/types';
import { createPointMarker, createRangeMarker, isRangeMarker } from '../utils/markerUtils';
import type { AnnotationActions } from './audioLabStoreTypes';
import type { StoreContext } from './storeContext';
import { MAX_MARKERS } from './sessionLimits';

function markerLimitReached(context: StoreContext): boolean {
  if (context.get().mainTrack.markers.length < MAX_MARKERS) {
    return false;
  }
  context.status.show(`Marker limit reached (${MAX_MARKERS})`, 4000);
  return true;
}

function createAddPointMarker(context: StoreContext): AnnotationActions['addPointMarker'] {
  return () => {
    const { set, get } = context;
    const { mainTrack } = get();
    if (!mainTrack.buffer || markerLimitReached(context)) {
      return;
    }
    const marker = createPointMarker(audioEngine.currentTime, mainTrack.markers.length + 1);
    set((state) => ({
      mainTrack: { ...state.mainTrack, markers: [...state.mainTrack.markers, marker] },
    }));
  };
}

function createAddRangeMarker(context: StoreContext): AnnotationActions['addRangeMarker'] {
  return () => {
    const { set, get } = context;
    const { mainTrack } = get();
    if (!mainTrack.buffer || !mainTrack.selection || markerLimitReached(context)) {
      return;
    }
    const marker = createRangeMarker(
      mainTrack.selection.startSeconds,
      mainTrack.selection.endSeconds,
      mainTrack.markers.length + 1,
    );
    set((state) => ({
      mainTrack: { ...state.mainTrack, markers: [...state.mainTrack.markers, marker] },
    }));
  };
}

function createUpdateMarkerLabel({ set }: StoreContext): AnnotationActions['updateMarkerLabel'] {
  return (id, label) => {
    const trimmed = label.trim().slice(0, 80);
    if (!trimmed) {
      return;
    }
    set((state) => ({
      mainTrack: {
        ...state.mainTrack,
        markers: state.mainTrack.markers.map((marker: Marker) =>
          marker.id === id ? { ...marker, label: trimmed } : marker,
        ),
      },
    }));
  };
}

function createRemoveMarker({ set }: StoreContext): AnnotationActions['removeMarker'] {
  return (id) => {
    set((state) => ({
      mainTrack: {
        ...state.mainTrack,
        markers: state.mainTrack.markers.filter((marker: Marker) => marker.id !== id),
      },
    }));
  };
}

function createJumpToMarker({ get }: StoreContext): AnnotationActions['jumpToMarker'] {
  return (id) => {
    const marker = get().mainTrack.markers.find((candidate: Marker) => candidate.id === id);
    if (!marker) {
      return;
    }
    if (isRangeMarker(marker)) {
      get().setMainSelection(marker.startSeconds, marker.endSeconds!);
    }
    audioEngine.seek(marker.startSeconds);
  };
}

export function createAnnotationActions(context: StoreContext): AnnotationActions {
  return {
    addPointMarker: createAddPointMarker(context),
    addRangeMarker: createAddRangeMarker(context),
    updateMarkerLabel: createUpdateMarkerLabel(context),
    removeMarker: createRemoveMarker(context),
    jumpToMarker: createJumpToMarker(context),
  };
}
