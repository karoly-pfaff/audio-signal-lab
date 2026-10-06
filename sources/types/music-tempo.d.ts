declare module 'music-tempo' {
  interface MusicTempoOptions {
    tempoStep?: number;
    timeStep?: number;
    minBPM?: number;
    maxBPM?: number;
    bufferSize?: number;
    hopSize?: number;
  }

  class MusicTempo {
    tempo: number;
    beats: number[];
    constructor(audioData: Float32Array, options?: MusicTempoOptions);
  }

  export default MusicTempo;
}
