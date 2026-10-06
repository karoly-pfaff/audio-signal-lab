import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'sources/index.css'), 'utf8');
const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const dynamicsLabels = source('sources/components/analysis/DynamicsGaugeLabels.tsx');
const stereoImage = source('sources/components/analysis/StereoImagePanel.tsx');
const centroidCard = source('sources/components/analysis/SpectralCentroidCard.tsx');
const spectrumCanvas = source('sources/utils/spectrumCanvas.ts');
const backgrounds = [
  [9, 9, 12],
  [12, 12, 17],
  [16, 16, 22],
  [21, 21, 30],
  [27, 27, 39],
  [33, 33, 48],
] as const;

function tokenRgba(name: string): { color: number[]; alpha: number } {
  const match = css.match(new RegExp(`--${name}: rgba\\((\\d+), (\\d+), (\\d+), ([0-9.]+)\\)`));
  if (!match) {
    throw new Error(`Missing rgba token: --${name}`);
  }
  return {
    color: [Number(match[1]), Number(match[2]), Number(match[3])],
    alpha: Number(match[4]),
  };
}

function relativeLuminance([red, green, blue]: readonly number[]): number {
  const linear = [red, green, blue].map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function overlay(
  foreground: readonly number[],
  background: readonly number[],
  alpha: number,
): number[] {
  return background.map((channel, index) => foreground[index]! * alpha + channel * (1 - alpha));
}

function contrast(foreground: readonly number[], background: readonly number[]): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

it.each(['text-secondary', 'text-muted'])('%s has at least 4.5:1 text contrast', (token) => {
  const { color, alpha } = tokenRgba(token);
  for (const background of backgrounds) {
    expect(contrast(overlay(color, background, alpha), background)).toBeGreaterThanOrEqual(4.5);
  }
});

it.each(['border-soft', 'border'])('%s has at least 3:1 non-text contrast', (token) => {
  const { color, alpha } = tokenRgba(token);
  for (const background of backgrounds) {
    expect(contrast(overlay(color, background, alpha), background)).toBeGreaterThanOrEqual(3);
  }
});

it.each(['analysis-label', 'analysis-section-label'])(
  '%s uses a contrast-verified text token',
  (className) => {
    const rule = new RegExp(`\\.${className}\\s*\\{[^}]*color: var\\(--text-muted\\);`, 's');
    expect(css).toMatch(rule);
  },
);

it.each(['marker-panel-empty', 'bottom-bar-empty'])(
  'does not reduce the effective contrast of .%s',
  (className) => {
    const rule = css.match(new RegExp(`\\.${className}\\s*\\{([^}]*)\\}`, 's'))?.[1] ?? '';
    expect(rule).toContain('color: var(--text-muted)');
    expect(rule).not.toContain('opacity:');
  },
);

it('does not dim the complete spectrum canvas in its idle state', () => {
  expect(css).not.toMatch(/\.spectrum-inspector-canvas--idle\s*\{[^}]*opacity:/s);
});

it('keeps visible SVG and canvas labels at muted-text contrast or higher', () => {
  expect(dynamicsLabels).toContain("const MUTED_TEXT = 'rgba(240,240,248,0.5)'");
  expect(stereoImage).toContain("fillStyle = 'rgba(240, 240, 248, 0.5)'");
  expect(stereoImage).toMatch(
    /fillStyle = '#0C0C11';\s*context\.fillRect\(center - 14, SIZE - 20, 28, 14\);/,
  );
  expect(centroidCard).toContain("'rgba(240,240,248,0.5)'");
  expect(spectrumCanvas.match(/rgba\(240, 240, 248, 0\.5\)/g)).toHaveLength(2);
  for (const background of [
    [12, 12, 17],
    [16, 16, 22],
  ]) {
    expect(contrast(overlay([240, 240, 248], background, 0.5), background)).toBeGreaterThanOrEqual(
      4.5,
    );
  }
});

it('isolates band labels from signal colors with an opaque surface', () => {
  const { color, alpha } = tokenRgba('text-primary');
  const background = [12, 12, 17];
  expect(css).toMatch(/\.band-lane-labels\s*\{[^}]*background: var\(--bg-deep\);/s);
  expect(css).toMatch(/\.band-lane-label\s*\{[^}]*color: var\(--text-primary\);/s);
  expect(contrast(overlay(color, background, alpha), background)).toBeGreaterThanOrEqual(4.5);
});
