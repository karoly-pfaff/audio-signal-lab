export function SignalWaveformThumbnail({
  canvasRef,
  size,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  size: number;
}) {
  return (
    <div
      className="signal-thumbnail signal-thumbnail--waveform"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        width={size * 2}
        height={size}
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
    </div>
  );
}
