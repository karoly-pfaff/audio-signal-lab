import { useCallback, useEffect, useState } from 'react';
import { audioEngine } from '../../audio/AudioEngine';
import { inspectionShared } from '../../audio/inspectionShared';
import { usePlaybackTime } from '../../hooks/usePlaybackTime';
import { useAudioLabStore } from '../../store/useAudioLabStore';
import { isAudioFile } from '../../utils/dropAssignment';
import type { SpectroFrames } from '../../utils/instrumentUtils';
import { AnalysisDashboard } from './AnalysisDashboard';
import { MainTrackActionBar } from './MainTrackActionBar';

function useDashboardState(buffer: AudioBuffer | null) {
  const [hoverRatio, setHoverRatio] = useState<number | null>(null);
  const [spectrogram, setSpectrogram] = useState<{
    buffer: AudioBuffer;
    frames: SpectroFrames;
  } | null>(null);
  const currentTime = usePlaybackTime();
  const duration = audioEngine.getMainDuration();
  const playhead = duration > 0 ? Math.min(currentTime / duration, 1) : undefined;
  useEffect(() => {
    inspectionShared.setPlayheadRatio(playhead ?? 0);
  }, [playhead]);
  useEffect(() => {
    if (!inspectionShared.hasSpectroFramesFor(buffer)) {
      inspectionShared.setSpectroFrames(null);
    }
  }, [buffer]);
  const onHoverChange = useCallback((ratio: number | null) => {
    setHoverRatio(ratio);
    inspectionShared.setHoverRatio(ratio);
  }, []);
  const onSpectroData = useCallback(
    (frames: SpectroFrames) => {
      if (!buffer) {
        return;
      }
      setSpectrogram({ buffer, frames });
      inspectionShared.setSpectroFrames(frames, buffer);
    },
    [buffer],
  );
  return {
    hoverRatio,
    duration,
    playhead,
    spectroFrames: spectrogram?.buffer === buffer ? spectrogram.frames : null,
    onHoverChange,
    onSpectroData,
  };
}

function useMainTrackDrop(load: (file: File) => void) {
  const [over, setOver] = useState(false);
  const dragOver = (event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes('Files')) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setOver(true);
  };
  const dragLeave = (event: React.DragEvent) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setOver(false);
    }
  };
  const drop = (event: React.DragEvent) => {
    event.preventDefault();
    setOver(false);
    const audio = Array.from(event.dataTransfer.files).find(isAudioFile);
    if (audio) {
      load(audio);
    }
  };
  return { over, dragOver, dragLeave, drop };
}

export function MainTrackPanel() {
  const store = useAudioLabStore();
  const dashboard = useDashboardState(store.mainTrack.buffer);
  const drag = useMainTrackDrop(store.loadMainTrack);
  return (
    <div
      className={`main-track-panel${store.mainTrack.buffer ? ' main-track-panel--loaded' : ''}${drag.over ? ' main-track-panel--drag-over' : ''}`}
      onDragOver={drag.dragOver}
      onDragLeave={drag.dragLeave}
      onDrop={drag.drop}
    >
      {store.mainTrack.buffer && (
        <>
          <MainTrackActionBar
            track={store.mainTrack}
            addPoint={store.addPointMarker}
            addRange={store.addRangeMarker}
            clear={store.clearMainSelection}
          />
          <AnalysisDashboard
            track={store.mainTrack}
            {...dashboard}
            onSeek={(ratio) => store.seekTo(ratio * dashboard.duration)}
            onSelection={store.setMainSelection}
            onClearSelection={store.clearMainSelection}
          />
        </>
      )}
    </div>
  );
}
