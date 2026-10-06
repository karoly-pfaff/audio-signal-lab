import { expect, it } from 'vitest';
import { computeClippingRegions, computeSilenceStats } from './analysisRegions';

it('includes a clipped partial window at the end of a file', () => {
  const samples = new Float32Array(485);
  samples[484] = 1;

  expect(computeClippingRegions([samples], 48_000, samples.length)).toEqual([
    { startSeconds: 0.01, endSeconds: 485 / 48_000 },
  ]);
});

it('measures a trailing partial silent window at its exact duration', () => {
  const samples = new Float32Array(3_000);
  const result = computeSilenceStats([samples], 48_000, samples.length);

  expect(result.silentRegions).toEqual([{ startSeconds: 0, endSeconds: 0.0625 }]);
  expect(result.longestSilentRegionSeconds).toBe(0.0625);
});
