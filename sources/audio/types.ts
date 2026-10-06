import type { AudioAnalysisSummary } from './analysis';

export interface FileIdentity {
  name: string;
  size: number;
  lastModified: number;
  durationSeconds: number;
  sampleRate: number;
  channelCount: number;
  quickHash?: string;
}

export interface SelectionRange {
  startSeconds: number;
  endSeconds: number;
}

type MarkerType = 'point' | 'range';

export interface Marker {
  id: string;
  type: MarkerType;
  startSeconds: number;
  endSeconds?: number;
  label: string;
  createdAt: number;
}

export type TrackLoadingState = 'empty' | 'remembered' | 'loading' | 'loaded' | 'failed';

export type BpmConfidence = 'low' | 'medium' | 'high';

export interface TrackMetadata {
  title: string | null;
  artist: string | null;
  album: string | null;
}

interface TrackState {
  id: string;
  name: string;
  assetId?: string | null;
  buffer: AudioBuffer | null;
  volume: number;
  loop: boolean;
  thumbnailUrl: string | null;
  loadingState: TrackLoadingState;
  metadata: TrackMetadata | null;
  bpm?: number | null;
  bpmConfidence?: BpmConfidence | null;
  bpmAnalyzing?: boolean;
}

export interface FileState extends TrackState {
  order: number;
  analysis?: AudioAnalysisSummary | null;
  fileIdentity?: FileIdentity | null;
}

export interface MainTrackState extends TrackState {
  loop: boolean;
  analysis?: AudioAnalysisSummary | null;
  selection: SelectionRange | null;
  markers: Marker[];
  fileIdentity?: FileIdentity | null;
}

export interface TransportState {
  playing: boolean;
  masterVolume: number;
  masterMuted: boolean;
}

export function parseBpmConfidence(raw: unknown): BpmConfidence | null {
  if (raw === 'low' || raw === 'medium' || raw === 'high') {
    return raw;
  }
  return null;
}
