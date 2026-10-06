import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { AnalysisReport } from './reportExport';
import { downloadReportJson, downloadReportMarkdown } from './reportDownload';

const report: AnalysisReport = {
  reportVersion: '1',
  app: { name: 'Audio Signal Lab', version: '1.0.0' },
  exportedAt: '2026-10-05T00:00:00.000Z',
  activeFile: null,
  analysis: null,
  signal: null,
  selection: null,
  markers: [],
  limitations: {
    rawAudioIncluded: false,
    masteringGrade: false,
    fileIdentityIsHeuristic: true,
    spectrogramPixelsIncluded: false,
    reportRestoresSession: false,
    notes: [],
  },
};

const createObjectURL = vi.fn((_blob: Blob) => 'blob:report');
const revokeObjectURL = vi.fn();
const anchor = document.createElement('a');

beforeEach(() => {
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
  vi.spyOn(document, 'createElement').mockReturnValue(anchor);
  vi.spyOn(anchor, 'click').mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

it('downloads a Markdown report with its generated filename', () => {
  downloadReportMarkdown(report, 'My Track.wav');

  expect(anchor.download).toMatch(/^audio-signal-lab-report-my-track-/);
  expect(anchor.download).toMatch(/\.md$/);
  expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:report');
});

it('downloads a JSON report with the application/json media type', () => {
  downloadReportJson(report);
  const blob = createObjectURL.mock.calls[0]![0] as Blob;

  expect(blob.type).toBe('application/json');
  expect(anchor.download).toMatch(/^audio-signal-lab-report-\d{8}-\d{6}\.json$/);
});
