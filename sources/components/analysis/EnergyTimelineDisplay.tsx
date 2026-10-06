import { useEffect, useMemo, useRef } from 'react';
import type { Marker, SelectionRange } from '../../audio/types';
import { useTimelineAnimation } from '../../hooks/useTimelineAnimation';
import { computeEnergyTimeline } from '../../utils/instrumentUtils';

const CANVAS_WIDTH = 800;
const NUM_BUCKETS = 400;

interface EnergyTimelineDisplayProps {
  buffer: AudioBuffer | null;
  hoverRatio: number | null;
  onHoverChange?: (ratio: number | null) => void;
  playhead?: number;
  height?: number;
  selection?: SelectionRange | null;
  markers?: Marker[];
}

function renderEnergy(
  context: CanvasRenderingContext2D,
  timeline: Float32Array | null,
  height: number,
) {
  context.fillStyle = '#0C0C11';
  context.fillRect(0, 0, CANVAS_WIDTH, height);
  if (!timeline?.length) {
    return;
  }
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, 'rgba(139, 168, 238, 0.62)');
  gradient.addColorStop(1, 'rgba(139, 168, 238, 0.07)');
  context.fillStyle = gradient;
  context.beginPath();
  context.moveTo(0, height);
  for (let x = 0; x < CANVAS_WIDTH; x++) {
    const index = Math.min(timeline.length - 1, Math.floor((x / CANVAS_WIDTH) * timeline.length));
    context.lineTo(x, height - timeline[index]! * (height - 1));
  }
  context.lineTo(CANVAS_WIDTH, height);
  context.closePath();
  context.fill();
  context.strokeStyle = 'rgba(139, 168, 238, 0.70)';
  context.stroke();
}

function useEnergyBackground(buffer: AudioBuffer | null, height: number) {
  const background = useRef<HTMLCanvasElement | null>(null);
  const timeline = useMemo(() => {
    if (!buffer) {
      return null;
    }
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) =>
      buffer.getChannelData(index),
    );
    return computeEnergyTimeline(channels, NUM_BUCKETS);
  }, [buffer]);
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (context) {
      renderEnergy(context, timeline, height);
    }
    background.current = canvas;
  }, [height, timeline]);
  return background;
}

export function EnergyTimelineDisplay(props: EnergyTimelineDisplayProps) {
  const height = props.height ?? 36;
  const background = useEnergyBackground(props.buffer, height);
  const canvasRef = useTimelineAnimation({ ...props, width: CANVAS_WIDTH, height, background });
  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    props.onHoverChange?.(Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)));
  };
  return (
    <div
      className="energy-timeline-wrap"
      onMouseMove={handleMove}
      onMouseLeave={() => props.onHoverChange?.(null)}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={height}
        className="energy-timeline-canvas"
        style={{ width: '100%', height }}
        aria-hidden="true"
      />
    </div>
  );
}
