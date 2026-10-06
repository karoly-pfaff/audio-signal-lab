import { useEffect, useMemo, useRef } from 'react';
import { sampleStereoPoints } from '../../utils/instrumentUtils';

const SIZE = 90;

function drawGrid(context: CanvasRenderingContext2D) {
  const center = SIZE / 2;
  context.fillStyle = '#0C0C11';
  context.fillRect(0, 0, SIZE, SIZE);
  context.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  context.beginPath();
  context.moveTo(center, 0);
  context.lineTo(center, SIZE);
  context.moveTo(0, center);
  context.lineTo(SIZE, center);
  context.stroke();
  context.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  context.beginPath();
  context.moveTo(0, SIZE);
  context.lineTo(SIZE, 0);
  context.moveTo(0, 0);
  context.lineTo(SIZE, SIZE);
  context.stroke();
}

function drawMono(context: CanvasRenderingContext2D) {
  const center = SIZE / 2;
  context.strokeStyle = 'rgba(139, 168, 238, 0.45)';
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(center, 6);
  context.lineTo(center, SIZE - 6);
  context.stroke();
  context.fillStyle = '#0C0C11';
  context.fillRect(center - 14, SIZE - 20, 28, 14);
  context.font = '7px monospace';
  context.fillStyle = 'rgba(240, 240, 248, 0.5)';
  context.textAlign = 'center';
  context.fillText('MONO', center, SIZE - 10);
}

function drawPoints(context: CanvasRenderingContext2D, points: Array<{ x: number; y: number }>) {
  const center = SIZE / 2;
  for (const point of points) {
    const side = (point.x - point.y) * 0.5;
    const mid = (point.x + point.y) * 0.5;
    const x = center + side * center * 0.95;
    const y = center - mid * center * 0.95;
    const alpha = Math.min(0.6, 0.08 + (Math.abs(side) + Math.abs(mid)) * 0.28);
    context.fillStyle = `rgba(100, 138, 230, ${alpha.toFixed(2)})`;
    context.fillRect(x - 1, y - 1, 2, 2);
  }
}

export function StereoImagePanel({ buffer }: { buffer: AudioBuffer | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const points = useMemo(() => {
    if (!buffer || buffer.numberOfChannels < 2) {
      return null;
    }
    return sampleStereoPoints(buffer, 2000);
  }, [buffer]);
  useEffect(() => {
    const context = canvasRef.current?.getContext('2d');
    if (!context) {
      return;
    }
    drawGrid(context);
    if (buffer && buffer.numberOfChannels < 2) {
      drawMono(context);
    } else if (points) {
      drawPoints(context, points);
    }
  }, [buffer, points]);
  return (
    <canvas
      ref={canvasRef}
      width={SIZE}
      height={SIZE}
      className="stereo-image-canvas"
      style={{ display: 'block', margin: '0 auto' }}
      aria-hidden="true"
    />
  );
}
