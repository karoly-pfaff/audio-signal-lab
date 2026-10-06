import { expect, test } from './fixtures';
import { dragSelection, loadAndActivate, loadFiles, wavPayload } from './support';

test('loads, reorders, activates, and controls local audio', async ({ appPage: page }) => {
  await loadFiles(page, [wavPayload('first.wav', 220), wavPayload('second.wav', 330)]);
  const rows = page.locator('.file-row');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('first.wav');
  await expect(rows.nth(1)).toContainText('second.wav');

  const second = rows.filter({ hasText: 'second.wav' });
  await second.getByRole('button', { name: 'Drag to reorder' }).press('Alt+ArrowUp');
  await expect(rows.nth(0)).toContainText('second.wav');

  await page.getByText('first.wav', { exact: true }).click();
  await expect(page.getByText('WAVEFORM', { exact: true })).toBeVisible();
  await page.getByTitle('Toggle loop').click();
  await expect(page.getByTitle('Toggle loop')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTitle('Play (Space)').click();
  await expect(page.getByTitle('Pause (Space)')).toBeVisible();
  await page.getByTitle('Pause (Space)').click();
  await expect(page.getByTitle('Play (Space)')).toBeVisible();
});

test('meters a mono file on both audible output channels', async ({
  appPage: page,
  browserName,
}) => {
  test.skip(
    browserName === 'webkit',
    'The Windows WebKit runtime uses the minimal Web Audio shim.',
  );
  await loadFiles(page, [wavPayload('mono-meter.wav', 440, 3)]);
  await page.getByText('mono-meter.wav', { exact: true }).click();
  await expect(page.getByText('WAVEFORM', { exact: true })).toBeVisible();
  await page.getByTitle('Play (Space)').click();
  const bars = page.locator('.stereo-meter-bar');
  const readWidths = () =>
    bars.evaluateAll((elements) =>
      elements.map((element) => Number.parseFloat((element as HTMLElement).style.width || '0')),
    );
  await expect.poll(async () => Math.min(...(await readWidths()))).toBeGreaterThan(1);
  await expect
    .poll(async () => {
      const [left = 0, right = 0] = await readWidths();
      return Math.abs(left - right);
    })
    .toBeLessThan(1);
});

test('creates, renames, jumps to, and removes point and range markers', async ({
  appPage: page,
}) => {
  await loadAndActivate(page, 'markers.wav');
  await page.getByRole('button', { name: '+ Marker' }).click();
  await expect(page.getByRole('button', { name: 'Marker 1', exact: true })).toBeVisible();

  const waveform = page.getByRole('slider', { name: 'Seek position — drag to select range' });
  await dragSelection(page, waveform, 0.2, 0.8);
  await expect(page.getByRole('button', { name: 'Clear selection' })).toBeVisible();
  await page.getByRole('button', { name: '+ From Selection' }).click();
  await page.getByRole('button', { name: 'Marker 2', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Rename marker' });
  await editor.fill('Chorus');
  await editor.press('Enter');
  await expect(page.getByRole('button', { name: 'Chorus', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Clear selection' }).click();
  await page.getByRole('button', { name: 'Jump to Chorus' }).click();
  await expect(page.getByRole('button', { name: 'Clear selection' })).toBeVisible();
  await page.getByRole('button', { name: 'Remove Marker 1' }).click();
  await page.getByRole('button', { name: 'Remove Chorus' }).click();
  await expect(page.getByText('No markers yet')).toBeVisible();
});

test('reports decode and unsupported-file failures without losing the active track', async ({
  appPage: page,
}) => {
  await loadAndActivate(page, 'working.wav');
  const row = page.locator('.file-row').filter({ hasText: 'working.wav' });
  await row.getByRole('button', { name: 'File options' }).click();
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Replace file' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: 'broken.wav',
    mimeType: 'audio/wav',
    buffer: Buffer.from('not audio'),
  });

  await expect(page.getByRole('status')).toHaveText('Failed to decode audio');
  await expect(page.locator('.file-row')).toContainText('working.wav');
  await expect(page.locator('.file-row')).toHaveClass(/file-row--loaded/);
  await expect(page.locator('.bottom-bar-title')).toHaveText('working.wav');
  await page.getByRole('status').click();
  await expect(page.getByRole('status')).toBeHidden();

  await loadFiles(page, [{ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('x') }]);
  await expect(page.getByRole('status')).toHaveText(
    '1 file skipped — not audio or file limit reached',
  );
});

test('keeps controls operable while a two-minute file is analyzed', async ({ appPage: page }) => {
  await loadFiles(page, [wavPayload('long-duration.wav', 330, 120)]);
  await page.getByRole('button', { name: 'Activate long-duration.wav' }).click();
  await expect(page.getByText('WAVEFORM', { exact: true })).toBeVisible();
  const shortcuts = page.getByRole('button', { name: 'Keyboard shortcuts' });
  await shortcuts.click();
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
});
