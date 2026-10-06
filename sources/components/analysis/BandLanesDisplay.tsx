import { useEffect, useMemo, useRef } from 'react';
import type { Marker, SelectionRange } from '../../audio/types';
import { useTimelineAnimation } from '../../hooks/useTimelineAnimation';
import { renderBandLanes } from '../../utils/bandLanesCanvas';
import {
  BAND_LABELS,
  BAND_NAMES,
  computeBandLanes,
  type SpectroFrames,
} from '../../utils/instrumentUtils';
import { BandLanesMarkerLayer } from './BandLanesMarkerLayer';

const WIDTH = 800;

interface BandLanesDisplayProps {
  spectroFrames: SpectroFrames | null;
  sampleRate: number;
  hoverRatio: number | null;
  onHoverChange?: (ratio: number | null) => void;
  playhead?: number;
  selection?: SelectionRange | null;
  duration?: number;
  laneHeight?: number;
  markers?: Marker[];
}

function useBandBackground(frames: SpectroFrames | null, sampleRate: number, laneHeight: number) {
  const background = useRef<HTMLCanvasElement | null>(null);
  const lanes = useMemo(
    () => (frames ? computeBandLanes(frames, sampleRate) : null),
    [frames, sampleRate],
  );
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = laneHeight * BAND_NAMES.length;
    const context = canvas.getContext('2d');
    if (context && lanes) {
      renderBandLanes(context, lanes, frames?.numFrames ?? 0, { width: WIDTH, laneHeight });
    }
    background.current = canvas;
  }, [frames, laneHeight, lanes]);
  return background;
}

export function BandLanesDisplay(props: BandLanesDisplayProps) {
  const laneHeight = props.laneHeight ?? 14;
  const height = laneHeight * BAND_NAMES.length;
  const background = useBandBackground(props.spectroFrames, props.sampleRate, laneHeight);
  const canvasRef = useTimelineAnimation({
    ...props,
    width: WIDTH,
    height,
    background,
    active: Boolean(props.spectroFrames),
  });
  if (!props.spectroFrames) {
    return null;
  }
  const move = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    props.onHoverChange?.(Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)));
  };
  return (
    <div className="band-lanes-section">
      <div className="band-lanes-wrap">
        <div className="band-lane-labels" aria-hidden="true">
          {BAND_NAMES.map((name) => (
            <span key={name} className="band-lane-label">
              {BAND_LABELS[name]}
            </span>
          ))}
        </div>
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={height}
          className="band-lanes-canvas"
          style={{ width: '100%', height }}
          onMouseMove={move}
          onMouseLeave={() => props.onHoverChange?.(null)}
          aria-hidden="true"
        />
        <BandLanesMarkerLayer markers={props.markers} duration={props.duration} />
      </div>
    </div>
  );
}
