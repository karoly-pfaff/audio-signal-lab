import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import type { BpmResult } from '../audio/bpm';
const mocks = vi.hoisted(() => {
  const channel = new Float32Array(8000);
  const buffer = {
    duration: 1,
    length: channel.length,
    numberOfChannels: 1,
    sampleRate: 8000,
    getChannelData: () => channel,
  } as unknown as AudioBuffer;
  return {
    buffer,
    audioEngine: {
      currentTime: 0.25,
      setMainEndedHandler: vi.fn(),
      setMainVolume: vi.fn(),
      setMainLoop: vi.fn(),
      setMasterVolume: vi.fn(),
      setMasterMute: vi.fn(),
      setMainBuffer: vi.fn(),
      setMainLoopPoints: vi.fn(),
      clearMainBuffer: vi.fn(),
      setFileVolume: vi.fn(),
      removeFileBuffer: vi.fn(),
      stop: vi.fn(),
      pause: vi.fn(),
      play: vi.fn(),
      seek: vi.fn(),
      getMainDuration: vi.fn(() => 1),
      resumeContext: vi.fn(async () => true),
      decodeFile: vi.fn(async () => buffer),
    },
    detectBpm: vi.fn<() => Promise<BpmResult | null>>(async () => ({
      bpm: 120,
      confidence: 'high',
    })),
    extractMetadata: vi.fn(async () => ({
      title: 'Test tone',
      artist: 'Audio Signal Lab',
      album: null,
      artworkUrl: null,
    })),
    revokeArtworkUrl: vi.fn(),
    downloadPreset: vi.fn(),
    downloadReportJson: vi.fn(),
    downloadReportMarkdown: vi.fn(),
  };
});
vi.mock('../audio/AudioEngine', () => ({ audioEngine: mocks.audioEngine }));
vi.mock('../audio/bpm', () => ({ detectBpm: mocks.detectBpm }));
vi.mock('../audio/metadata', () => ({
  extractMetadata: mocks.extractMetadata,
  revokeArtworkUrl: mocks.revokeArtworkUrl,
}));
vi.mock('./analysisWorkerFactory', () => ({ createAnalysisWorker: () => null }));
vi.mock('./presets', () => ({
  serializePreset: (session: unknown) => session,
  parsePreset: (raw: unknown) => raw,
  downloadPreset: mocks.downloadPreset,
}));
vi.mock('../utils/reportDownload', () => ({
  downloadReportJson: mocks.downloadReportJson,
  downloadReportMarkdown: mocks.downloadReportMarkdown,
}));
import { useAudioLabStore } from './useAudioLabStore';
function audioFile(name = 'tone.wav'): File {
  return new File([new Uint8Array([1, 2, 3, 4])], name, {
    type: 'audio/wav',
    lastModified: 123,
  });
}
async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
beforeEach(() => {
  useAudioLabStore.getState().dismissStatus();
  useAudioLabStore.getState().resetSession();
  useAudioLabStore.getState().dismissStatus();
  vi.clearAllMocks();
  mocks.audioEngine.decodeFile.mockResolvedValue(mocks.buffer);
  mocks.audioEngine.resumeContext.mockResolvedValue(true);
  mocks.detectBpm.mockResolvedValue({ bpm: 120, confidence: 'high' });
  mocks.extractMetadata.mockResolvedValue({
    title: 'Test tone',
    artist: 'Audio Signal Lab',
    album: null,
    artworkUrl: null,
  });
});
afterEach(() => useAudioLabStore.getState().dismissStatus());
it('loads, analyses, annotates, and clears the main track', async () => {
  await useAudioLabStore.getState().loadMainTrack(audioFile());
  await flushPromises();
  let state = useAudioLabStore.getState();
  expect(state.mainTrack).toMatchObject({
    name: 'tone.wav',
    loadingState: 'loaded',
    bpm: 120,
    bpmConfidence: 'high',
  });
  expect(state.mainTrack.analysis).not.toBeNull();
  state.setMainSelection(0.1, 0.6);
  state.setMainLoop(true);
  state.addPointMarker();
  state.addRangeMarker();
  state = useAudioLabStore.getState();
  expect(state.mainTrack.markers).toHaveLength(2);
  state.updateMarkerLabel(state.mainTrack.markers[0]!.id, '  Intro  ');
  state.jumpToMarker(state.mainTrack.markers[1]!.id);
  expect(mocks.audioEngine.seek).toHaveBeenCalled();
  expect(useAudioLabStore.getState().mainTrack.markers[0]!.label).toBe('Intro');
  state.removeMarker(state.mainTrack.markers[0]!.id);
  state.clearMainSelection();
  state.clearMainTrack();
  expect(useAudioLabStore.getState().mainTrack.loadingState).toBe('empty');
});
it('ignores a BPM result that completes after the main track is cleared', async () => {
  let resolveBpm: (value: { bpm: number; confidence: 'medium' }) => void = () => {};
  mocks.detectBpm.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveBpm = resolve;
    }),
  );
  await useAudioLabStore.getState().loadMainTrack(audioFile('late.wav'));
  useAudioLabStore.getState().clearMainTrack();
  resolveBpm({ bpm: 98, confidence: 'medium' });
  await flushPromises();
  expect(useAudioLabStore.getState().mainTrack.bpm).toBeNull();
  expect(useAudioLabStore.getState().mainTrack.loadingState).toBe('empty');
});
it('manages secondary files and invalidates their stale BPM work', async () => {
  const state = useAudioLabStore.getState();
  state.addFile();
  state.addFile();
  const [first, second] = useAudioLabStore.getState().files;
  await state.loadFile(first!.id, audioFile('first.wav'));
  await state.loadFile(second!.id, audioFile('second.wav'));
  await flushPromises();
  state.setFileVolume(first!.id, 0.5);
  state.reorderFile(second!.id, 0);
  state.activateFile(first!.id);
  state.setMainSelection(0.1, 0.6);
  state.activateFile(first!.id);
  state.setFileVolume(first!.id, 0.4);
  const mainTrack = useAudioLabStore.getState().mainTrack;
  expect(mainTrack.name).toBe('first.wav');
  expect(mainTrack.volume).toBe(0.4);
  expect(mainTrack.selection).toEqual({ startSeconds: 0.1, endSeconds: 0.6 });
  state.removeFile(first!.id);
  expect(useAudioLabStore.getState().activeFileId).toBeNull();
  expect(useAudioLabStore.getState().files).toHaveLength(1);
});
it('applies transport, snapshot, A/B, export, and reset workflows', async () => {
  await useAudioLabStore.getState().loadMainTrack(audioFile());
  await flushPromises();
  let state = useAudioLabStore.getState();
  state.play();
  await flushPromises();
  state.pause();
  state.seekToStart();
  state.jumpForward();
  state.jumpBack();
  state.setMasterVolume(0.6);
  state.toggleMasterMute();
  state.saveSnapshot('Reference');
  state.assignAB('a');
  state = useAudioLabStore.getState();
  const snapshotId = state.snapshots[0]!.id;
  state.renameSnapshot(snapshotId, 'Renamed');
  state.duplicateSnapshot(snapshotId);
  state.applySnapshot(snapshotId);
  state.applyAB('a');
  state.exportPreset();
  state.exportReportJson();
  state.exportReportMarkdown();
  expect(mocks.downloadPreset).toHaveBeenCalledOnce();
  expect(mocks.downloadReportJson).toHaveBeenCalledOnce();
  expect(mocks.downloadReportMarkdown).toHaveBeenCalledOnce();
  state.deleteSnapshot(snapshotId);
  state.stop();
  state.resetSession();
  expect(useAudioLabStore.getState()).toMatchObject({
    files: [],
    snapshots: [],
    activeFileId: null,
  });
});
it('enforces the file limit and reports singular and plural dropped files', () => {
  const audioFiles = Array.from({ length: 14 }, (_, index) => audioFile(`track-${index}.wav`));
  const invalid = new File(['notes'], 'notes.txt', { type: 'text/plain' });
  useAudioLabStore.getState().dropFiles([...audioFiles, invalid]);
  expect(useAudioLabStore.getState().files).toHaveLength(12);
  expect(useAudioLabStore.getState().statusMessage).toBe(
    '3 files skipped — not audio or file limit reached',
  );
  useAudioLabStore.getState().dropFiles([invalid]);
  expect(useAudioLabStore.getState().statusMessage).toBe(
    '1 file skipped — not audio or file limit reached',
  );
  useAudioLabStore.getState().addFile();
  expect(useAudioLabStore.getState().statusMessage).toBe('File limit reached (12)');
});
it('marks a current file decode failure but ignores one after removal', async () => {
  useAudioLabStore.getState().addFile();
  let fileId = useAudioLabStore.getState().files[0]!.id;
  mocks.audioEngine.decodeFile.mockRejectedValueOnce(new Error('decode'));
  await useAudioLabStore.getState().loadFile(fileId, audioFile());
  expect(useAudioLabStore.getState().files[0]!.loadingState).toBe('failed');

  useAudioLabStore.getState().resetSession();
  useAudioLabStore.getState().addFile();
  fileId = useAudioLabStore.getState().files[0]!.id;
  let rejectDecode: (reason: Error) => void = () => {};
  mocks.audioEngine.decodeFile.mockReturnValueOnce(
    new Promise((_resolve, reject) => {
      rejectDecode = reject;
    }),
  );
  const pending = useAudioLabStore.getState().loadFile(fileId, audioFile('late.wav'));
  useAudioLabStore.getState().removeFile(fileId);
  rejectDecode(new Error('late decode'));
  await pending;
  expect(useAudioLabStore.getState().files).toEqual([]);
});
it('ignores stale file decode and BPM completions', async () => {
  useAudioLabStore.getState().addFile();
  let fileId = useAudioLabStore.getState().files[0]!.id;
  let resolveDecode: (buffer: AudioBuffer) => void = () => {};
  mocks.audioEngine.decodeFile.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveDecode = resolve;
    }),
  );
  const pending = useAudioLabStore.getState().loadFile(fileId, audioFile('late.wav'));
  useAudioLabStore.getState().removeFile(fileId);
  resolveDecode(mocks.buffer);
  await pending;

  useAudioLabStore.getState().addFile();
  fileId = useAudioLabStore.getState().files[0]!.id;
  let resolveBpm: (value: BpmResult | null) => void = () => {};
  mocks.detectBpm.mockReturnValueOnce(new Promise((resolve) => (resolveBpm = resolve)));
  await useAudioLabStore.getState().loadFile(fileId, audioFile('bpm.wav'));
  useAudioLabStore.getState().removeFile(fileId);
  resolveBpm(null);
  await flushPromises();
  expect(useAudioLabStore.getState().files).toEqual([]);
});
