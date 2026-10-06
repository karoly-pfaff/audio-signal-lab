import { useEffect, useMemo, useRef } from 'react';
import type { Marker, SelectionRange } from '../../audio/types';
import { useTimelineAnimation } from '../../hooks/useTimelineAnimation';
import { computeEnergyTimeline, computeTransientActivity } from '../../utils/instrumentUtils';

const WIDTH = 800;
const HEIGHT = 74;

interface TransientsPanelProps {
  buffer: AudioBuffer | null;
  hoverRatio: number | null;
  onHoverChange?: (ratio: number | null) => void;
  playhead?: number;
  selection?: SelectionRange | null;
  markers?: Marker[];
}

function computeTransients(buffer: AudioBuffer | null): Float32Array | null {
  if (!buffer) {
    return null;
  }
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) =>
    buffer.getChannelData(index),
  );
  return computeTransientActivity(computeEnergyTimeline(channels, 400));
}

function drawTransients(context: CanvasRenderingContext2D, transients: Float32Array | null) {
  context.fillStyle = '#0C0C11';
  context.fillRect(0, 0, WIDTH, HEIGHT);
  if (!transients?.length) {
    return;
  }
  const barWidth = Math.max(1, Math.ceil(WIDTH / transients.length));
  for (let index = 0; index < transients.length; index++) {
    const transient = transients[index]!;
    const barHeight = transient * (HEIGHT - 2);
    if (barHeight < 0.5) {
      continue;
    }
    const x = Math.floor((index / transients.length) * WIDTH);
    context.fillStyle = `rgba(139, 168, 238, ${(0.35 + transient * 0.55).toFixed(2)})`;
    context.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
  }
}

function useTransientBackground(buffer: AudioBuffer | null) {
  const background = useRef<HTMLCanvasElement | null>(null);
  const transients = useMemo(() => computeTransients(buffer), [buffer]);
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const context = canvas.getContext('2d');
    if (context) {
      drawTransients(context, transients);
    }
    background.current = canvas;
  }, [transients]);
  return background;
}

export function TransientsPanel(props: TransientsPanelProps) {
  const background = useTransientBackground(props.buffer);
  const canvasRef = useTimelineAnimation({
    ...props,
    width: WIDTH,
    height: HEIGHT,
    background,
    transientStyle: true,
  });
  const handleMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    props.onHoverChange?.(Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)));
  };
  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      className="transients-canvas"
      style={{ width: '100%', height: HEIGHT, display: 'block' }}
      onMouseMove={handleMove}
      onMouseLeave={() => props.onHoverChange?.(null)}
      aria-hidden="true"
    />
  );
}
