import { it, expect } from 'vitest';
import { buildAnalysisReport, serializeReportMarkdown } from './reportExport';
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
// Suite: serializeReportMarkdown
it('starts with the report heading', () => {
  const report = buildAnalysisReport(makeInputs());
  const md = serializeReportMarkdown(report);
  expect(md).toMatch(/^# Audio Signal Lab/);
});
it('includes all expected sections', () => {
  const report = buildAnalysisReport(makeInputs());
  const md = serializeReportMarkdown(report);
  expect(md).toContain('## Active File');
  expect(md).toContain('## Technical Summary');
  expect(md).toContain('## Signal Summary');
  expect(md).toContain('## Selected Range');
  expect(md).toContain('## Markers / Checkpoints');
  expect(md).toContain('## Notes / Limitations');
});
it('does not include a Comparison section', () => {
  const report = buildAnalysisReport(makeInputs());
  const md = serializeReportMarkdown(report);
  expect(md).not.toContain('## Comparison');
  expect(md).not.toContain('reference comparison');
});
it('shows "No active file." when activeFile is null', () => {
  const report = buildAnalysisReport(
    makeInputs({ mainTrack: makeMainTrack({ name: '', fileIdentity: null }) }),
  );
  const md = serializeReportMarkdown(report);
  expect(md).toContain('No active file.');
});
it('shows "No analysis available." when analysis is null', () => {
  const report = buildAnalysisReport(makeInputs({ mainTrack: makeMainTrack({ analysis: null }) }));
  const md = serializeReportMarkdown(report);
  expect(md).toContain('No analysis available.');
});
it('shows "No selection." when selection is null', () => {
  const report = buildAnalysisReport(makeInputs());
  const md = serializeReportMarkdown(report);
  expect(md).toContain('No selection.');
});
it('shows "No markers." when markers list is empty', () => {
  const report = buildAnalysisReport(makeInputs());
  const md = serializeReportMarkdown(report);
  expect(md).toContain('No markers.');
});
it('includes marker labels and times', () => {
  const inputs = makeInputs({
    mainTrack: makeMainTrack({
      markers: [
        { id: 'm1', type: 'point', startSeconds: 42.5, label: 'Intro transient', createdAt: 1 },
      ],
    }),
  });
  const report = buildAnalysisReport(inputs);
  const md = serializeReportMarkdown(report);
  expect(md).toContain('Intro transient');
  expect(md).toContain('0:42.5');
});
it('includes range markers with em-dash', () => {
  const inputs = makeInputs({
    mainTrack: makeMainTrack({
      markers: [
        {
          id: 'm1',
          type: 'range',
          startSeconds: 10,
          endSeconds: 20,
          label: 'Chorus',
          createdAt: 1,
        },
      ],
    }),
  });
  const report = buildAnalysisReport(inputs);
  const md = serializeReportMarkdown(report);
  expect(md).toContain('Chorus: 0:10.0 — 0:20.0');
});
it('includes selection times and duration', () => {
  const inputs = makeInputs({
    mainTrack: makeMainTrack({ selection: { startSeconds: 10, endSeconds: 25 } }),
  });
  const report = buildAnalysisReport(inputs);
  const md = serializeReportMarkdown(report);
  expect(md).toContain('Start: 0:10.0');
  expect(md).toContain('End: 0:25.0');
  expect(md).toContain('Duration: 15.000 s');
});
it('includes limitations from notes', () => {
  const report = buildAnalysisReport(makeInputs());
  const md = serializeReportMarkdown(report);
  expect(md).toContain('Raw audio is not included');
});
it('formats small mono files, long durations, and uncommon technical values', () => {
  const report = buildAnalysisReport(makeInputs());
  Object.assign(report.activeFile!, {
    size: 512,
    durationSeconds: 3661,
    sampleRate: 800,
    channelCount: 1,
    bpm: null,
    quickHash: null,
  });
  Object.assign(report.analysis!, { peakDb: null, rmsDb: 1, dcOffset: 0.01 });
  Object.assign(report.signal!, {
    clippedSampleCount: 2,
    clippedSampleRatio: 0.000001,
    longestSilentRegionSeconds: 0,
  });
  const md = serializeReportMarkdown(report);
  expect(md).toContain('Size: 512 B');
  expect(md).toContain('Duration: 1:01:01');
  expect(md).toContain('Sample Rate: 800 Hz');
  expect(md).toContain('Channels: Mono');
  expect(md).toContain('Peak: —');
  expect(md).toContain('RMS: +1.0 dB');
  expect(md).toContain('Clipped Samples: 2 (<0.001%)');
  expect(md).not.toContain('Longest Silence:');
});
it('formats kilobytes, multichannel audio, and measurable clipping ratios', () => {
  const report = buildAnalysisReport(makeInputs());
  Object.assign(report.activeFile!, { size: 2048, channelCount: 6 });
  Object.assign(report.signal!, { clippedSampleCount: 8, clippedSampleRatio: 0.001 });
  const md = serializeReportMarkdown(report);
  expect(md).toContain('Size: 2.0 KB');
  expect(md).toContain('Channels: 6ch');
  expect(md).toContain('Clipped Samples: 8 (0.100%)');
});
it('omits optional active-file details when only a name is available', () => {
  const report = buildAnalysisReport(makeInputs());
  report.activeFile = {
    name: 'unknown.wav',
    size: null,
    durationSeconds: null,
    sampleRate: null,
    channelCount: null,
    quickHash: null,
    title: null,
    artist: null,
    album: null,
    bpm: null,
  };
  const md = serializeReportMarkdown(report);
  expect(md).toContain('File: unknown.wav');
  expect(md).not.toContain('- Title:');
  expect(md).not.toContain('- Size:');
  expect(md).not.toContain('- Sample Rate:');
});
it('escapes file-derived Markdown, HTML, and line breaks', () => {
  const mainTrack = makeMainTrack({
    name: '![file](https://example.invalid/file)',
    metadata: {
      title: '![art](https://example.invalid/track)\n# injected',
      artist: '<img src="https://example.invalid/artist">',
      album: '[album](https://example.invalid/album)',
    },
    markers: [
      {
        id: 'unsafe',
        type: 'point',
        startSeconds: 1,
        label: '<script>alert(1)</script> ![pixel](https://example.invalid/pixel)',
        createdAt: 1,
      },
    ],
  });

  const md = serializeReportMarkdown(buildAnalysisReport({ mainTrack }));

  expect(md).not.toContain('![art](');
  expect(md).not.toContain('<img');
  expect(md).not.toContain('<script>');
  expect(md).not.toContain('\n# injected');
  expect(md).toContain('\\!\\[art\\]\\(');
  expect(md).toContain('&lt;script&gt;');
});
