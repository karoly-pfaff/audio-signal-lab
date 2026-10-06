export type ClippingRisk = 'none' | 'low' | 'medium' | 'high';

export interface SignalRegion {
  startSeconds: number;
  endSeconds: number;
}

export interface AudioAnalysisSummary {
  durationSeconds: number;
  sampleRate: number;
  channelCount: number;
  peakAmplitude: number;
  peakDb: number | null;
  rmsAmplitude: number;
  rmsDb: number | null;
  crestFactorDb: number | null;
  dynamicRangeProxyDb: number | null;
  dcOffset: number;
  clippedSampleCount: number;
  clippedSampleRatio: number;
  clippingRisk: ClippingRisk;
  silentSampleRatio: number;
  silentRegionCount: number;
  longestSilentRegionSeconds: number;
  silentRegions: SignalRegion[];
  clippingRegions: SignalRegion[];
}

import {
  CLIP_THRESHOLD,
  SILENCE_THRESHOLD,
  computeClippingRegions,
  computeDynamicRangeProxy,
  computeSilenceStats,
} from './analysisRegions';

export function amplitudeToDb(amplitude: number): number | null {
  if (amplitude <= 0) {
    return null;
  }
  return 20 * Math.log10(amplitude);
}

export function classifyClippingRisk(
  clippedSampleCount: number,
  clippedSampleRatio: number,
): ClippingRisk {
  if (clippedSampleCount === 0) {
    return 'none';
  }
  if (clippedSampleRatio < 0.00001) {
    return 'low';
  }
  if (clippedSampleRatio < 0.0001) {
    return 'medium';
  }
  return 'high';
}

interface SampleMetrics {
  peak: number;
  sumSquares: number;
  dcSum: number;
  clippedCount: number;
  silentCount: number;
}

function collectSampleMetrics(channels: readonly Float32Array[]): SampleMetrics {
  const metrics: SampleMetrics = {
    peak: 0,
    sumSquares: 0,
    dcSum: 0,
    clippedCount: 0,
    silentCount: 0,
  };
  for (const channel of channels) {
    for (const sample of channel) {
      const absolute = Math.abs(sample);
      metrics.peak = Math.max(metrics.peak, absolute);
      metrics.sumSquares += sample * sample;
      metrics.dcSum += sample;
      if (absolute >= CLIP_THRESHOLD) {
        metrics.clippedCount++;
      }
      if (absolute < SILENCE_THRESHOLD) {
        metrics.silentCount++;
      }
    }
  }
  return metrics;
}

// Core analysis logic operating on raw channel arrays. Used directly by the
// analysis Web Worker and wrapped by analyzeAudioBuffer for synchronous callers.
export function analyzeChannelData(
  channels: readonly Float32Array[],
  sampleRate: number,
  durationSeconds: number,
): AudioAnalysisSummary {
  const channelCount = channels.length;
  const frameCount = channels[0]?.length ?? 0;
  const totalSamples = frameCount * channelCount;
  const metrics = collectSampleMetrics(channels);
  const rms = totalSamples > 0 ? Math.sqrt(metrics.sumSquares / totalSamples) : 0;
  const dcOffset = totalSamples > 0 ? metrics.dcSum / totalSamples : 0;
  const clippedSampleRatio = totalSamples > 0 ? metrics.clippedCount / totalSamples : 0;
  const silentSampleRatio = totalSamples > 0 ? metrics.silentCount / totalSamples : 0;
  const peakDb = amplitudeToDb(metrics.peak);
  const rmsDb = amplitudeToDb(rms);
  const crestFactorDb = peakDb !== null && rmsDb !== null ? peakDb - rmsDb : null;
  const { silentRegionCount, longestSilentRegionSeconds, silentRegions } = computeSilenceStats(
    channels,
    sampleRate,
    frameCount,
  );
  const clippingRegions = computeClippingRegions(channels, sampleRate, frameCount);

  return {
    durationSeconds,
    sampleRate,
    channelCount,
    peakAmplitude: metrics.peak,
    peakDb,
    rmsAmplitude: rms,
    rmsDb,
    crestFactorDb,
    dynamicRangeProxyDb: computeDynamicRangeProxy(channels, sampleRate, frameCount),
    dcOffset,
    clippedSampleCount: metrics.clippedCount,
    clippedSampleRatio,
    clippingRisk: classifyClippingRisk(metrics.clippedCount, clippedSampleRatio),
    silentSampleRatio,
    silentRegionCount,
    longestSilentRegionSeconds,
    silentRegions,
    clippingRegions,
  };
}

export function analyzeAudioBuffer(buffer: AudioBuffer): AudioAnalysisSummary {
  const channels: Float32Array[] = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }
  return analyzeChannelData(channels, buffer.sampleRate, buffer.duration);
}
