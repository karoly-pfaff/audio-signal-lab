import { expect, test as base, type Page } from '@playwright/test';
import { installWebAudioShimWhenMissing } from './web-audio-shim';

interface AppFixtures {
  appPage: Page;
}

export const test = base.extend<AppFixtures>({
  appPage: async ({ page }, use) => {
    const runtimeErrors: string[] = [];
    const externalRequests: string[] = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') {
        runtimeErrors.push(message.text());
      }
    });
    page.on('request', (request) => {
      const requestUrl = new URL(request.url());
      if (requestUrl.protocol.startsWith('http') && requestUrl.origin !== 'http://127.0.0.1:4173') {
        externalRequests.push(request.url());
      }
    });
    await installWebAudioShimWhenMissing(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByText('Audio Signal Lab', { exact: true }).waitFor();

    await use(page);

    expect(runtimeErrors, 'The application must not emit browser errors').toEqual([]);
    expect(externalRequests, 'The application must remain local-only').toEqual([]);
  },
});

export { expect } from '@playwright/test';
