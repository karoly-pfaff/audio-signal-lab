import type { Locator, Page } from '@playwright/test';

export interface FilePayload {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

function makeWavFile(durationSeconds = 1, frequency = 440): Buffer {
  const sampleRate = 8_000;
  const sampleCount = Math.floor(sampleRate * durationSeconds);
  const dataLength = sampleCount * 2;
  const wav = Buffer.alloc(44 + dataLength);

  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + dataLength, 4);
  wav.write('WAVE', 8);
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(dataLength, 40);

  for (let index = 0; index < sampleCount; index++) {
    const phase = (index / sampleRate) * frequency * Math.PI * 2;
    wav.writeInt16LE(Math.round(Math.sin(phase) * 8_192), 44 + index * 2);
  }
  return wav;
}

export function wavPayload(name: string, frequency = 440, durationSeconds = 1): FilePayload {
  return { name, mimeType: 'audio/wav', buffer: makeWavFile(durationSeconds, frequency) };
}

export async function loadFiles(page: Page, files: FilePayload[]): Promise<void> {
  await page.locator('input[type="file"][multiple]').setInputFiles(files);
}

export async function loadAndActivate(page: Page, name = 'tone.wav'): Promise<void> {
  await loadFiles(page, [wavPayload(name)]);
  const fileName = page.getByText(name, { exact: true });
  await fileName.waitFor();
  await fileName.click();
  await page.getByText('WAVEFORM', { exact: true }).waitFor();
}

export async function setRangeValue(range: Locator, value: number): Promise<void> {
  await range.evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    valueSetter?.call(input, String(nextValue));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

export async function dragSelection(
  page: Page,
  waveform: Locator,
  startRatio: number,
  endRatio: number,
): Promise<void> {
  const box = await waveform.boundingBox();
  if (!box) {
    throw new Error('Waveform must be visible before selecting a range.');
  }
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * startRatio, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * endRatio, y);
  await page.mouse.up();
}
