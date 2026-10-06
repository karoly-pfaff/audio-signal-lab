import { useEffect, useRef } from 'react';
import { sampleSignalRanges } from '../../utils/audioEnvelope';
import { ArtworkThumbnail } from './ArtworkThumbnail';
import { SignalGlyphThumbnail } from './SignalGlyphThumbnail';
import { SignalWaveformThumbnail } from './SignalWaveformThumbnail';

function renderMiniWaveform(
  canvas: HTMLCanvasElement,
  buffer: AudioBuffer,
  color: string,
  w: number,
  h: number,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  ctx.clearRect(0, 0, w, h);

  const amp = h / 2;

  ctx.fillStyle = color + 'A0';
  sampleSignalRanges(buffer, w).forEach(({ minimum, maximum }, x) => {
    const max = Math.max(Math.abs(minimum), Math.abs(maximum));
    const barH = Math.max(1, Math.round(max * amp * 2));
    ctx.fillRect(x, Math.round(amp - barH / 2), 1, barH);
  });
}

interface SignalThumbnailProps {
  buffer: AudioBuffer | null;
  artworkUrl?: string | null;
  size?: number;
  color?: string;
}

export function SignalThumbnail({
  buffer,
  artworkUrl,
  size = 48,
  color = '#B0A0E8',
}: SignalThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!buffer || artworkUrl) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    renderMiniWaveform(canvas, buffer, color, size * 2, size);
  }, [buffer, artworkUrl, color, size]);

  if (artworkUrl) {
    return <ArtworkThumbnail url={artworkUrl} size={size} />;
  }

  if (buffer) {
    return <SignalWaveformThumbnail canvasRef={canvasRef} size={size} />;
  }

  return <SignalGlyphThumbnail size={size} />;
}
