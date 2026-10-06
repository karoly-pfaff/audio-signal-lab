import { readFile } from 'node:fs/promises';
import { expect, test } from './fixtures';
import { loadAndActivate } from './support';

test('downloads JSON and Markdown reports for the active local file', async ({ appPage: page }) => {
  await loadAndActivate(page, 'report.wav');
  await expect(page.getByText('Duration', { exact: true })).toBeVisible();

  const jsonDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSON report' }).click();
  const jsonDownload = await jsonDownloadPromise;
  expect(jsonDownload.suggestedFilename()).toMatch(/^audio-signal-lab-report-report-.*\.json$/);
  const jsonPath = await jsonDownload.path();
  expect(jsonPath).not.toBeNull();
  const report = JSON.parse(await readFile(jsonPath!, 'utf8')) as {
    reportVersion: string;
    activeFile: { name: string };
  };
  expect(report).toMatchObject({ reportVersion: '1', activeFile: { name: 'report.wav' } });

  const markdownDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Markdown report' }).click();
  const markdownDownload = await markdownDownloadPromise;
  expect(markdownDownload.suggestedFilename()).toMatch(/^audio-signal-lab-report-report-.*\.md$/);
  const markdownPath = await markdownDownload.path();
  expect(markdownPath).not.toBeNull();
  expect(await readFile(markdownPath!, 'utf8')).toContain('report.wav');
});
