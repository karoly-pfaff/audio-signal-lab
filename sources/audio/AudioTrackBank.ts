interface PlaybackNode {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
}

export class AudioTrackBank {
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly nodes = new Map<string, PlaybackNode>();
  private readonly volumes = new Map<string, number>();

  constructor(
    private readonly context: AudioContext,
    private readonly destination: AudioNode,
  ) {}

  getDuration(fileId: string): number {
    return this.buffers.get(fileId)?.duration ?? 0;
  }

  hasBuffers(): boolean {
    return this.buffers.size > 0;
  }

  setBuffer(fileId: string, buffer: AudioBuffer): void {
    this.buffers.set(fileId, buffer);
  }

  setVolume(fileId: string, volume: number): void {
    this.volumes.set(fileId, volume);
    this.nodes.get(fileId)?.gainNode.gain.setTargetAtTime(volume, this.context.currentTime, 0.01);
  }

  playAll(offset: number): void {
    for (const [fileId, buffer] of this.buffers) {
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      const gainNode = this.context.createGain();
      gainNode.gain.value = this.volumes.get(fileId) ?? 1;
      source.connect(gainNode);
      gainNode.connect(this.destination);
      this.nodes.set(fileId, { source, gainNode });
      source.start(0, offset);
    }
  }

  stopAll(): void {
    for (const node of this.nodes.values()) {
      try {
        node.source.stop();
      } catch {
        // Already stopped.
      }
    }
    this.nodes.clear();
  }

  remove(fileId: string): void {
    this.buffers.delete(fileId);
    this.volumes.delete(fileId);
    const node = this.nodes.get(fileId);
    if (!node) {
      return;
    }
    try {
      node.source.stop();
    } catch {
      // Already stopped.
    }
    this.nodes.delete(fileId);
  }
}
