import { it, expect } from 'vitest';
import { buildReportFilename } from './reportExport';
// Suite: buildReportFilename
it('returns a .md filename for md ext', () => {
  const name = buildReportFilename(null, 'md');
  expect(name).toMatch(/\.md$/);
});
it('returns a .json filename for json ext', () => {
  const name = buildReportFilename(null, 'json');
  expect(name).toMatch(/\.json$/);
});
it('includes the app prefix', () => {
  const name = buildReportFilename(null, 'md');
  expect(name).toMatch(/^audio-signal-lab-report-/);
});
it('includes a sanitized base name when provided', () => {
  const name = buildReportFilename('My Track.wav', 'md');
  expect(name).toContain('my-track');
  expect(name).not.toContain('.wav');
});
it('strips extension from base name', () => {
  const name = buildReportFilename('song.flac', 'json');
  expect(name).not.toContain('.flac');
});
it('replaces unsafe characters with dashes', () => {
  const name = buildReportFilename('My Track (Final)', 'md');
  expect(name).toMatch(/^[a-z0-9-]+\.md$/);
});
it('falls back to app-only name when base name is empty string', () => {
  const name = buildReportFilename('', 'md');
  expect(name).toMatch(/^audio-signal-lab-report-\d{8}-\d{6}\.md$/);
});
it('falls back when base name sanitizes to empty', () => {
  const name = buildReportFilename('---', 'json');
  expect(name).toMatch(/^audio-signal-lab-report-\d{8}-\d{6}\.json$/);
});
it('includes a timestamp in YYYYMMDD-HHMMSS format', () => {
  const name = buildReportFilename(null, 'md');
  expect(name).toMatch(/\d{8}-\d{6}/);
});
