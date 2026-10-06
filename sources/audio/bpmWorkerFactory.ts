export function createBpmWorker(): Worker | null {
  if (typeof Worker === 'undefined') {
    return null;
  }
  try {
    return new Worker(new URL('../workers/bpm.worker', import.meta.url), { type: 'module' });
  } catch {
    return null;
  }
}
