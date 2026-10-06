import type { SpectroFrames } from '../utils/instrumentUtils';

type Listener = () => void;

class InspectionSharedState {
  hoverRatio: number | null = null;
  playheadRatio = 0;
  spectroFrames: SpectroFrames | null = null;
  spectroBuffer: AudioBuffer | null = null;
  private listeners = new Set<Listener>();

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  setHoverRatio(ratio: number | null): void {
    this.hoverRatio = ratio;
    this.listeners.forEach((fn) => fn());
  }

  setPlayheadRatio(ratio: number): void {
    this.playheadRatio = Math.max(0, Math.min(1, ratio));
    this.listeners.forEach((fn) => fn());
  }

  setSpectroFrames(frames: SpectroFrames | null, buffer: AudioBuffer | null = null): void {
    this.spectroFrames = frames;
    this.spectroBuffer = frames ? buffer : null;
    this.listeners.forEach((fn) => fn());
  }

  hasSpectroFramesFor(buffer?: AudioBuffer | null): boolean {
    return Boolean(this.spectroFrames && (buffer === undefined || this.spectroBuffer === buffer));
  }
}

export const inspectionShared = new InspectionSharedState();
