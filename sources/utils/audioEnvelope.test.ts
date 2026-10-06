import { expect, it } from 'vitest';
import { sampleSignalRanges } from './audioEnvelope';

function audioBuffer(channels: number[][]): AudioBuffer {
  const data = channels.map((channel) => Float32Array.from(channel));
  return {
    length: data[0]?.length ?? 0,
    numberOfChannels: data.length,
    getChannelData: (channel: number) => data[channel]!,
  } as unknown as AudioBuffer;
}

it('preserves mono extrema and the final sample', () => {
  const ranges = sampleSignalRanges(audioBuffer([[0.2, -0.5, 0.4, 0.9, -1]]), 2);

  expect(ranges[0]!.minimum).toBeCloseTo(-0.5);
  expect(ranges[0]!.maximum).toBeCloseTo(0.4);
  expect(ranges[1]!.minimum).toBeCloseTo(-1);
  expect(ranges[1]!.maximum).toBeCloseTo(0.9);
});

it('keeps right-only and anti-phase stereo events visible', () => {
  const rightOnly = sampleSignalRanges(
    audioBuffer([
      [0, 0, 0, 0],
      [0, 0, 0.8, 0],
    ]),
    4,
  );
  const leftOnly = sampleSignalRanges(
    audioBuffer([
      [0, 0, -0.6, 0],
      [0, 0, 0, 0],
    ]),
    4,
  );
  const antiPhase = sampleSignalRanges(
    audioBuffer([
      [0, 0, 0.8, 0],
      [0, 0, -0.8, 0],
    ]),
    4,
  );

  expect(rightOnly[2]!.maximum).toBeCloseTo(0.8);
  expect(leftOnly[2]!.minimum).toBeCloseTo(-0.6);
  expect(antiPhase[2]!.minimum).toBeCloseTo(-0.8);
  expect(antiPhase[2]!.maximum).toBeCloseTo(0.8);
});

it('includes events from channels beyond stereo', () => {
  const ranges = sampleSignalRanges(
    audioBuffer([
      [0, 0],
      [0, 0],
      [0, -0.7],
    ]),
    2,
  );

  expect(ranges[1]!.minimum).toBeCloseTo(-0.7);
  expect(ranges[1]!.maximum).toBe(0);
});
