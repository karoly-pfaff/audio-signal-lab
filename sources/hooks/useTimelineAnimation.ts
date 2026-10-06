import { useEffect, useRef } from 'react';
import type { Marker, SelectionRange } from '../audio/types';
import { drawTimelineOverlays, startCanvasAnimation } from '../utils/timelineCanvas';

interface TimelineAnimationOptions {
  buffer?: AudioBuffer | null;
  duration?: number;
  active?: boolean;
  width: number;
  height: number;
  background: React.RefObject<HTMLCanvasElement | null>;
  hoverRatio: number | null;
  playhead?: number;
  selection?: SelectionRange | null;
  markers?: Marker[];
  transientStyle?: boolean;
}

export function useTimelineAnimation(options: TimelineAnimationOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  }, [options]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    return startCanvasAnimation({
      canvas,
      width: options.width,
      height: options.height,
      getBackground: () => options.background.current,
      drawOverlay: (context) => {
        const current = latest.current;
        drawTimelineOverlays(context, {
          width: current.width,
          height: current.height,
          duration: current.duration ?? current.buffer?.duration ?? 0,
          selection: current.selection,
          selectionStyle: current.transientStyle
            ? { fillColor: 'rgba(100, 170, 255, 0.10)', strokeColor: 'rgba(100, 170, 255, 0.20)' }
            : undefined,
          playhead: (current.active ?? Boolean(current.buffer)) ? current.playhead : undefined,
          playheadStyle: current.transientStyle
            ? { color: 'rgba(255, 255, 255, 0.65)' }
            : undefined,
          hoverRatio: (current.active ?? Boolean(current.buffer)) ? current.hoverRatio : null,
          hoverStyle: current.transientStyle ? { color: 'rgba(255, 255, 255, 0.28)' } : undefined,
          markers: current.markers,
        });
      },
    });
  }, [options.active, options.background, options.height, options.width]);
  return canvasRef;
}
