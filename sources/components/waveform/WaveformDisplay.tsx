import { useEffect, useRef } from 'react';
import type { SignalRegion } from '../../audio/analysis';
import type { Marker, SelectionRange } from '../../audio/types';
import { useTimelineAnimation } from '../../hooks/useTimelineAnimation';
import { useWaveformInteraction } from '../../hooks/useWaveformInteraction';
import { renderWaveform } from '../../utils/waveformCanvas';
import { ActiveWaveform } from './ActiveWaveform';
import { WaveformCanvas } from './WaveformCanvas';

const WIDTH = 800;

interface WaveformDisplayProps {
  buffer: AudioBuffer | null;
  height?: number;
  color?: string;
  playhead?: number;
  onSeek?: (ratio: number) => void;
  variant?: 'active' | 'compact';
  silentRegions?: SignalRegion[];
  clippingRegions?: SignalRegion[];
  externalHoverRatio?: number | null;
  onHoverChange?: (ratio: number | null) => void;
  selection?: SelectionRange | null;
  onSelection?: (startSeconds: number, endSeconds: number) => void;
  onClearSelection?: () => void;
  markers?: Marker[];
}

function useWaveformBackground(buffer: AudioBuffer | null, color: string, height: number) {
  const background = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    background.current = renderWaveform(buffer, color, WIDTH, height);
  }, [buffer, color, height]);
  return background;
}

function effectiveSelection(
  committed: SelectionRange | null | undefined,
  live: { startRatio: number; endRatio: number } | null,
  duration: number,
): SelectionRange | null {
  return live
    ? { startSeconds: live.startRatio * duration, endSeconds: live.endRatio * duration }
    : (committed ?? null);
}

export function WaveformDisplay(props: WaveformDisplayProps) {
  const height = props.height ?? 48;
  const color = props.color ?? '#00e5ff';
  const variant = props.variant ?? 'compact';
  const background = useWaveformBackground(props.buffer, color, height);
  const canvasRef = useTimelineAnimation({
    buffer: props.buffer,
    width: WIDTH,
    height,
    background,
    hoverRatio: null,
    playhead: props.playhead,
  });
  const handlers = useWaveformInteraction({ ...props, variant });
  const interactive = Boolean((props.onSeek || props.onSelection) && props.buffer);
  const canvas = (
    <WaveformCanvas
      canvasRef={canvasRef}
      width={WIDTH}
      height={height}
      playhead={props.playhead}
      interactive={interactive}
      handlers={handlers}
    />
  );
  if (variant === 'compact') {
    return canvas;
  }
  const duration = props.buffer?.duration ?? 0;
  return (
    <ActiveWaveform
      canvas={canvas}
      duration={duration}
      hoverRatio={handlers.hoverRatio}
      selection={effectiveSelection(props.selection, handlers.liveSelection, duration)}
      markers={props.markers ?? []}
      silentRegions={props.silentRegions ?? []}
      clippingRegions={props.clippingRegions ?? []}
    />
  );
}
