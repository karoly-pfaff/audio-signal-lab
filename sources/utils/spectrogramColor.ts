export function magnitudeToRGBA(v: number, out: Uint8ClampedArray, offset: number): void {
  let r: number;
  let g: number;
  let b: number;
  let a: number;
  if (v < 0.08) {
    r = 8;
    g = 8;
    b = 16;
    a = Math.round((v / 0.08) * 80);
  } else if (v < 0.3) {
    const t = (v - 0.08) / 0.22;
    r = 10 + Math.round(t * 12);
    g = 12 + Math.round(t * 20);
    b = 28 + Math.round(t * 65);
    a = 80 + Math.round(t * 130);
  } else if (v < 0.6) {
    const t = (v - 0.3) / 0.3;
    r = 22 + Math.round(t * 40);
    g = 32 + Math.round(t * 75);
    b = 93 + Math.round(t * 60);
    a = 210 + Math.round(t * 25);
  } else if (v < 0.85) {
    const t = (v - 0.6) / 0.25;
    r = 62 + Math.round(t * 50);
    g = 107 + Math.round(t * 28);
    b = 153 + Math.round(t * 5);
    a = 235 + Math.round(t * 15);
  } else {
    const t = Math.min(1, (v - 0.85) / 0.15);
    r = 112 + Math.round(t * 65);
    g = 135 - Math.round(t * 35);
    b = 158 - Math.round(t * 28);
    a = 250 + Math.round(t * 5);
  }
  out[offset] = r;
  out[offset + 1] = g;
  out[offset + 2] = b;
  out[offset + 3] = a;
}
