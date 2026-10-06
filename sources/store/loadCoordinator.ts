import { analyzeAudioBuffer } from '../audio/analysis';
import { createAnalysisWorker } from './analysisWorkerFactory';
import type { AudioLabSet } from './audioLabStoreTypes';

export interface MainIntentSnapshot {
  generation: number;
  revision: number;
  fileId: string | null;
}

export class LoadCoordinator {
  private mainGeneration = 0;
  private mainIntentRevision = 0;
  private mainIntentFileId: string | null = null;
  private fileGenerationSequence = 0;
  private readonly fileGenerations = new Map<string, number>();
  private readonly fileAbortControllers = new Map<string, AbortController>();
  private mainAbortController = new AbortController();
  private analysisWorker: Worker | null;
  private pendingAnalysis: { buffer: AudioBuffer; generation: number } | null = null;

  constructor(private readonly set: AudioLabSet) {
    this.analysisWorker = createAnalysisWorker(
      ({ id, summary }) => {
        if (this.pendingAnalysis?.generation === id) {
          this.pendingAnalysis = null;
        }
        if (this.isMainCurrent(id)) {
          this.set((state) => ({ mainTrack: { ...state.mainTrack, analysis: summary } }));
        }
      },
      () => this.recoverAnalysisWorker(),
    );
  }

  nextMainGeneration(fileId: string | null = null): number {
    this.mainAbortController.abort();
    this.mainAbortController = new AbortController();
    this.mainIntentFileId = fileId;
    this.mainIntentRevision++;
    return ++this.mainGeneration;
  }

  mainIntentSnapshot(fileId: string | null): MainIntentSnapshot {
    return { generation: this.mainGeneration, revision: this.mainIntentRevision, fileId };
  }

  mainIntentBelongsTo(fileId: string, snapshot: MainIntentSnapshot): boolean {
    const owner =
      snapshot.generation === this.mainGeneration && snapshot.revision === this.mainIntentRevision
        ? snapshot.fileId
        : this.mainIntentFileId;
    return owner === fileId;
  }

  restoreMainIntent(generation: number, fileId: string | null): void {
    if (this.isMainCurrent(generation)) {
      this.mainIntentFileId = fileId;
      this.mainIntentRevision++;
    }
  }

  mainSignal(): AbortSignal {
    return this.mainAbortController.signal;
  }

  isMainCurrent(generation: number): boolean {
    return this.mainGeneration === generation;
  }

  nextFileGeneration(fileId: string): number {
    this.fileAbortControllers.get(fileId)?.abort();
    this.fileAbortControllers.set(fileId, new AbortController());
    const generation = ++this.fileGenerationSequence;
    this.fileGenerations.set(fileId, generation);
    return generation;
  }

  fileSignal(fileId: string): AbortSignal | undefined {
    return this.fileAbortControllers.get(fileId)?.signal;
  }

  isFileCurrent(fileId: string, generation: number): boolean {
    return this.fileGenerations.get(fileId) === generation;
  }

  removeFile(fileId: string): void {
    this.fileAbortControllers.get(fileId)?.abort();
    this.fileAbortControllers.delete(fileId);
    this.fileGenerations.delete(fileId);
  }

  reset(): void {
    this.nextMainGeneration();
    this.fileAbortControllers.forEach((controller) => controller.abort());
    this.fileAbortControllers.clear();
    this.fileGenerations.clear();
  }

  analyzeMainBuffer(buffer: AudioBuffer, generation: number): void {
    this.pendingAnalysis = { buffer, generation };
    if (this.analysisWorker) {
      const channels: Float32Array[] = [];
      for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex++) {
        channels.push(buffer.getChannelData(channelIndex).slice());
      }
      try {
        this.analysisWorker.postMessage(
          {
            id: generation,
            channels,
            sampleRate: buffer.sampleRate,
            durationSeconds: buffer.duration,
          },
          channels.map((channel) => channel.buffer),
        );
        return;
      } catch {
        this.analysisWorker.terminate();
        this.analysisWorker = null;
      }
    }
    this.applySynchronousAnalysis(buffer, generation);
  }

  private recoverAnalysisWorker(): void {
    this.analysisWorker?.terminate();
    this.analysisWorker = null;
    const pending = this.pendingAnalysis;
    if (pending) {
      this.applySynchronousAnalysis(pending.buffer, pending.generation);
    }
  }

  private applySynchronousAnalysis(buffer: AudioBuffer, generation: number): void {
    const analysis = analyzeAudioBuffer(buffer);
    if (this.pendingAnalysis?.generation === generation) {
      this.pendingAnalysis = null;
    }
    if (this.isMainCurrent(generation)) {
      this.set((state) => ({ mainTrack: { ...state.mainTrack, analysis } }));
    }
  }
}
