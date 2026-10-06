import { applyFadeIn } from './fades';
import { createAudioContext } from './audioContextFactory';
import { AudioTrackBank } from './AudioTrackBank';
import { createMainPlaybackNode, stopPlaybackNode, type PlaybackNode } from './mainPlaybackNode';
import { publishPlaybackPosition } from './playbackPositionEvents';
import { StereoMeterTap } from './StereoMeterTap';
import { normalizePlaybackPosition } from './playbackPosition';

class AudioEngine {
  private context: AudioContext;
  private masterGainNode: GainNode;
  private playbackFadeGain: GainNode;
  private startedAt = 0;
  private pausedAt = 0;
  private isPlaying = false;
  private mainNode: PlaybackNode | null = null;
  private mainBuffer: AudioBuffer | null = null;
  private mainLoop = false;
  private mainLoopStart = 0;
  private mainLoopEnd = 0;
  private mainVolume = 1;
  private masterVolume = 0.8;
  private masterMuted = false;
  private trackBank: AudioTrackBank;
  private meterTap: StereoMeterTap;
  private playGeneration = 0;
  private resumeGeneration = 0;
  private mainEndedCallback: (() => void) | null = null;
  constructor() {
    this.context = createAudioContext();
    this.masterGainNode = this.context.createGain();
    this.masterGainNode.gain.value = this.masterVolume;
    this.masterGainNode.connect(this.context.destination);
    this.playbackFadeGain = this.context.createGain();
    this.playbackFadeGain.gain.value = 1;
    this.playbackFadeGain.connect(this.masterGainNode);
    this.trackBank = new AudioTrackBank(this.context, this.playbackFadeGain);
    this.meterTap = new StereoMeterTap(this.context, this.masterGainNode);
  }
  get audioContext(): AudioContext {
    return this.context;
  }
  async resumeContext(): Promise<boolean> {
    const generation = ++this.resumeGeneration;
    // 'interrupted' is an iOS Safari extension to the spec — treat it like suspended.
    const state = this.context.state as string;
    if (state === 'suspended' || state === 'interrupted') {
      await this.context.resume();
    }
    return generation === this.resumeGeneration;
  }
  async decodeFile(file: File): Promise<AudioBuffer> {
    const arrayBuffer = await file.arrayBuffer();
    return this.context.decodeAudioData(arrayBuffer);
  }
  setMainEndedHandler(cb: () => void): void {
    this.mainEndedCallback = cb;
  }
  setMasterVolume(vol: number): void {
    this.masterVolume = vol;
    if (!this.masterMuted) {
      this.masterGainNode.gain.setTargetAtTime(vol, this.context.currentTime, 0.01);
    }
  }
  setMasterMute(muted: boolean): void {
    this.masterMuted = muted;
    const targetGain = muted ? 0 : this.masterVolume;
    this.masterGainNode.gain.setTargetAtTime(targetGain, this.context.currentTime, 0.01);
  }
  setMainBuffer(buffer: AudioBuffer): void {
    if (this.mainBuffer !== buffer) {
      this.stop();
    }
    this.mainBuffer = buffer;
  }
  clearMainBuffer(): void {
    this.mainBuffer = null;
    stopPlaybackNode(this.mainNode);
    this.mainNode = null;
  }
  setMainVolume(vol: number): void {
    this.mainVolume = vol;
    if (this.mainNode) {
      this.mainNode.gainNode.gain.setTargetAtTime(vol, this.context.currentTime, 0.01);
    }
  }
  setMainLoop(loop: boolean): void {
    const audiblePosition = this.currentTime;
    this.mainLoop = loop;
    this.reconcilePlaybackConfiguration(audiblePosition);
    publishPlaybackPosition(this.currentTime);
  }
  setMainLoopPoints(start: number, end: number): void {
    const audiblePosition = this.currentTime;
    this.mainLoopStart = start;
    this.mainLoopEnd = end;
    if (this.mainNode && !this.mainLoop) {
      this.mainNode.source.loopStart = start;
      this.mainNode.source.loopEnd = end;
    }
    this.reconcilePlaybackConfiguration(audiblePosition, this.mainLoop);
    publishPlaybackPosition(this.currentTime);
  }
  getMainDuration(): number {
    return this.mainBuffer?.duration ?? 0;
  }
  getStereoLevels(): { left: number; right: number } {
    return this.meterTap.getLevels();
  }
  getFileDuration(fileId: string): number {
    return this.trackBank.getDuration(fileId);
  }
  setFileBuffer(fileId: string, buffer: AudioBuffer): void {
    this.trackBank.setBuffer(fileId, buffer);
  }
  setFileVolume(fileId: string, vol: number): void {
    this.trackBank.setVolume(fileId, vol);
  }
  private handleMainEnded(): void {
    this.mainNode = null;
    this.trackBank.stopAll();
    this.pausedAt = 0;
    this.startedAt = 0;
    this.isPlaying = false;
    this.mainEndedCallback?.();
    publishPlaybackPosition(0);
  }
  private createMainNode(offset: number, gen: number): void {
    if (!this.mainBuffer) {
      return;
    }
    this.mainNode = createMainPlaybackNode(
      this.context,
      this.playbackFadeGain,
      {
        buffer: this.mainBuffer,
        loop: this.mainLoop,
        loopStart: this.mainLoopStart,
        loopEnd: this.mainLoopEnd,
        volume: this.mainVolume,
        offset,
      },
      () => {
        if (this.playGeneration === gen && this.isPlaying) {
          this.handleMainEnded();
        }
      },
    );
  }
  play(): void {
    if (this.isPlaying || (!this.mainBuffer && !this.trackBank.hasBuffers())) {
      return;
    }

    const offset = this.normalizeMainPosition(this.pausedAt);
    this.playGeneration++;
    const gen = this.playGeneration;
    applyFadeIn(this.playbackFadeGain, this.context, 1);
    this.createMainNode(offset, gen);
    this.trackBank.playAll(offset);
    this.startedAt = this.context.currentTime - offset;
    this.pausedAt = 0;
    this.isPlaying = true;
  }
  pause(): void {
    this.resumeGeneration++;
    if (!this.isPlaying) {
      return;
    }
    this.pausedAt = this.currentTime;
    this.stopAllNodes();
    this.isPlaying = false;
    publishPlaybackPosition(this.pausedAt);
  }
  stop(): void {
    this.resumeGeneration++;
    this.stopAllNodes();
    this.pausedAt = 0;
    this.startedAt = 0;
    this.isPlaying = false;
    publishPlaybackPosition(0);
  }

  seek(seconds: number): void {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      this.stopAllNodes();
      this.isPlaying = false;
    }
    this.pausedAt = this.normalizeMainPosition(seconds);
    if (wasPlaying) {
      this.play();
    }
    publishPlaybackPosition(this.currentTime);
  }

  private stopAllNodes(): void {
    stopPlaybackNode(this.mainNode);
    this.mainNode = null;
    this.trackBank.stopAll();
  }
  get currentTime(): number {
    if (!this.isPlaying) {
      return this.pausedAt;
    }
    return this.normalizeMainPosition(this.context.currentTime - this.startedAt);
  }
  private normalizeMainPosition(position: number): number {
    return normalizePlaybackPosition(position, {
      duration: this.getMainDuration(),
      loop: this.mainLoop,
      loopStart: this.mainLoopStart,
      loopEnd: this.mainLoopEnd,
    });
  }

  private anchorPlaybackClock(position: number): void {
    const normalized = this.normalizeMainPosition(position);
    if (this.isPlaying) {
      this.startedAt = this.context.currentTime - normalized;
    } else {
      this.pausedAt = normalized;
    }
  }

  private reconcilePlaybackConfiguration(position: number, restart = true): void {
    const normalized = this.normalizeMainPosition(position);
    if (!this.isPlaying || !restart) {
      this.anchorPlaybackClock(normalized);
      return;
    }
    const generation = ++this.playGeneration;
    this.stopAllNodes();
    this.createMainNode(normalized, generation);
    this.trackBank.playAll(normalized);
    this.startedAt = this.context.currentTime - normalized;
    this.pausedAt = 0;
  }

  get playing(): boolean {
    return this.isPlaying;
  }

  removeFileBuffer(fileId: string): void {
    this.trackBank.remove(fileId);
  }
}

export const audioEngine = new AudioEngine();
