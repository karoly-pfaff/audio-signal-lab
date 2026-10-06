import { BAND_NAMES, type BandLanes } from './instrumentUtils';

const COLORS: Record<string, [number, number, number]> = {
  sub: [60, 90, 210],
  bass: [30, 185, 175],
  lowMid: [100, 138, 230],
  highMid: [165, 105, 220],
};

function paintEnergies(
  data: Uint8ClampedArray,
  lanes: BandLanes,
  frames: number,
  size: { width: number; laneHeight: number },
) {
  for (let x = 0; x < size.width; x++) {
    const frame = Math.min(frames - 1, Math.floor((x / size.width) * frames));
    for (let band = 0; band < BAND_NAMES.length; band++) {
      const name = BAND_NAMES[band]!;
      const energy = lanes[name][frame] ?? 0;
      const [red, green, blue] = COLORS[name]!;
      for (let offset = 0; offset < size.laneHeight; offset++) {
        const pixel = ((band * size.laneHeight + offset) * size.width + x) * 4;
        data[pixel] = Math.round(8 + red * energy * 0.92);
        data[pixel + 1] = Math.round(8 + green * energy * 0.92);
        data[pixel + 2] = Math.round(14 + blue * energy * 0.88);
        data[pixel + 3] = 255;
      }
    }
  }
}

function paintSeparators(data: Uint8ClampedArray, width: number, laneHeight: number) {
  for (let band = 1; band < BAND_NAMES.length; band++) {
    const row = band * laneHeight;
    for (let x = 0; x < width; x++) {
      const pixel = (row * width + x) * 4;
      data[pixel] = Math.max(data[pixel] ?? 0, 18);
      data[pixel + 1] = Math.max(data[pixel + 1] ?? 0, 18);
      data[pixel + 2] = Math.max(data[pixel + 2] ?? 0, 28);
      data[pixel + 3] = 255;
    }
  }
}

export function renderBandLanes(
  context: CanvasRenderingContext2D,
  lanes: BandLanes,
  frameCount: number,
  size: { width: number; laneHeight: number },
) {
  const { width, laneHeight } = size;
  const height = laneHeight * BAND_NAMES.length;
  context.fillStyle = '#0C0C11';
  context.fillRect(0, 0, width, height);
  if (!frameCount) {
    return;
  }
  const image = context.createImageData(width, height);
  paintEnergies(image.data, lanes, frameCount, { width, laneHeight });
  paintSeparators(image.data, width, laneHeight);
  context.putImageData(image, 0, 0);
}
