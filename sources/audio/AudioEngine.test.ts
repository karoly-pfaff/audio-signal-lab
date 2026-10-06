import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { audioEngine as AudioEngineInstance } from './AudioEngine';
const AUDIO_BUFFER = { duration: 12 } as AudioBuffer;
class FakeAudioParam {
  value = 0;
  cancelScheduledValues = vi.fn();
  setValueAtTime = vi.fn();
  linearRampToValueAtTime = vi.fn();
  setTargetAtTime = vi.fn();
}
class FakeAudioNode {
  connect = vi.fn();
}
class FakeGainNode extends FakeAudioNode {
  gain = new FakeAudioParam();
  channelCount = 2;
  channelCountMode: ChannelCountMode = 'max';
  channelInterpretation: ChannelInterpretation = 'speakers';
}
class FakeBufferSourceNode extends FakeAudioNode {
  buffer: AudioBuffer | null = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  onended: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
}
class FakeAnalyserNode extends FakeAudioNode {
  fftSize = 256;
  smoothingTimeConstant = 0;
  level = 0;
  getFloatTimeDomainData = vi.fn((target: Float32Array) => target.fill(this.level));
}
class FakeAudioContext {
  state = 'running';
  currentTime = 0;
  destination = new FakeAudioNode();
  gains: FakeGainNode[] = [];
  sources: FakeBufferSourceNode[] = [];
  analysers: FakeAnalyserNode[] = [];
  splitter = new FakeAudioNode();
  resume = vi.fn<() => Promise<void>>(async () => undefined);
  decodeAudioData = vi.fn(async (_data: ArrayBuffer) => AUDIO_BUFFER);
  createGain(): FakeGainNode {
    const gain = new FakeGainNode();
    this.gains.push(gain);
    return gain;
  }
  createBufferSource(): FakeBufferSourceNode {
    const source = new FakeBufferSourceNode();
    this.sources.push(source);
    return source;
  }
  createAnalyser(): FakeAnalyserNode {
    const analyser = new FakeAnalyserNode();
    this.analysers.push(analyser);
    return analyser;
  }
  createChannelSplitter(): FakeAudioNode {
    return this.splitter;
  }
}
type Engine = typeof AudioEngineInstance;
let engine: Engine;
let context: FakeAudioContext;
beforeEach(async () => {
  vi.resetModules();
  vi.stubGlobal('AudioContext', FakeAudioContext);
  ({ audioEngine: engine } = await import('./AudioEngine'));
  context = engine.audioContext as unknown as FakeAudioContext;
});
afterEach(() => vi.unstubAllGlobals());
it('constructs the graph and resumes only suspended contexts', async () => {
  expect(context.gains).toHaveLength(3);
  expect(context.gains[0]!.gain.value).toBe(0.8);
  expect(context.gains[0]!.connect).toHaveBeenCalledWith(context.destination);
  const meterInput = context.gains[2]!;
  expect(meterInput.channelCount).toBe(2);
  expect(meterInput.channelCountMode).toBe('explicit');
  expect(meterInput.channelInterpretation).toBe('speakers');
  expect(context.gains[2]!.connect).toHaveBeenCalledWith(context.splitter);
  expect(context.splitter.connect).toHaveBeenCalledTimes(2);
  for (const state of ['suspended', 'interrupted', 'running']) {
    context.state = state;
    await engine.resumeContext();
  }
  expect(context.resume).toHaveBeenCalledTimes(2);
  let releaseResume: () => void = () => {};
  context.state = 'suspended';
  context.resume.mockImplementationOnce(
    () => new Promise<void>((resolve) => (releaseResume = resolve)),
  );
  const pending = engine.resumeContext();
  engine.stop();
  releaseResume();
  await expect(pending).resolves.toBe(false);
});
it('decodes files and controls the master gain', async () => {
  const bytes = new ArrayBuffer(8);
  const file = { arrayBuffer: vi.fn(async () => bytes) } as unknown as File;
  await expect(engine.decodeFile(file)).resolves.toBe(AUDIO_BUFFER);
  expect(context.decodeAudioData).toHaveBeenCalledWith(bytes);
  const masterParam = context.gains[0]!.gain;
  engine.setMasterVolume(0.4);
  engine.setMasterMute(true);
  engine.setMasterVolume(0.6);
  engine.setMasterMute(false);
  expect(masterParam.setTargetAtTime.mock.calls.map(([value]) => value)).toEqual([0.4, 0, 0.6]);
});
it('configures and plays the main buffer once', () => {
  engine.setMainBuffer(AUDIO_BUFFER);
  engine.setMainVolume(0.5);
  engine.setMainLoop(true);
  engine.setMainLoopPoints(2, 9);
  engine.play();
  engine.play();
  const source = context.sources[0]!;
  expect(engine.getMainDuration()).toBe(12);
  expect(source.buffer).toBe(AUDIO_BUFFER);
  expect([source.loop, source.loopStart, source.loopEnd]).toEqual([true, 2, 9]);
  expect(source.start).toHaveBeenCalledWith(0, 0);
  expect(source.onended).toBeTypeOf('function');
  expect(context.sources).toHaveLength(1);
  expect(engine.playing).toBe(true);
});
it('finishes when looping is disabled after playback starts', () => {
  const ended = vi.fn();
  engine.setMainEndedHandler(ended);
  engine.setMainBuffer(AUDIO_BUFFER);
  engine.setMainLoop(true);
  engine.play();
  engine.setMainLoop(false);
  context.sources[0]!.onended!();
  expect(ended).not.toHaveBeenCalled();
  context.sources[1]!.onended!();
  expect(ended).toHaveBeenCalledOnce();
  expect(engine.playing).toBe(false);
});
it('updates an active main node and preserves the pause offset', () => {
  engine.setMainBuffer(AUDIO_BUFFER);
  engine.play();
  context.currentTime = 4;
  engine.setMainVolume(0.3);
  engine.setMainLoop(true);
  engine.setMainLoopPoints(1, 7);
  expect(engine.currentTime).toBe(4);
  expect(context.gains[3]!.gain.setTargetAtTime).toHaveBeenCalledWith(0.3, 4, 0.01);
  engine.pause();
  engine.pause();
  expect(engine.currentTime).toBe(4);
  expect(engine.playing).toBe(false);
  engine.play();
  expect(context.sources[context.sources.length - 1]!.start).toHaveBeenCalledWith(0, 4);
});
it('seeks during playback and resets on stop', () => {
  engine.setMainBuffer(AUDIO_BUFFER);
  engine.seek(-2);
  expect(engine.currentTime).toBe(0);
  engine.play();
  context.currentTime = 3;
  engine.seek(7);
  expect(context.sources).toHaveLength(2);
  expect(context.sources[1]!.start).toHaveBeenCalledWith(0, 7);
  engine.stop();
  expect(engine.currentTime).toBe(0);
  expect(engine.playing).toBe(false);
});
it('plays, updates, and removes file buffers', () => {
  engine.play();
  expect(engine.playing).toBe(false);
  expect(context.sources).toHaveLength(0);
  engine.setFileBuffer('file-1', AUDIO_BUFFER);
  engine.setFileVolume('file-1', 0.25);
  expect(engine.getFileDuration('file-1')).toBe(12);
  engine.play();
  const source = context.sources[0]!;
  expect(source.start).toHaveBeenCalledWith(0, 0);
  expect(context.gains[3]!.gain.value).toBe(0.25);
  engine.setFileVolume('file-1', 0.75);
  expect(context.gains[3]!.gain.setTargetAtTime).toHaveBeenCalledWith(0.75, 0, 0.01);
  engine.removeFileBuffer('file-1');
  engine.removeFileBuffer('missing');
  expect(source.stop).toHaveBeenCalledOnce();
  expect(engine.getFileDuration('file-1')).toBe(0);
});
it('finishes only the current playback generation', () => {
  const ended = vi.fn();
  engine.setMainEndedHandler(ended);
  engine.setMainBuffer(AUDIO_BUFFER);
  engine.play();
  const staleCallback = context.sources[0]!.onended!;
  engine.pause();
  engine.play();
  staleCallback();
  expect(engine.playing).toBe(true);
  context.sources[1]!.onended!();
  expect(ended).toHaveBeenCalledOnce();
  expect(engine.playing).toBe(false);
  expect(engine.currentTime).toBe(0);
});
it('clears a playing main buffer even when stop already failed', () => {
  engine.setMainBuffer(AUDIO_BUFFER);
  engine.play();
  context.sources[0]!.stop.mockImplementation(() => {
    throw new Error('already stopped');
  });
  expect(() => engine.clearMainBuffer()).not.toThrow();
  expect(engine.getMainDuration()).toBe(0);
});
it('stops current playback before replacing the main buffer', () => {
  engine.setMainBuffer(AUDIO_BUFFER);
  engine.play();
  context.currentTime = 2;
  const replacement = { ...AUDIO_BUFFER, duration: 6 } as AudioBuffer;
  engine.setMainBuffer(replacement);
  expect(context.sources[0]!.stop).toHaveBeenCalledOnce();
  expect(engine.playing).toBe(false);
  expect(engine.currentTime).toBe(0);
  expect(engine.getMainDuration()).toBe(6);
});
it('keeps loop time and pause-resume inside the audible range', () => {
  engine.setMainBuffer(AUDIO_BUFFER);
  engine.setMainLoopPoints(2, 4);
  engine.setMainLoop(true);
  engine.seek(2);
  engine.play();
  context.currentTime = 5;
  expect(engine.currentTime).toBe(3);
  engine.setMainLoopPoints(0, 0);
  engine.setMainLoop(false);
  expect(engine.currentTime).toBe(3);
  engine.pause();
  engine.play();
  expect(context.sources[context.sources.length - 1]!.start).toHaveBeenCalledWith(0, 3);
  context.currentTime = 0;
  engine.seek(9);
  context.currentTime = 0.024;
  engine.setMainLoopPoints(2, 4);
  engine.setMainLoop(true);
  const loopSource = context.sources[context.sources.length - 1]!;
  expect(loopSource.start.mock.calls[0]![1]).toBeCloseTo(3.024);
  expect(loopSource.loop).toBe(true);
  expect(engine.currentTime).toBeCloseTo(3.024);
  context.currentTime = 0.274;
  engine.setMainLoopPoints(0, 2);
  const changedLoopSource = context.sources[context.sources.length - 1]!;
  expect(changedLoopSource.start.mock.calls[0]![1]).toBeCloseTo(1.274);
  expect(engine.currentTime).toBeCloseTo(1.274);
});
