import { expect, it } from 'vitest';
import { rmsToNormalized } from './meters';
import { StereoMeterTap } from './StereoMeterTap';

class FakeAnalyserNode {
  fftSize = 256;
  smoothingTimeConstant = 0;
  samples: Float32Array<ArrayBufferLike> = new Float32Array(0);

  getFloatTimeDomainData(target: Float32Array): void {
    for (let index = 0; index < target.length; index++) {
      target[index] = this.samples[index % this.samples.length] ?? 0;
    }
  }
}

class FakeSplitterNode {
  channels: Float32Array[] = [];

  connect(analyser: FakeAnalyserNode, output: number): void {
    analyser.samples = this.channels[output] ?? new Float32Array(0);
  }
}

class FakeSourceNode {
  constructor(private readonly channels: Float32Array[]) {}

  connect(gain: FakeGainNode): void {
    gain.channels = this.channels;
  }
}

class FakeGainNode {
  channelCount = 2;
  channelCountMode: ChannelCountMode = 'max';
  channelInterpretation: ChannelInterpretation = 'speakers';
  channels: Float32Array[] = [];

  connect(splitter: FakeSplitterNode): void {
    const first = this.channels[0] ?? new Float32Array(0);
    splitter.channels = this.channels.length === 1 ? [first, first] : this.channels;
  }
}

class FakeAudioContext {
  createGain(): FakeGainNode {
    return new FakeGainNode();
  }

  createChannelSplitter(): FakeSplitterNode {
    return new FakeSplitterNode();
  }

  createAnalyser(): FakeAnalyserNode {
    return new FakeAnalyserNode();
  }
}

function createMeter(channels: number[]): StereoMeterTap {
  const context = new FakeAudioContext();
  const source = new FakeSourceNode(channels.map((level) => Float32Array.of(level)));
  return new StereoMeterTap(context as unknown as AudioContext, source as unknown as AudioNode);
}

it('meters a mono source as the same audible signal in both stereo channels', () => {
  const levels = createMeter([0.5]).getLevels();

  expect(levels.left).toBeCloseTo(rmsToNormalized(0.5));
  expect(levels.right).toBeCloseTo(levels.left);
});

it('preserves independent left and right levels for a stereo source', () => {
  const levels = createMeter([0.25, 0.75]).getLevels();

  expect(levels.left).toBeCloseTo(rmsToNormalized(0.25));
  expect(levels.right).toBeCloseTo(rmsToNormalized(0.75));
});
