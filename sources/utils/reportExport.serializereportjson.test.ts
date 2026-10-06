import { it, expect } from 'vitest';
import { buildAnalysisReport, serializeReportJson, REPORT_VERSION } from './reportExport';
import type { ReportInputs, AnalysisReport } from './reportExport';
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
// Suite: serializeReportJson
it('produces valid JSON', () => {
  const report = buildAnalysisReport(makeInputs());
  const json = serializeReportJson(report);
  expect(() => JSON.parse(json)).not.toThrow();
});
it('includes reportVersion and exportedAt', () => {
  const report = buildAnalysisReport(makeInputs());
  const parsed = JSON.parse(serializeReportJson(report)) as AnalysisReport;
  expect(parsed.reportVersion).toBe(REPORT_VERSION);
  expect(parsed.exportedAt).toBeTruthy();
});
it('includes nested app object with name and version', () => {
  const report = buildAnalysisReport(makeInputs());
  const parsed = JSON.parse(serializeReportJson(report)) as AnalysisReport;
  expect(parsed.app.name).toBe('Audio Signal Lab');
  expect(parsed.app.version).toBeTruthy();
});
it('is pretty-printed with 2 spaces', () => {
  const report = buildAnalysisReport(makeInputs());
  const json = serializeReportJson(report);
  expect(json).toContain('  "reportVersion"');
});
it('does not include silentRegions or clippingRegions arrays', () => {
  const report = buildAnalysisReport(makeInputs());
  const json = serializeReportJson(report);
  expect(json).not.toContain('silentRegions');
  expect(json).not.toContain('clippingRegions');
});
it('markers array is sorted by startSeconds in JSON output', () => {
  const inputs = makeInputs({
    mainTrack: makeMainTrack({
      markers: [
        { id: 'b', type: 'point', startSeconds: 20, label: 'B', createdAt: 2 },
        { id: 'a', type: 'point', startSeconds: 5, label: 'A', createdAt: 1 },
      ],
    }),
  });
  const report = buildAnalysisReport(inputs);
  const parsed = JSON.parse(serializeReportJson(report)) as AnalysisReport;
  expect(parsed.markers[0].startSeconds).toBe(5);
  expect(parsed.markers[1].startSeconds).toBe(20);
});
it('limitations is serialized as a structured object', () => {
  const report = buildAnalysisReport(makeInputs());
  const parsed = JSON.parse(serializeReportJson(report)) as AnalysisReport;
  expect(typeof parsed.limitations).toBe('object');
  expect(Array.isArray(parsed.limitations)).toBe(false);
  expect(parsed.limitations.rawAudioIncluded).toBe(false);
  expect(parsed.limitations.fileIdentityIsHeuristic).toBe(true);
});
