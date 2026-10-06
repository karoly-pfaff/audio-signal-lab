import { expect, test } from './fixtures';
import { loadAndActivate, loadFiles, wavPayload } from './support';

test('loads the local-first application shell without runtime errors', async ({
  appPage: page,
}) => {
  await expect(page).toHaveTitle('Audio Signal Lab');
  await expect(page.getByText('Audio Signal Lab', { exact: true })).toBeVisible();
  await expect(page.getByText('v1.0.0', { exact: true })).toBeVisible();
  await expect(page.getByText('No file loaded', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Save current session as a snapshot' }),
  ).toBeVisible();
});

test('keyboard shortcut dialog manages focus and closes with Escape', async ({ appPage: page }) => {
  const trigger = page.getByRole('button', { name: 'Keyboard shortcuts' });
  await trigger.click();

  const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  const closeButton = page.getByRole('button', { name: 'Close keyboard shortcuts' });
  await expect(dialog).toBeVisible();
  await expect(closeButton).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(closeButton).toBeFocused();
  await page.keyboard.press('Escape');

  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('loads and activates a local WAV file', async ({ appPage: page }) => {
  await loadAndActivate(page);
  await expect(page.getByText('WAVEFORM', { exact: true })).toBeVisible();
  await expect(page.getByText('SPECTROGRAM', { exact: true })).toBeVisible();
  await expect(page.getByText('tone.wav', { exact: true })).toHaveCount(2);
});

test('supports keyboard navigation and a 320px viewport without horizontal overflow', async ({
  appPage: page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.addStyleTag({
    content:
      '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }',
  });
  await expect(page.getByTitle('Add audio files')).toBeVisible();
  await expect(page.getByText('SNAPSHOTS', { exact: true })).toBeVisible();
  await loadAndActivate(page, 'responsive.wav');

  const skipLink = page.getByRole('link', { name: 'Skip to analysis workspace' });
  await skipLink.focus();
  await expect(skipLink).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#analysis-workspace')).toBeFocused();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test('honors reduced motion and remains operable in forced colors', async ({ appPage: page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
  await loadAndActivate(page, 'media-preferences.wav');
  await expect(page.getByTitle('Play (Space)')).toBeEnabled();
  const styles = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const motionTarget = document.querySelector('.transport-btn');
    return {
      media: matchMedia('(prefers-reduced-motion: reduce)').matches,
      canvasBorder: canvas ? getComputedStyle(canvas).borderTopStyle : null,
      transitionSeconds: motionTarget
        ? Number.parseFloat(getComputedStyle(motionTarget).transitionDuration)
        : null,
    };
  });
  expect(styles.media).toBe(true);
  expect(styles.canvasBorder).toBe('solid');
  expect(styles.transitionSeconds).not.toBeNull();
  expect(styles.transitionSeconds!).toBeLessThanOrEqual(0.000_011);
});

test('operates file activation and waveform selection from the keyboard', async ({
  appPage: page,
}) => {
  await loadFiles(page, [
    wavPayload('keyboard-a.wav', 440, 20),
    wavPayload('keyboard-b.wav', 880, 10),
  ]);
  const activation = page.getByRole('button', { name: 'Activate keyboard-a.wav' });
  await activation.focus();
  await activation.press('Enter');
  await expect(page.locator('.bottom-bar-title')).toHaveText('keyboard-a.wav');

  const waveform = page.getByRole('slider', { name: /Seek position/ }).first();
  await waveform.focus();
  await waveform.press('ArrowRight');
  await expect(waveform).toHaveAttribute('aria-valuenow', '1');
  await waveform.press('Shift+ArrowRight');
  await expect(page.locator('.waveform-selection')).toBeVisible();
  await page.getByRole('button', { name: 'Activate keyboard-b.wav' }).click();
  await expect(page.locator('.bottom-bar-title')).toHaveText('keyboard-b.wav');

  const nextWaveform = page.getByRole('slider', { name: /Seek position/ }).first();
  await nextWaveform.focus();
  await nextWaveform.press('Shift+ArrowRight');
  for (const selector of [
    '.waveform-selection',
    '.event-rail-selection',
    '.spectrogram-selection',
  ]) {
    await expect(page.locator(selector)).toHaveAttribute('style', /left: 0%; width: 1%/);
  }
  await page.getByRole('button', { name: 'Clear selection' }).click();
  await page.getByTitle('Jump forward 5s (→)').click();
  await expect(nextWaveform).toHaveAttribute('aria-valuenow', '50');
  await nextWaveform.focus();
  await nextWaveform.press('Shift+ArrowRight');
  await expect(page.locator('.selection-readout')).toHaveText(/0:05\.0.*0:05\.1.*0:00\.1/);
  await expect(page.locator('.waveform-selection')).toHaveAttribute(
    'style',
    /left: 50%; width: 1%/,
  );
  await page.getByRole('button', { name: 'Clear selection' }).click();
  await nextWaveform.focus();
  await nextWaveform.press('Shift+ArrowRight');
  await expect(page.locator('.selection-readout')).toHaveText(/0:05\.0.*0:05\.1.*0:00\.1/);
  await page.getByTitle('Jump back 5s (←)').click();
  await expect(nextWaveform).toHaveAttribute('aria-valuenow', '0');
});
