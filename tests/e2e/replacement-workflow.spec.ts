import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { loadAndActivate, wavPayload } from './support';

async function storedAssetCount(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('audio-signal-lab-media', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction('assets', 'readonly');
    const count = await new Promise<number>((resolve, reject) => {
      const request = transaction.objectStore('assets').count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return count;
  });
}

test('keeps an active replacement synchronized and removes its orphaned asset', async ({
  appPage: page,
}) => {
  await loadAndActivate(page, 'old.wav');
  const row = page.locator('.file-row').filter({ hasText: 'old.wav' });
  await row.getByRole('button', { name: 'File options' }).click();
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Replace file' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(wavPayload('replacement.wav', 880));

  await expect(page.locator('.bottom-bar-title')).toHaveText('replacement.wav');
  await expect(page.getByText('replacement.wav', { exact: true })).toHaveCount(2);
  await expect.poll(() => storedAssetCount(page)).toBe(1);
});
