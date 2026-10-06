import { it, expect } from 'vitest';
import { buildAnalysisReport } from './reportExport';
import type { ReportInputs } from './reportExport';
import type { MainTrackState } from '../audio/types';
import type { AudioAnalysisSummary } from '../audio/analysis';
function makeAnalysis(overrides: Partial<AudioAnalysisSummary> = {}): AudioAnalysisSummary {
  return {
    durationSeconds: 180,
    sampleRate: 44100,
    channelCount: 2,
    peakAmplitude: 0.95,
    peakDb: -0.4,
    rmsAmplitude: 0.1,
    rmsDb: -20.0,
    crestFactorDb: 19.6,
    dynamicRangeProxyDb: 14.0,
    dcOffset: 0,
    clippedSampleCount: 0,
    clippedSampleRatio: 0,
    clippingRisk: 'none',
    silentSampleRatio: 0.043,
    silentRegionCount: 2,
    longestSilentRegionSeconds: 1.2,
    silentRegions: [],
    clippingRegions: [],
    ...overrides,
  };
}
function makeMainTrack(overrides: Partial<MainTrackState> = {}): MainTrackState {
  return {
    id: 'main',
    name: 'test-track.wav',
    buffer: null,
    volume: 1,
    loop: false,
    thumbnailUrl: null,
    loadingState: 'loaded',
    metadata: { title: 'Test Track', artist: 'Test Artist', album: 'Test Album' },
    bpm: 120,
    bpmConfidence: 'high',
    bpmAnalyzing: false,
    analysis: makeAnalysis(),
    selection: null,
    markers: [],
    fileIdentity: {
      name: 'test-track.wav',
      size: 8192000,
      lastModified: 1700000000000,
      durationSeconds: 180,
      sampleRate: 44100,
      channelCount: 2,
      quickHash: 'ab12cd34',
    },
    ...overrides,
  };
}
function makeInputs(overrides: Partial<ReportInputs> = {}): ReportInputs {
  return {
    mainTrack: makeMainTrack(),
    ...overrides,
  };
}
// Suite: buildAnalysisReport
it('includes durationSeconds for range markers', () => {
  const inputs = makeInputs({
    mainTrack: makeMainTrack({
      markers: [
        {
          id: 'r',
          type: 'range',
          startSeconds: 5,
          endSeconds: 10,
          label: 'Region',
          createdAt: 1,
        },
      ],
    }),
  });
  const report = buildAnalysisReport(inputs);
  expect(report.markers[0].durationSeconds).toBe(5);
});
it('includes endSeconds as null for point markers', () => {
  const inputs = makeInputs({
    mainTrack: makeMainTrack({
      markers: [{ id: 'p', type: 'point', startSeconds: 5, label: 'Point', createdAt: 1 }],
    }),
  });
  const report = buildAnalysisReport(inputs);
  expect(report.markers[0].endSeconds).toBeNull();
});
it('includes durationSeconds as null for point markers', () => {
  const inputs = makeInputs({
    mainTrack: makeMainTrack({
      markers: [{ id: 'p', type: 'point', startSeconds: 5, label: 'Point', createdAt: 1 }],
    }),
  });
  const report = buildAnalysisReport(inputs);
  expect(report.markers[0].durationSeconds).toBeNull();
});
it('limitations is a structured object with machine-readable flags', () => {
  const report = buildAnalysisReport(makeInputs());
  expect(report.limitations.rawAudioIncluded).toBe(false);
  expect(report.limitations.masteringGrade).toBe(false);
  expect(report.limitations.fileIdentityIsHeuristic).toBe(true);
  expect(report.limitations.spectrogramPixelsIncluded).toBe(false);
  expect(report.limitations.reportRestoresSession).toBe(false);
});
it('limitations includes human-readable notes', () => {
  const report = buildAnalysisReport(makeInputs());
  expect(report.limitations.notes.length).toBeGreaterThan(0);
  expect(report.limitations.notes.every((n) => typeof n === 'string')).toBe(true);
});
