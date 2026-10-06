export interface PlaybackNode {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
}

export function stopPlaybackNode(node: PlaybackNode | null): void {
  try {
    node?.source.stop();
  } catch {
    // The source already stopped.
  }
}

interface MainNodeSettings {
  buffer: AudioBuffer;
  loop: boolean;
  loopStart: number;
  loopEnd: number;
  volume: number;
  offset: number;
}

export function createMainPlaybackNode(
  context: AudioContext,
  destination: AudioNode,
  settings: MainNodeSettings,
  onEnded: () => void,
): PlaybackNode {
  const source = context.createBufferSource();
  source.buffer = settings.buffer;
  source.loop = settings.loop;
  source.onended = onEnded;
  if (settings.loop) {
    source.loopStart = settings.loopStart;
    source.loopEnd = settings.loopEnd;
  }
  const gainNode = context.createGain();
  gainNode.gain.value = settings.volume;
  source.connect(gainNode);
  gainNode.connect(destination);
  source.start(0, settings.offset);
  return { source, gainNode };
}
