import { useCallback } from 'react';
import type { Marker, SelectionRange } from '../../audio/types';
import { useSpectrogram } from '../../hooks/useSpectrogram';
import { useTimelineAnimation } from '../../hooks/useTimelineAnimation';
import { clampRatio } from '../../utils/playbackNavigation';
import type { SpectroFrames } from '../../utils/instrumentUtils';
import { SpectrogramMarkerOverlays } from './SpectrogramMarkerOverlays';
import { SpectrogramSelectionOverlay } from './SpectrogramSelectionOverlay';

const WIDTH = 800;

interface SpectrogramDisplayProps {
  buffer: AudioBuffer | null;
  hoverRatio?: number | null;
  onHoverChange?: (ratio: number | null) => void;
  height?: number;
  playhead?: number;
  selection?: SelectionRange | null;
  markers?: Marker[];
  onSpectroData?: (data: SpectroFrames) => void;
}

export function SpectrogramDisplay(props: SpectrogramDisplayProps) {
  const height = props.height ?? 72;
  const { background, state } = useSpectrogram(props.buffer, WIDTH, height, props.onSpectroData);
  const canvasRef = useTimelineAnimation({
    ...props,
    hoverRatio: props.hoverRatio ?? null,
    width: WIDTH,
    height,
    background,
  });
  const move = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      props.onHoverChange?.(clampRatio((event.clientX - rect.left) / rect.width));
    },
    [props],
  );
  const leave = useCallback(() => props.onHoverChange?.(null), [props]);
  const duration = props.buffer?.duration ?? 0;
  return (
    <div className="spectrogram-wrap">
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={height}
        className="spectrogram-canvas"
        style={{ width: '100%', height }}
        aria-hidden="true"
        onPointerMove={move}
        onPointerLeave={leave}
      />
      <SpectrogramSelectionOverlay selection={props.selection} duration={duration} />
      <SpectrogramMarkerOverlays markers={props.markers} duration={duration} />
      {state === 'computing' && (
        <div className="spectrogram-computing" aria-hidden="true">
          Building spectrogram…
        </div>
      )}
    </div>
  );
}
