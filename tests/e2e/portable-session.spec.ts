import { readFile, stat } from 'node:fs/promises';
import { expect, test } from './fixtures';

const MAX_PORTABLE_SESSION_BYTES = 8_000_000;
const MAX_FILES = 12;
const MAX_MARKERS = 256;
const MAX_SNAPSHOTS = 12;
const unicodeFilename = `${'\u0800'.repeat(251)}.wav`;

function maximumUnicodeId(index: number): string {
  const suffix = index.toString().padStart(3, '0');
  return `${'\u0800'.repeat(128 - suffix.length)}${suffix}`;
}

function maximumMarkers() {
  return Array.from({ length: MAX_MARKERS }, (_, index) => ({
    id: `marker-${index}`,
    type: 'range',
    startSeconds: index,
    endSeconds: index + 0.5,
    label: '\u0800'.repeat(80),
    createdAt: 1_700_000_000_000 + index,
  }));
}

function fileIdentity() {
  return {
    name: unicodeFilename,
    size: 1_000,
    lastModified: 1_700_000_000_000,
    durationSeconds: 300,
    sampleRate: 48_000,
    channelCount: 2,
    quickHash: '1234abcd',
  };
}

function maximumFiles() {
  return Array.from({ length: MAX_FILES }, (_, index) => ({
    id: maximumUnicodeId(index),
    order: index,
    volume: 1,
    filename: unicodeFilename,
    thumbnailUrl: null,
    bpm: 120,
    bpmConfidence: 'high',
    fileIdentity: fileIdentity(),
  }));
}

function maximumMain() {
  return {
    loop: true,
    volume: 1,
    filename: unicodeFilename,
    thumbnailUrl: null,
    bpm: 120,
    bpmConfidence: 'high',
    selection: { startSeconds: 0, endSeconds: 300 },
    markers: maximumMarkers(),
    fileIdentity: fileIdentity(),
  };
}

function snapshot(index: number) {
  return {
    id: `snapshot-${index}`,
    name: `Maximum snapshot ${index}`,
    createdAt: '2026-10-06T00:00:00.000Z',
    main: maximumMain(),
    masterVolume: 1,
    masterMuted: false,
    files: maximumFiles(),
  };
}

function maximumPreset() {
  return {
    schema: 'audio-signal-lab-session',
    version: 4,
    exportedAt: '2026-10-06T00:00:00.000Z',
    main: maximumMain(),
    files: maximumFiles(),
    transport: { masterVolume: 1, masterMuted: false },
    snapshots: Array.from({ length: MAX_SNAPSHOTS }, (_, index) => snapshot(index)),
    ab: { a: snapshot(MAX_SNAPSHOTS), b: snapshot(MAX_SNAPSHOTS + 1) },
  };
}

test('round-trips a downloaded maximum portable workspace', async ({ appPage: page }) => {
  const source = Buffer.from(JSON.stringify(maximumPreset()));
  expect(source.byteLength).toBeLessThanOrEqual(MAX_PORTABLE_SESSION_BYTES);
  expect(source.byteLength).toBeLessThanOrEqual(2_000_000);
  await page.locator('input.preset-file-input').setInputFiles({
    name: 'maximum-session.json',
    mimeType: 'application/json',
    buffer: source,
  });
  await expect(page.getByRole('status')).toContainText('Session imported');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export session' }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  const downloaded = await readFile(path!);
  expect(downloaded.byteLength).toBeGreaterThan(2_000_000);
  expect((await stat(path!)).size).toBeLessThanOrEqual(MAX_PORTABLE_SESSION_BYTES);

  await page.locator('input.preset-file-input').setInputFiles(path!);
  await expect(page.getByRole('status')).toContainText('Session imported');
  await expect(page.locator('.file-row')).toHaveCount(MAX_FILES);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem('audio-signal-lab-session');
        const stored = raw
          ? (JSON.parse(raw) as { main?: { markers?: unknown[] }; snapshots?: unknown[] })
          : null;
        return [stored?.main?.markers?.length, stored?.snapshots?.length];
      }),
    )
    .toEqual([MAX_MARKERS, MAX_SNAPSHOTS]);
});
