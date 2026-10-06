import MusicTempo from 'music-tempo';

export function detectTempo(data: Float32Array, sampleRate: number): number | null {
  try {
    const hopSize = Math.max(1, Math.round(sampleRate / 100));
    const tempo = new MusicTempo(data, { hopSize, timeStep: hopSize / sampleRate }).tempo;
    const bpm = Number(tempo);
    return Number.isFinite(bpm) && bpm > 0 ? bpm : null;
  } catch {
    return null;
  }
}
