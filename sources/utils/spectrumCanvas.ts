import type { FrequencyTick } from './instrumentUtils';

const LABEL_HEIGHT = 14;

function fillBackground(context: CanvasRenderingContext2D, width: number, height: number) {
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#0C0C11';
  context.fillRect(0, 0, width, height);
}

function drawTicks(
  context: CanvasRenderingContext2D,
  ticks: FrequencyTick[],
  size: { width: number; height: number },
) {
  const { width, height } = size;
  const spectrumHeight = height - LABEL_HEIGHT;
  context.font = '7px monospace';
  context.lineWidth = 1;
  for (const tick of ticks) {
    const x = tick.xRatio * width;
    context.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, spectrumHeight);
    context.stroke();
    context.fillStyle = 'rgba(240, 240, 248, 0.5)';
    context.textAlign = 'center';
    context.fillText(tick.label, x, height - 3);
  }
}

function traceSpectrum(
  context: CanvasRenderingContext2D,
  frame: Float32Array,
  width: number,
  height: number,
) {
  const logBase = Math.log(frame.length + 1);
  context.beginPath();
  for (let index = 0; index < frame.length; index++) {
    const x = (Math.log(index + 1) / logBase) * width;
    const y = height - frame[index]! * (height - 2);
    if (index === 0) {
      context.moveTo(0, y);
    } else {
      context.lineTo(x, y);
    }
  }
}

export function renderIdleSpectrum(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  ticks: FrequencyTick[],
) {
  fillBackground(context, width, height);
  const baseline = (height - LABEL_HEIGHT) * 0.9;
  context.strokeStyle = 'rgba(139, 168, 238, 0.20)';
  context.beginPath();
  for (let x = 0; x <= width; x += 2) {
    const y = baseline + Math.sin(x * 0.18) * 1.8 + Math.sin(x * 0.07) * 1.2;
    if (x === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  context.stroke();
  drawTicks(context, ticks, { width, height });
}

export function renderSpectrum(
  context: CanvasRenderingContext2D,
  frame: Float32Array,
  size: { width: number; height: number },
  ticks: FrequencyTick[],
) {
  const { width, height } = size;
  fillBackground(context, width, height);
  if (!frame.length) {
    return;
  }
  const spectrumHeight = height - LABEL_HEIGHT;
  const gradient = context.createLinearGradient(0, 0, 0, spectrumHeight);
  gradient.addColorStop(0, 'rgba(139, 168, 238, 0.88)');
  gradient.addColorStop(0.55, 'rgba(100, 138, 220, 0.55)');
  gradient.addColorStop(1, 'rgba(60, 80, 175, 0.12)');
  context.fillStyle = gradient;
  traceSpectrum(context, frame, width, spectrumHeight);
  context.lineTo(width, spectrumHeight);
  context.closePath();
  context.fill();
  context.strokeStyle = 'rgba(139, 168, 238, 0.60)';
  traceSpectrum(context, frame, width, spectrumHeight);
  context.stroke();
  drawTicks(context, ticks, { width, height });
}

export function renderComputingSpectrum(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  fillBackground(context, width, height);
  context.fillStyle = 'rgba(240, 240, 248, 0.5)';
  context.font = '8px monospace';
  context.textAlign = 'center';
  context.fillText('computing…', width / 2, height / 2);
}
