import type { AudioLabSet } from './audioLabStoreTypes';

export interface StatusController {
  show: (message: string, durationMs: number) => void;
  dismiss: () => void;
}

export function createStatusController(set: AudioLabSet): StatusController {
  let timer: ReturnType<typeof setTimeout> | null = null;

  function dismiss(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    set({ statusMessage: null });
  }

  function show(message: string, durationMs: number): void {
    if (timer !== null) {
      clearTimeout(timer);
    }
    set({ statusMessage: message });
    timer = setTimeout(() => {
      timer = null;
      set({ statusMessage: null });
    }, durationMs);
  }

  return { show, dismiss };
}
