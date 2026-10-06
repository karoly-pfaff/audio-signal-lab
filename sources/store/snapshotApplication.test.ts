import { beforeEach, expect, it, vi } from 'vitest';
import type { FileState, MainTrackState } from '../audio/types';
import type { SessionSnapshot } from './snapshots';
import { createEmptyMainTrack } from './storeState';

const mocks = vi.hoisted(() => ({
  audioEngine: {
    stop: vi.fn(),
    setMasterVolume: vi.fn(),
    setMasterMute: vi.fn(),
    setMainVolume: vi.fn(),
    setMainLoop: vi.fn(),
    setMainLoopPoints: vi.fn(),
    removeFileBuffer: vi.fn(),
    setFileVolume: vi.fn(),
  },
}));

vi.mock('../audio/AudioEngine', () => ({ audioEngine: mocks.audioEngine }));

import { executeSnapshotApply } from './snapshotApplication';

function snapshotFile(id: string, filename: string | null, volume = 0.5) {
  return {
    id,
    order: 0,
    volume,
    filename,
    thumbnailUrl: filename ? `saved:${filename}` : null,
    bpm: filename ? 120 : null,
    bpmConfidence: filename ? ('high' as const) : null,
  };
}

function snapshot(files: SessionSnapshot['files']): SessionSnapshot {
  return {
    id: 'snapshot',
    name: 'Mix',
    createdAt: '2026-10-05T00:00:00.000Z',
    main: {
      volume: 0.7,
      loop: true,
      filename: 'main.wav',
      thumbnailUrl: null,
      bpm: null,
      bpmConfidence: null,
      selection: { startSeconds: 1, endSeconds: 3 },
      markers: [{ id: 'marker', type: 'point', startSeconds: 2, label: 'Hit', createdAt: 1 }],
      fileIdentity: {
        name: 'main.wav',
        size: 10,
        lastModified: 1,
        durationSeconds: 10,
        sampleRate: 44_100,
        channelCount: 1,
      },
    },
    masterVolume: 0.8,
    masterMuted: true,
    files,
  };
}

function currentFile(id: string, loadingState: FileState['loadingState'] = 'loaded'): FileState {
  return {
    id,
    order: 0,
    name: 'current.wav',
    buffer: {} as AudioBuffer,
    volume: 1,
    loop: false,
    thumbnailUrl: 'blob:current',
    loadingState,
    metadata: { title: 'Current', artist: null, album: null },
    bpm: 90,
    bpmConfidence: 'medium',
  };
}

function currentMain(name = 'main.wav', duration = 10): MainTrackState {
  return {
    ...createEmptyMainTrack({ volume: 0.8, loop: false }),
    name,
    buffer: { duration } as AudioBuffer,
    loadingState: 'loaded',
    fileIdentity: {
      name,
      size: 10,
      lastModified: 1,
      durationSeconds: duration,
      sampleRate: 44_100,
      channelCount: 1,
    },
  };
}

beforeEach(() => vi.clearAllMocks());

it('creates remembered and empty files when the snapshot has no matching state', () => {
  const result = executeSnapshotApply(
    snapshot([snapshotFile('remembered', 'saved.wav'), snapshotFile('empty', null)]),
    [],
    currentMain(),
  );

  expect(result.files).toMatchObject([
    { id: 'remembered', name: 'saved.wav', loadingState: 'remembered', bpm: 120 },
    { id: 'empty', name: '', loadingState: 'empty', bpm: null },
  ]);
  expect(result.mainPatch).toMatchObject({
    volume: 0.7,
    loop: true,
    selection: { startSeconds: 1, endSeconds: 3 },
  });
  expect(result.mainPatch.markers).toHaveLength(1);
  expect(mocks.audioEngine.setMainLoopPoints).toHaveBeenCalledWith(1, 3);
  expect(result.transportPatch).toEqual({ playing: false, masterVolume: 0.8, masterMuted: true });
  expect(mocks.audioEngine.setFileVolume).toHaveBeenCalledTimes(2);
});

it('preserves decimal-boundary annotations and loop points for the same file', () => {
  const saved = snapshot([]);
  saved.main.selection = { startSeconds: 5, endSeconds: 5.1 };
  saved.main.markers = [
    { id: 'range', type: 'range', startSeconds: 5, endSeconds: 5.1, label: 'Hit', createdAt: 1 },
  ];

  const result = executeSnapshotApply(saved, [], currentMain());

  expect(result.mainPatch.selection).toEqual(saved.main.selection);
  expect(result.mainPatch.markers).toEqual(saved.main.markers);
  expect(result.annotationWarning).toBeNull();
  expect(mocks.audioEngine.setMainLoopPoints).toHaveBeenCalledWith(5, 5.1);
});

it('preserves a matching or loading file while applying its saved volume', () => {
  const matching = currentFile('matching');
  const loading = currentFile('loading', 'loading');
  const result = executeSnapshotApply(
    snapshot([snapshotFile('matching', 'current.wav', 0.4), snapshotFile('loading', 'other.wav')]),
    [matching, loading],
    currentMain(),
  );

  expect(result.files[0]).toEqual({ ...matching, volume: 0.4 });
  expect(result.files[1]).toEqual({ ...loading, volume: 0.5 });
  expect(result.artworkUrlsToRelease).toEqual([]);
  expect(mocks.audioEngine.removeFileBuffer).not.toHaveBeenCalled();
});

it('returns removed and replaced artwork for reference-aware cleanup', () => {
  const replaced = currentFile('replaced');
  const removed = currentFile('removed');
  const result = executeSnapshotApply(
    snapshot([snapshotFile('replaced', 'new.wav')]),
    [replaced, removed],
    currentMain(),
  );

  expect(result.files[0]).toMatchObject({
    id: 'replaced',
    name: 'new.wav',
    buffer: null,
    metadata: null,
    loadingState: 'remembered',
    bpm: 120,
  });
  expect(result.artworkUrlsToRelease).toEqual(['blob:current']);
  expect(mocks.audioEngine.removeFileBuffer).toHaveBeenCalledWith('removed');
  expect(mocks.audioEngine.removeFileBuffer).toHaveBeenCalledWith('replaced');
  expect(mocks.audioEngine.stop).toHaveBeenCalledOnce();
});

it('does not apply annotations or loop points to a different audio file', () => {
  const saved = snapshot([]);
  saved.main.filename = 'long.wav';
  saved.main.selection = { startSeconds: 80, endSeconds: 90 };
  saved.main.markers = [
    { id: 'late', type: 'point', startSeconds: 85, label: 'Late', createdAt: 1 },
  ];

  const result = executeSnapshotApply(saved, [], currentMain('short.wav', 10));

  expect(result.mainPatch.selection).toBeNull();
  expect(result.mainPatch.markers).toEqual([]);
  expect(result.annotationWarning).toContain('different audio file');
  expect(mocks.audioEngine.setMainLoopPoints).toHaveBeenCalledWith(0, 0);
});

it('does not trust a matching filename when either file identity is missing', () => {
  const saved = snapshot([]);
  saved.main.fileIdentity = null;

  const result = executeSnapshotApply(saved, [], currentMain());

  expect(result.mainPatch.selection).toBeNull();
  expect(result.mainPatch.markers).toEqual([]);
  expect(result.annotationWarning).toContain('different audio file');
});

it('restores the saved order of existing files', () => {
  const first = { ...currentFile('first'), order: 1 };
  const second = { ...currentFile('second'), order: 0 };
  const saved = snapshot([
    { ...snapshotFile('first', 'current.wav'), order: 0 },
    { ...snapshotFile('second', 'current.wav'), order: 1 },
  ]);

  const result = executeSnapshotApply(saved, [second, first], currentMain());

  expect(result.files.map(({ id, order }) => [id, order])).toEqual([
    ['first', 0],
    ['second', 1],
  ]);
});
