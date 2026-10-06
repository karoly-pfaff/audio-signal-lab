import { isRangeMarker } from './markerUtils';
import type { Marker, SelectionRange } from '../audio/types';

interface CursorStyle {
  color: string;
  shadowColor?: string;
  shadowBlur?: number;
}

interface SelectionStyle {
  fillColor: string;
  strokeColor: string;
}

interface TimelineOverlayOptions {
  width: number;
  height: number;
  duration: number;
  selection?: SelectionRange | null;
  selectionStyle?: SelectionStyle;
  playhead?: number;
  playheadStyle?: CursorStyle;
  hoverRatio?: number | null;
  hoverStyle?: CursorStyle;
  markers?: Marker[];
}

interface CursorOptions extends CursorStyle {
  ratio: number | null | undefined;
  width: number;
  height: number;
}

interface SelectionOptions extends SelectionStyle {
  selection: SelectionRange | null | undefined;
  duration: number;
  width: number;
  height: number;
}

interface MarkerOptions {
  markers: Marker[] | undefined;
  duration: number;
  width: number;
  height: number;
}

interface CanvasAnimationOptions {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  getBackground: () => CanvasImageSource | null;
  drawOverlay: (ctx: CanvasRenderingContext2D) => void;
}

const DEFAULT_PLAYHEAD_STYLE: CursorStyle = {
  color: 'rgba(255, 255, 255, 0.75)',
  shadowColor: 'rgba(255, 255, 255, 0.40)',
  shadowBlur: 3,
};

const DEFAULT_HOVER_STYLE: CursorStyle = {
  color: 'rgba(255, 255, 255, 0.30)',
};

const DEFAULT_SELECTION_STYLE: SelectionStyle = {
  fillColor: 'rgba(100, 170, 255, 0.12)',
  strokeColor: 'rgba(100, 170, 255, 0.22)',
};

function drawCursor(
  ctx: CanvasRenderingContext2D,
  { ratio, width, height, color, shadowColor, shadowBlur }: CursorOptions,
): void {
  if (ratio === null || ratio === undefined || ratio < 0 || ratio > 1) {
    return;
  }

  const x = Math.floor(ratio * width);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  if (shadowColor) {
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = shadowBlur ?? 0;
  }
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, height);
  ctx.stroke();
  ctx.restore();
}

function drawSelection(
  ctx: CanvasRenderingContext2D,
  { selection, duration, width, height, fillColor, strokeColor }: SelectionOptions,
): void {
  if (!selection || duration <= 0) {
    return;
  }

  const startX = Math.floor((selection.startSeconds / duration) * width);
  const endX = Math.ceil((selection.endSeconds / duration) * width);
  ctx.save();
  ctx.fillStyle = fillColor;
  ctx.fillRect(startX, 0, endX - startX, height);
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(startX, 0);
  ctx.lineTo(startX, height);
  ctx.moveTo(endX, 0);
  ctx.lineTo(endX, height);
  ctx.stroke();
  ctx.restore();
}

function drawMarkers(
  ctx: CanvasRenderingContext2D,
  { markers, duration, width, height }: MarkerOptions,
): void {
  if (!markers?.length || duration <= 0) {
    return;
  }

  ctx.save();
  for (const marker of markers) {
    const startX = Math.floor((marker.startSeconds / duration) * width);
    ctx.strokeStyle = isRangeMarker(marker)
      ? 'rgba(232, 168, 74, 0.55)'
      : 'rgba(232, 168, 74, 0.70)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, 0);
    ctx.lineTo(startX, height);

    if (isRangeMarker(marker)) {
      const endX = Math.ceil((marker.endSeconds! / duration) * width);
      ctx.fillStyle = 'rgba(232, 168, 74, 0.10)';
      ctx.fillRect(startX, 0, endX - startX, height);
      ctx.moveTo(endX, 0);
      ctx.lineTo(endX, height);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function drawTimelineOverlays(
  ctx: CanvasRenderingContext2D,
  options: TimelineOverlayOptions,
): void {
  const {
    width,
    height,
    duration,
    selection,
    selectionStyle = DEFAULT_SELECTION_STYLE,
    playhead,
    playheadStyle = DEFAULT_PLAYHEAD_STYLE,
    hoverRatio,
    hoverStyle = DEFAULT_HOVER_STYLE,
    markers,
  } = options;

  drawSelection(ctx, { selection, duration, width, height, ...selectionStyle });
  drawCursor(ctx, { ratio: playhead, width, height, ...playheadStyle });
  drawCursor(ctx, { ratio: hoverRatio, width, height, ...hoverStyle });
  drawMarkers(ctx, { markers, duration, width, height });
}

export function startCanvasAnimation({
  canvas,
  width,
  height,
  getBackground,
  drawOverlay,
}: CanvasAnimationOptions): () => void {
  let frameId = 0;
  const draw = () => {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, width, height);
      const background = getBackground();
      if (background) {
        ctx.drawImage(background, 0, 0);
      }
      drawOverlay(ctx);
    }
    frameId = requestAnimationFrame(draw);
  };

  frameId = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(frameId);
}
