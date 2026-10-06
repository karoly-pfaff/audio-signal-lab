import { sampleSignalRanges } from './audioEnvelope';

interface Envelope {
  top: number[];
  bottom: number[];
}

function computeEnvelope(buffer: AudioBuffer, width: number, height: number): Envelope {
  const amplitude = height / 2;
  const top: number[] = [];
  const bottom: number[] = [];
  for (const { minimum, maximum } of sampleSignalRanges(buffer, width)) {
    top.push((1 + minimum) * amplitude);
    bottom.push((1 + maximum) * amplitude);
  }
  return { top, bottom };
}

function fillEnvelope(
  context: CanvasRenderingContext2D,
  points: number[],
  options: { color: string; width: number; height: number; upward: boolean },
) {
  const center = options.height / 2;
  const gradient = context.createLinearGradient(0, center, 0, options.upward ? 0 : options.height);
  gradient.addColorStop(0, options.color + '00');
  gradient.addColorStop(1, options.color + '3A');
  context.fillStyle = gradient;
  context.beginPath();
  context.moveTo(0, center);
  points.forEach((y, x) => context.lineTo(x, y));
  context.lineTo(options.width, center);
  context.closePath();
  context.fill();
}

function strokeEnvelope(
  context: CanvasRenderingContext2D,
  envelope: Envelope,
  color: string,
  width: number,
) {
  context.strokeStyle = color + 'A8';
  context.lineWidth = 1.5;
  context.shadowColor = color;
  context.shadowBlur = 6;
  context.beginPath();
  for (let x = 0; x < width; x++) {
    if (x === 0) {
      context.moveTo(x, envelope.top[x]!);
    } else {
      context.lineTo(x, envelope.top[x]!);
      context.lineTo(x, envelope.bottom[x]!);
    }
  }
  context.stroke();
}

export function renderWaveform(
  buffer: AudioBuffer | null,
  color: string,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    return canvas;
  }
  if (!buffer) {
    context.strokeStyle = color + '28';
    context.setLineDash([3, 8]);
    context.beginPath();
    context.moveTo(0, height / 2);
    context.lineTo(width, height / 2);
    context.stroke();
    return canvas;
  }
  const envelope = computeEnvelope(buffer, width, height);
  fillEnvelope(context, envelope.top, { color, width, height, upward: true });
  fillEnvelope(context, envelope.bottom, { color, width, height, upward: false });
  strokeEnvelope(context, envelope, color, width);
  return canvas;
}
