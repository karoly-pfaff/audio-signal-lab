import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { loadFiles, wavPayload } from './support';

async function createBoundaryAnnotations(page: Page): Promise<void> {
  await loadFiles(page, [wavPayload('boundary.wav', 440, 10)]);
  await page.getByRole('button', { name: 'Activate boundary.wav' }).click();
  const waveform = page.getByRole('slider', { name: /Seek position/ }).first();
  await page.getByTitle('Jump forward 5s (→)').click();
  await waveform.focus();
  await waveform.press('Shift+ArrowRight');
  await page.getByTitle('Toggle loop').click({ timeout: 20_000 });
  await expect(page.getByTitle('Toggle loop')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '+ From Selection' }).click();
}

async function removeBoundaryAnnotations(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Clear selection' }).click();
  await page.getByRole('button', { name: 'Remove Marker 1' }).click();
}

async function expectBoundaryAnnotations(page: Page): Promise<void> {
  await expect(page.locator('.selection-readout')).toHaveText(/0:05\.0.*0:05\.1.*0:00\.1/, {
    timeout: 20_000,
  });
  await expect(page.locator('.marker-time')).toHaveText('0:05.0 — 0:05.1');
  for (const selector of [
    '.waveform-selection',
    '.event-rail-selection',
    '.spectrogram-selection',
  ]) {
    await expect(page.locator(selector)).toHaveAttribute('style', /left: 50%; width: 1%/);
  }
}

test('preserves a minimum decimal range through loop, snapshots, A/B, and reload', async ({
  appPage: page,
}) => {
  test.setTimeout(60_000);
  await createBoundaryAnnotations(page);
  await expect(page.getByRole('slider', { name: /Seek position/ }).first()).toHaveAttribute(
    'aria-valuenow',
    '50',
  );
  await expectBoundaryAnnotations(page);
  await page.getByRole('button', { name: 'Save current session as a snapshot' }).click();
  await page.getByRole('button', { name: 'Assign current session to comparison slot A' }).click();

  await removeBoundaryAnnotations(page);
  await page.getByRole('button', { name: 'Apply snapshot Snapshot 1' }).click();
  await expect(page.getByRole('status')).toHaveText('Snapshot applied');
  await expectBoundaryAnnotations(page);

  await removeBoundaryAnnotations(page);
  await page.getByRole('button', { name: 'Apply comparison snapshot A' }).click();
  await expect(page.getByRole('status')).toHaveText('A applied');
  await expectBoundaryAnnotations(page);

  await page.reload();
  await expect(page.locator('.bottom-bar-title')).toHaveText('boundary.wav');
  await expectBoundaryAnnotations(page);
});
