import { it, expect } from 'vitest';
import { buildAnalysisReport, REPORT_VERSION } from './reportExport';
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
it('includes app metadata in nested app object', () => {
  const report = buildAnalysisReport(makeInputs());
  expect(report.app.name).toBe('Audio Signal Lab');
  expect(report.app.version).toBeTruthy();
  expect(report.reportVersion).toBe(REPORT_VERSION);
});
it('includes exportedAt as a valid ISO string', () => {
  const report = buildAnalysisReport(makeInputs());
  expect(new Date(report.exportedAt).toISOString()).toBe(report.exportedAt);
});
it('uses activeFile key (not file)', () => {
  const report = buildAnalysisReport(makeInputs());
  expect(report.activeFile).not.toBeNull();
  expect((report as unknown as Record<string, unknown>).file).toBeUndefined();
});
it('includes file identity from fileIdentity', () => {
  const report = buildAnalysisReport(makeInputs());
  expect(report.activeFile?.name).toBe('test-track.wav');
  expect(report.activeFile?.size).toBe(8192000);
  expect(report.activeFile?.quickHash).toBe('ab12cd34');
  expect(report.activeFile?.sampleRate).toBe(44100);
  expect(report.activeFile?.channelCount).toBe(2);
});
it('includes metadata fields', () => {
  const report = buildAnalysisReport(makeInputs());
  expect(report.activeFile?.title).toBe('Test Track');
  expect(report.activeFile?.artist).toBe('Test Artist');
  expect(report.activeFile?.album).toBe('Test Album');
  expect(report.activeFile?.bpm).toBe(120);
});
it('returns null activeFile when mainTrack has no name and no identity', () => {
  const inputs = makeInputs({
    mainTrack: makeMainTrack({ name: '', fileIdentity: null }),
  });
  const report = buildAnalysisReport(inputs);
  expect(report.activeFile).toBeNull();
});
it('includes analysis metrics in analysis section', () => {
  const report = buildAnalysisReport(makeInputs());
  expect(report.analysis?.peakDb).toBe(-0.4);
  expect(report.analysis?.rmsDb).toBe(-20.0);
  expect(report.analysis?.crestFactorDb).toBeTruthy();
  expect(report.analysis?.dcOffset).toBeDefined();
});
it('analysis section does not contain signal fields', () => {
  const report = buildAnalysisReport(makeInputs());
  const analysisKeys = Object.keys(report.analysis ?? {});
  expect(analysisKeys).not.toContain('clippingRisk');
  expect(analysisKeys).not.toContain('clippedSampleCount');
  expect(analysisKeys).not.toContain('silentSampleRatio');
});
it('includes signal metrics in separate signal section', () => {
  const report = buildAnalysisReport(makeInputs());
  expect(report.signal?.clippingRisk).toBe('none');
  expect(report.signal?.silentSampleRatio).toBe(0.043);
  expect(report.signal?.clippedSampleCount).toBe(0);
  expect(report.signal?.silentRegionCount).toBe(2);
  expect(report.signal?.longestSilentRegionSeconds).toBe(1.2);
});
it('returns null analysis when analysis is absent', () => {
  const inputs = makeInputs({
    mainTrack: makeMainTrack({ analysis: null }),
  });
  const report = buildAnalysisReport(inputs);
  expect(report.analysis).toBeNull();
});
it('returns null signal when analysis is absent', () => {
  const inputs = makeInputs({
    mainTrack: makeMainTrack({ analysis: null }),
  });
  const report = buildAnalysisReport(inputs);
  expect(report.signal).toBeNull();
});
it('does not include raw audio buffers or large arrays', () => {
  const report = buildAnalysisReport(makeInputs());
  const json = JSON.stringify(report);
  expect(json).not.toContain('silentRegions');
  expect(json).not.toContain('clippingRegions');
  expect(json).not.toContain('buffer');
  expect(json).not.toContain('AudioBuffer');
});
it('includes selection when present', () => {
  const inputs = makeInputs({
    mainTrack: makeMainTrack({ selection: { startSeconds: 10, endSeconds: 25 } }),
  });
  const report = buildAnalysisReport(inputs);
  expect(report.selection?.startSeconds).toBe(10);
  expect(report.selection?.endSeconds).toBe(25);
  expect(report.selection?.durationSeconds).toBe(15);
});
it('returns null selection when absent', () => {
  const report = buildAnalysisReport(makeInputs());
  expect(report.selection).toBeNull();
});
it('sorts markers by startSeconds', () => {
  const inputs = makeInputs({
    mainTrack: makeMainTrack({
      markers: [
        { id: 'c', type: 'point', startSeconds: 30, label: 'C', createdAt: 3 },
        { id: 'a', type: 'point', startSeconds: 5, label: 'A', createdAt: 1 },
        { id: 'b', type: 'point', startSeconds: 15, label: 'B', createdAt: 2 },
      ],
    }),
  });
  const report = buildAnalysisReport(inputs);
  expect(report.markers.map((m) => m.startSeconds)).toEqual([5, 15, 30]);
});
it('includes endSeconds for range markers', () => {
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
  expect(report.markers[0].endSeconds).toBe(10);
});
