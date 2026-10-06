import type { FileIdentity, MainTrackState, TrackMetadata } from '../audio/types';
import type { AudioAnalysisSummary, ClippingRisk } from '../audio/analysis';
import { sortMarkersByTime } from './markerUtils';

export { serializeReportMarkdown } from './reportMarkdown';
export { serializeReportJson } from './reportJson';

const APP_NAME = 'Audio Signal Lab';
export const REPORT_VERSION = '1';

interface ReportApp {
  name: string;
  version: string;
}

interface ReportFile {
  name: string;
  size: number | null;
  durationSeconds: number | null;
  sampleRate: number | null;
  channelCount: number | null;
  quickHash: string | null;
  title: string | null;
  artist: string | null;
  album: string | null;
  bpm: number | null;
}

interface ReportAnalysis {
  peakDb: number | null;
  rmsDb: number | null;
  crestFactorDb: number | null;
  dynamicRangeProxyDb: number | null;
  dcOffset: number;
}

interface ReportSignal {
  clippingRisk: ClippingRisk;
  clippedSampleCount: number;
  clippedSampleRatio: number;
  silentSampleRatio: number;
  silentRegionCount: number;
  longestSilentRegionSeconds: number;
}

interface ReportSelection {
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
}

interface ReportMarker {
  id: string;
  type: 'point' | 'range';
  label: string;
  startSeconds: number;
  endSeconds: number | null;
  durationSeconds: number | null;
  createdAt: number;
}

interface ReportLimitations {
  rawAudioIncluded: boolean;
  masteringGrade: boolean;
  fileIdentityIsHeuristic: boolean;
  spectrogramPixelsIncluded: boolean;
  reportRestoresSession: boolean;
  notes: string[];
}

export interface AnalysisReport {
  reportVersion: string;
  app: ReportApp;
  exportedAt: string;
  activeFile: ReportFile | null;
  analysis: ReportAnalysis | null;
  signal: ReportSignal | null;
  selection: ReportSelection | null;
  markers: ReportMarker[];
  limitations: ReportLimitations;
}

export interface ReportInputs {
  mainTrack: MainTrackState;
}

const REPORT_LIMITATIONS: ReportLimitations = {
  rawAudioIncluded: false,
  masteringGrade: false,
  fileIdentityIsHeuristic: true,
  spectrogramPixelsIncluded: false,
  reportRestoresSession: false,
  notes: [
    'Raw audio is not included in this report.',
    'Signal region detail (silence/clipping timestamps) is not included.',
    'DR Proxy is a rough estimate; it is not a mastering-grade dynamic range measurement.',
    'Analysis is based on decoded PCM data; results may vary slightly between decoders.',
  ],
};

const EMPTY_METADATA: TrackMetadata = { title: null, artist: null, album: null };

type ReportFileMetrics = Pick<
  ReportFile,
  'size' | 'durationSeconds' | 'sampleRate' | 'channelCount' | 'quickHash'
>;

function buildReportFileMetrics(
  identity: FileIdentity | null,
  analysis: AudioAnalysisSummary | null,
): ReportFileMetrics {
  if (identity) {
    return {
      size: identity.size,
      durationSeconds: identity.durationSeconds,
      sampleRate: identity.sampleRate,
      channelCount: identity.channelCount,
      quickHash: identity.quickHash ?? null,
    };
  }
  if (analysis) {
    return {
      size: null,
      durationSeconds: analysis.durationSeconds,
      sampleRate: analysis.sampleRate,
      channelCount: analysis.channelCount,
      quickHash: null,
    };
  }
  return {
    size: null,
    durationSeconds: null,
    sampleRate: null,
    channelCount: null,
    quickHash: null,
  };
}

function buildReportFile(mainTrack: MainTrackState): ReportFile | null {
  const fileIdentity = mainTrack.fileIdentity ?? null;
  const analysis = mainTrack.analysis ?? null;
  const name = mainTrack.name || fileIdentity?.name;
  if (!name) {
    return null;
  }
  const metadata = mainTrack.metadata || EMPTY_METADATA;
  return {
    name,
    ...buildReportFileMetrics(fileIdentity, analysis),
    title: metadata.title,
    artist: metadata.artist,
    album: metadata.album,
    bpm: typeof mainTrack.bpm === 'number' ? mainTrack.bpm : null,
  };
}

function buildReportAnalysis(analysis: AudioAnalysisSummary | null): ReportAnalysis | null {
  if (!analysis) {
    return null;
  }
  return {
    peakDb: analysis.peakDb,
    rmsDb: analysis.rmsDb,
    crestFactorDb: analysis.crestFactorDb,
    dynamicRangeProxyDb: analysis.dynamicRangeProxyDb,
    dcOffset: analysis.dcOffset,
  };
}

function buildReportSignal(analysis: AudioAnalysisSummary | null): ReportSignal | null {
  if (!analysis) {
    return null;
  }
  return {
    clippingRisk: analysis.clippingRisk,
    clippedSampleCount: analysis.clippedSampleCount,
    clippedSampleRatio: analysis.clippedSampleRatio,
    silentSampleRatio: analysis.silentSampleRatio,
    silentRegionCount: analysis.silentRegionCount,
    longestSilentRegionSeconds: analysis.longestSilentRegionSeconds,
  };
}

function buildReportSelection(mainTrack: MainTrackState): ReportSelection | null {
  if (!mainTrack.selection) {
    return null;
  }
  return {
    startSeconds: mainTrack.selection.startSeconds,
    endSeconds: mainTrack.selection.endSeconds,
    durationSeconds: mainTrack.selection.endSeconds - mainTrack.selection.startSeconds,
  };
}

function buildReportMarkers(markers: MainTrackState['markers']): ReportMarker[] {
  return sortMarkersByTime(markers).map((m) => ({
    id: m.id,
    type: m.type,
    label: m.label,
    startSeconds: m.startSeconds,
    endSeconds: m.endSeconds ?? null,
    durationSeconds:
      m.type === 'range' && m.endSeconds !== null && m.endSeconds !== undefined
        ? m.endSeconds - m.startSeconds
        : null,
    createdAt: m.createdAt,
  }));
}

export function buildAnalysisReport(inputs: ReportInputs): AnalysisReport {
  const { mainTrack } = inputs;
  const analysis = mainTrack.analysis ?? null;

  return {
    reportVersion: REPORT_VERSION,
    app: { name: APP_NAME, version: __APP_VERSION__ },
    exportedAt: new Date().toISOString(),
    activeFile: buildReportFile(mainTrack),
    analysis: buildReportAnalysis(analysis),
    signal: buildReportSignal(analysis),
    selection: buildReportSelection(mainTrack),
    markers: buildReportMarkers(mainTrack.markers),
    limitations: REPORT_LIMITATIONS,
  };
}

export function buildReportFilename(
  baseName: string | null | undefined,
  ext: 'md' | 'json',
): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const timestamp = `${datePart}-${timePart}`;

  if (baseName) {
    const sanitized = baseName
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 24)
      .toLowerCase();
    if (sanitized) {
      return `audio-signal-lab-report-${sanitized}-${timestamp}.${ext}`;
    }
  }
  return `audio-signal-lab-report-${timestamp}.${ext}`;
}
