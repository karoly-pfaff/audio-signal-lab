export function createSpectrogramWorker(): Worker | null {
  if (typeof Worker === 'undefined') {
    return null;
  }
  try {
    return new Worker(new URL('../workers/spectrogram.worker', import.meta.url), {
      type: 'module',
    });
  } catch {
    return null;
  }
}
