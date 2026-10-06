interface SpectrumCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  idle: boolean;
  width: number;
  height: number;
}

export function SpectrumCanvas({ canvasRef, idle, width, height }: SpectrumCanvasProps) {
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`spectrum-inspector-canvas${idle ? ' spectrum-inspector-canvas--idle' : ''}`}
      style={{ width: '100%', height }}
      aria-hidden="true"
    />
  );
}
