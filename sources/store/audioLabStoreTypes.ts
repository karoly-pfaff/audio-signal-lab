import type { StoreApi } from 'zustand';
import type { FileState, MainTrackState, TransportState } from '../audio/types';
import type { ABSlots, SessionSnapshot } from './snapshots';

export interface MainTrackActions {
  activateFile: (fileId: string) => void;
  loadMainTrack: (file: File) => Promise<void>;
  clearMainTrack: () => void;
  setMainVolume: (volume: number) => void;
  setMainLoop: (loop: boolean) => void;
  setMainSelection: (start: number, end: number) => void;
  clearMainSelection: () => void;
}

export interface AnnotationActions {
  addPointMarker: () => void;
  addRangeMarker: () => void;
  updateMarkerLabel: (id: string, label: string) => void;
  removeMarker: (id: string) => void;
  jumpToMarker: (id: string) => void;
}

export interface FileActions {
  addFile: () => void;
  loadFile: (fileId: string, file: File) => Promise<void>;
  removeFile: (fileId: string) => void;
  reorderFile: (fileId: string, targetOrder: number) => void;
  setFileVolume: (fileId: string, volume: number) => void;
  dropFiles: (files: File[]) => void;
}

export interface TransportActions {
  play: () => void;
  pause: () => void;
  stop: () => void;
  seekTo: (seconds: number) => void;
  seekToStart: () => void;
  jumpBack: (seconds?: number) => void;
  jumpForward: (seconds?: number) => void;
  setMasterVolume: (volume: number) => void;
  toggleMasterMute: () => void;
}

export interface SessionActions {
  resetSession: () => Promise<void>;
  exportPreset: () => void;
  importPreset: (file: File) => Promise<void>;
  exportReportMarkdown: () => void;
  exportReportJson: () => void;
}

export interface SnapshotActions {
  saveSnapshot: (name?: string) => void;
  applySnapshot: (id: string) => void;
  renameSnapshot: (id: string, name: string) => void;
  duplicateSnapshot: (id: string) => void;
  deleteSnapshot: (id: string) => void;
  assignAB: (slot: 'a' | 'b') => void;
  applyAB: (slot: 'a' | 'b') => void;
}

export interface AudioLabState
  extends
    MainTrackActions,
    AnnotationActions,
    FileActions,
    TransportActions,
    SessionActions,
    SnapshotActions {
  mainTrack: MainTrackState;
  files: FileState[];
  transport: TransportState;
  snapshots: SessionSnapshot[];
  ab: ABSlots;
  activeFileId: string | null;
  statusMessage: string | null;
  dismissStatus: () => void;
  canPlay: () => boolean;
}

export type AudioLabSet = StoreApi<AudioLabState>['setState'];
export type AudioLabGet = StoreApi<AudioLabState>['getState'];
