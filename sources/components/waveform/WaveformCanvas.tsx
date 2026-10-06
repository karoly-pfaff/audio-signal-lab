import type { useWaveformInteraction } from '../../hooks/useWaveformInteraction';

interface WaveformCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  width: number;
  height: number;
  playhead?: number;
  interactive: boolean;
  handlers: ReturnType<typeof useWaveformInteraction>;
}

export function WaveformCanvas({
  canvasRef,
  width,
  height,
  playhead,
  interactive,
  handlers,
}: WaveformCanvasProps) {
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`waveform-canvas${interactive ? ' waveform-canvas--seekable' : ''}`}
      style={{ width: '100%', height, touchAction: interactive ? 'none' : undefined }}
      role={interactive ? 'slider' : undefined}
      aria-label={interactive ? 'Seek position — drag to select range' : undefined}
      aria-valuenow={interactive ? Math.round((playhead ?? 0) * 100) : undefined}
      aria-valuemin={interactive ? 0 : undefined}
      aria-valuemax={interactive ? 100 : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={handlers.keyDown}
      onPointerDown={handlers.pointerDown}
      onPointerMove={handlers.pointerMove}
      onPointerUp={handlers.pointerUp}
      onPointerLeave={handlers.pointerLeave}
      onDoubleClick={handlers.doubleClick}
    />
  );
}
