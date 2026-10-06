import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { loadAndActivate, loadFiles, setRangeValue, wavPayload } from './support';

async function storedAssetCount(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('audio-signal-lab-media', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (!database.objectStoreNames.contains('assets')) {
      database.close();
      return 0;
    }
    const count = await new Promise<number>((resolve, reject) => {
      const request = database.transaction('assets', 'readonly').objectStore('assets').count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return count;
  });
}

async function persistedMainAssetId(page: Page): Promise<unknown> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('audio-signal-lab-session');
    return raw ? (JSON.parse(raw) as { main?: { assetId?: unknown } }).main?.assetId : null;
  });
}

function importedSnapshot() {
  return {
    id: 'imported-snapshot',
    name: 'Imported reference',
    createdAt: '2026-10-05T00:00:00.000Z',
    main: {
      volume: 0.5,
      loop: true,
      filename: null,
      thumbnailUrl: null,
      bpm: null,
      bpmConfidence: null,
    },
    masterVolume: 0.3,
    masterMuted: false,
    files: [],
  };
}

function importedPreset() {
  const snapshot = importedSnapshot();
  return {
    schema: 'audio-signal-lab-session',
    version: 3,
    exportedAt: '2026-10-05T00:00:00.000Z',
    main: {
      loop: true,
      volume: 0.5,
      filename: null,
      thumbnailUrl: null,
      bpm: null,
      bpmConfidence: null,
      selection: null,
      markers: [],
      fileIdentity: null,
    },
    files: [
      {
        id: 'empty-file',
        order: 0,
        volume: 0.4,
        filename: null,
        thumbnailUrl: null,
        bpm: null,
        bpmConfidence: null,
      },
    ],
    transport: { masterVolume: 0.3, masterMuted: false },
    snapshots: [snapshot],
    ab: { a: snapshot, b: null },
  };
}

test('persists snapshot rename, duplication, and comparison slots across reloads', async ({
  appPage: page,
}) => {
  await page.locator('.monitor-control').hover();
  const volume = page.getByRole('slider', { name: 'Volume' });
  await setRangeValue(volume, 0.35);
  await page.getByRole('button', { name: 'Save current session as a snapshot' }).click();
  await expect(page.getByText('Snapshot 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Rename snapshot Snapshot 1' }).click();
  const rename = page.locator('.snapshot-rename-input');
  await rename.fill('Reference');
  await rename.press('Enter');
  await page.getByRole('button', { name: 'Duplicate snapshot Reference' }).click();
  await expect(page.getByText('Reference (copy)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Assign current session to comparison slot A' }).click();
  const applyA = page.getByRole('button', { name: 'Apply comparison snapshot A' });
  await expect(applyA).toBeEnabled();
  await page.locator('.monitor-control').hover();
  await setRangeValue(volume, 0.8);
  await applyA.click();
  await expect(page.getByRole('status')).toHaveText('A applied');
  await page.locator('.monitor-control').hover();
  await expect(volume).toHaveValue('0.35');

  await page.reload();
  await expect(page.getByText('Reference', { exact: true })).toBeVisible();
  await expect(page.getByText('Reference (copy)', { exact: true })).toBeVisible();
  await expect(applyA).toBeEnabled();
  await page.getByRole('button', { name: 'Reset session' }).click();
  await expect(page.getByRole('status')).toHaveText('Session reset');
  await expect(page.getByText('Reference', { exact: true })).toBeHidden();
});

test('restores the last local audio after reload and removes it on reset', async ({
  appPage: page,
}) => {
  await loadAndActivate(page, 'remember-me.wav');
  await expect.poll(() => persistedMainAssetId(page)).toMatch(/^sha256-[a-f0-9]{64}$/);
  await expect.poll(() => storedAssetCount(page)).toBe(1);

  await page.reload();
  await expect(page.locator('.bottom-bar-title')).toHaveText('remember-me.wav');
  await expect(page.getByText('WAVEFORM', { exact: true })).toBeVisible();
  await expect(page.getByTitle('Play (Space)')).toBeEnabled();

  await page.getByRole('button', { name: 'Reset session' }).click();
  await expect(page.getByRole('status')).toHaveText('Session reset');
  await expect.poll(() => storedAssetCount(page)).toBe(0);
  await expect(page.locator('.bottom-bar-empty')).toHaveText('No file loaded');
});

test('retains every concurrently loaded audio file across reload', async ({ appPage: page }) => {
  await loadFiles(page, [
    wavPayload('one.wav', 220),
    wavPayload('two.wav', 440),
    wavPayload('three.wav', 880),
  ]);
  await page.getByRole('button', { name: 'Activate two.wav' }).click();
  await expect.poll(() => storedAssetCount(page)).toBe(3);

  await page.reload();
  await expect(page.locator('.bottom-bar-title')).toHaveText('two.wav');
  await expect(page.getByRole('button', { name: 'Activate one.wav' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Activate two.wav' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Activate three.wav' })).toBeVisible();
  await expect.poll(() => storedAssetCount(page)).toBe(3);
});

test('exports valid session JSON and imports validated lightweight state', async ({
  appPage: page,
}) => {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export session' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^audio-signal-lab-session-\d{4}-\d{2}-\d{2}\.json$/,
  );
  const path = await download.path();
  expect(path).not.toBeNull();
  const exported = JSON.parse(await readFile(path!, 'utf8')) as Record<string, unknown>;
  expect(exported['schema']).toBe('audio-signal-lab-session');
  expect(exported['version']).toBe(4);

  await page.locator('input.preset-file-input').setInputFiles({
    name: 'imported.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(importedPreset())),
  });
  await expect(page.getByRole('status')).toHaveText(
    'Session imported with snapshots — reload audio files to play',
  );
  await expect(page.getByText('Imported reference', { exact: true })).toBeVisible();
  await expect(page.locator('.file-row')).toHaveCount(1);
  await page.locator('.monitor-control').hover();
  await expect(page.getByRole('slider', { name: 'Volume' })).toHaveValue('0.3');
});

test('rejects malformed session imports', async ({ appPage: page }) => {
  await page.locator('input.preset-file-input').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"schema":"wrong"}'),
  });
  await expect(page.getByRole('status')).toHaveText('Invalid session file');

  const nested = importedPreset();
  const nestedSnapshot = nested.snapshots[0] as { files: Array<Record<string, unknown>> };
  nestedSnapshot.files = Array.from({ length: 20 }, () => ({
    id: 'duplicate',
    order: 0,
    volume: 1,
    filename: null,
    thumbnailUrl: null,
    bpm: null,
    bpmConfidence: null,
  }));
  await page.locator('input.preset-file-input').setInputFiles({
    name: 'invalid-nested.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(nested)),
  });
  await expect(page.getByRole('status')).toHaveText('Invalid session file');
});

test('strips imported network artwork without issuing a request', async ({ appPage: page }) => {
  const preset = importedPreset();
  (preset.main as { thumbnailUrl: string | null }).thumbnailUrl =
    'https://tracker.invalid/main.png';
  (preset.files[0] as { thumbnailUrl: string | null }).thumbnailUrl =
    'https://tracker.invalid/file.png';
  await page.locator('input.preset-file-input').setInputFiles({
    name: 'network-artwork.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(preset)),
  });
  await expect(page.getByRole('status')).toContainText('Session imported');
  const thumbnails = await page.evaluate(() => {
    const raw = localStorage.getItem('audio-signal-lab-session');
    const session = raw ? JSON.parse(raw) : null;
    return [session?.main?.thumbnailUrl, session?.files?.[0]?.thumbnailUrl];
  });
  expect(thumbnails).toEqual([null, null]);
});
