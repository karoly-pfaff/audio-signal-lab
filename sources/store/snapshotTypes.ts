import type { BpmConfidence, FileIdentity, Marker, SelectionRange } from '../audio/types';

export interface SnapshotFile {
  id: string;
  order: number;
  volume: number;
  filename: string | null;
  thumbnailUrl: string | null;
  bpm: number | null;
  bpmConfidence: BpmConfidence | null;
}

export interface SessionSnapshot {
  id: string;
  name: string;
  createdAt: string;
  main: {
    volume: number;
    loop: boolean;
    filename: string | null;
    thumbnailUrl: string | null;
    bpm: number | null;
    bpmConfidence: BpmConfidence | null;
    selection?: SelectionRange | null;
    markers?: Marker[];
    fileIdentity?: FileIdentity | null;
  };
  masterVolume: number;
  masterMuted: boolean;
  files: SnapshotFile[];
}

export interface ABSlots {
  a: SessionSnapshot | null;
  b: SessionSnapshot | null;
}
