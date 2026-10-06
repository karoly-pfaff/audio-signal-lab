import { render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { AudioAnalysisSummary, ClippingRisk } from '../../audio/analysis';

const store = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock('../../store/useAudioLabStore', () => ({ useAudioLabStore: () => store.state }));

import { AnalysisPanel } from './AnalysisPanel';

function analysis(overrides: Partial<AudioAnalysisSummary> = {}): AudioAnalysisSummary {
  return {
    durationSeconds: 61,
    sampleRate: 44_100,
    channelCount: 2,
    peakAmplitude: 1,
    peakDb: 0,
    rmsAmplitude: 0.5,
    rmsDb: -6,
    crestFactorDb: 6,
    dynamicRangeProxyDb: 12,
    dcOffset: 0,
    clippedSampleCount: 0,
    clippedSampleRatio: 0,
    clippingRisk: 'none',
    silentSampleRatio: 0.1,
    silentRegionCount: 1,
    longestSilentRegionSeconds: 0,
    silentRegions: [],
    clippingRegions: [],
    ...overrides,
  };
}

beforeEach(() => {
  store.state = { mainTrack: { analysis: null, loadingState: 'empty', bpm: null } };
});

it('hides without data and shows the analyzing state for loaded audio', () => {
  const { container, rerender } = render(<AnalysisPanel />);
  expect(container).toBeEmptyDOMElement();
  store.state.mainTrack = { analysis: null, loadingState: 'loaded', bpm: null };
  rerender(<AnalysisPanel />);
  expect(screen.getByText('Analyzing signal…')).toBeInTheDocument();
});

it('formats technical values, long durations, compact counts, and BPM', () => {
  store.state.mainTrack = {
    loadingState: 'loaded',
    bpm: 123.45,
    analysis: analysis({
      durationSeconds: 3_661,
      channelCount: 1,
      peakDb: 1.25,
      rmsDb: null,
      crestFactorDb: null,
      dynamicRangeProxyDb: 12.34,
      dcOffset: 0.00001,
      clippedSampleCount: 1_234,
      clippedSampleRatio: 0.000001,
      clippingRisk: 'high',
      longestSilentRegionSeconds: 70,
    }),
  };
  render(<AnalysisPanel />);
  for (const value of [
    '1:01:01',
    '44.1 kHz',
    'Mono',
    '+1.3 dB',
    '+12.3 dB',
    '≈ 0',
    '123.5',
    'High',
    '1.2k (<.001%)',
    '10.0%',
    '1:10',
  ]) {
    expect(screen.getByText(value)).toBeInTheDocument();
  }
  expect(screen.getAllByText('—')).toHaveLength(2);
  expect(screen.getByText('High')).toHaveClass('analysis-risk-high');
});

it('formats short values, multichannel audio, negative DC, and million counts', () => {
  store.state.mainTrack = {
    loadingState: 'loaded',
    bpm: null,
    analysis: analysis({
      sampleRate: 500,
      channelCount: 6,
      dcOffset: -0.25,
      clippedSampleCount: 1_500_000,
      clippedSampleRatio: 0.1,
      clippingRisk: 'medium',
      longestSilentRegionSeconds: 0.5,
    }),
  };
  render(<AnalysisPanel />);
  for (const value of ['1:01', '500 Hz', '6ch', '-0.2500', '1.50M (10.000%)', 'Medium', '< 1 s']) {
    expect(screen.getByText(value)).toBeInTheDocument();
  }
  expect(screen.queryByText('BPM')).toBeNull();
});

it('formats every clipping risk, stereo channel, zero clipping, and finite silence', () => {
  const { rerender } = render(<AnalysisPanel />);
  for (const risk of ['none', 'low', 'medium', 'high'] as ClippingRisk[]) {
    store.state.mainTrack = {
      loadingState: 'loaded',
      bpm: null,
      analysis: analysis({
        channelCount: 2,
        clippingRisk: risk,
        clippedSampleCount: 0,
        longestSilentRegionSeconds: 12.5,
      }),
    };
    rerender(<AnalysisPanel />);
    expect(screen.getByText(risk[0]!.toUpperCase() + risk.slice(1))).toBeInTheDocument();
    expect(screen.getByText('Stereo')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('12.5 s')).toBeInTheDocument();
  }
});
