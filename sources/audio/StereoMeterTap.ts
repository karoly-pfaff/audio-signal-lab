import { computeRMS, rmsToNormalized } from './meters';

export class StereoMeterTap {
  private readonly analyserLeft: AnalyserNode;
  private readonly analyserRight: AnalyserNode;
  private readonly bufferLeft: Float32Array<ArrayBuffer>;
  private readonly bufferRight: Float32Array<ArrayBuffer>;

  constructor(context: AudioContext, source: AudioNode) {
    const stereoInput = context.createGain();
    stereoInput.channelCount = 2;
    stereoInput.channelCountMode = 'explicit';
    stereoInput.channelInterpretation = 'speakers';
    const splitter = context.createChannelSplitter(2);
    this.analyserLeft = context.createAnalyser();
    this.analyserRight = context.createAnalyser();
    for (const analyser of [this.analyserLeft, this.analyserRight]) {
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0;
    }
    source.connect(stereoInput);
    stereoInput.connect(splitter);
    splitter.connect(this.analyserLeft, 0);
    splitter.connect(this.analyserRight, 1);
    this.bufferLeft = new Float32Array(this.analyserLeft.fftSize);
    this.bufferRight = new Float32Array(this.analyserRight.fftSize);
  }

  getLevels(): { left: number; right: number } {
    this.analyserLeft.getFloatTimeDomainData(this.bufferLeft);
    this.analyserRight.getFloatTimeDomainData(this.bufferRight);
    return {
      left: rmsToNormalized(computeRMS(this.bufferLeft)),
      right: rmsToNormalized(computeRMS(this.bufferRight)),
    };
  }
}
