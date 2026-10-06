import type { ClippingRisk } from '../audio/analysis';
import type { AnalysisReport } from './reportExport';
import { formatTime } from './transportUtils';

const RISK_LABELS: Record<ClippingRisk, string> = {
  none: 'None',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

function formatDb(db: number | null): string {
  if (db === null) {
    return '—';
  }
  return `${db >= 0 ? '+' : ''}${db.toFixed(1)} dB`;
}

function formatDuration(seconds: number): string {
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) {
    return `${hours}:${String(minutes % 60).padStart(2, '00')}:${String(total % 60).padStart(2, '0')}`;
  }
  return `${minutes}:${String(total % 60).padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function markdownLiteral(value: string): string {
  return value
    .replace(/\r\n?|\n/g, ' ')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/([\\`*_[\]{}()#+!|~-])/g, '\\$1');
}

function appendActiveFile(lines: string[], file: AnalysisReport['activeFile']): void {
  lines.push('## Active File');
  if (!file) {
    lines.push('No active file.', '');
    return;
  }
  lines.push(`- File: ${markdownLiteral(file.name)}`);
  if (file.title) {
    lines.push(`- Title: ${markdownLiteral(file.title)}`);
  }
  if (file.artist) {
    lines.push(`- Artist: ${markdownLiteral(file.artist)}`);
  }
  if (file.album) {
    lines.push(`- Album: ${markdownLiteral(file.album)}`);
  }
  if (file.size !== null) {
    lines.push(`- Size: ${formatFileSize(file.size)}`);
  }
  if (file.durationSeconds !== null) {
    lines.push(`- Duration: ${formatDuration(file.durationSeconds)}`);
  }
  if (file.sampleRate !== null) {
    const rate =
      file.sampleRate >= 1000
        ? `${(file.sampleRate / 1000).toFixed(1)} kHz`
        : `${file.sampleRate} Hz`;
    lines.push(`- Sample Rate: ${rate}`);
  }
  if (file.channelCount !== null) {
    const channels =
      file.channelCount === 1
        ? 'Mono'
        : file.channelCount === 2
          ? 'Stereo'
          : `${file.channelCount}ch`;
    lines.push(`- Channels: ${channels}`);
  }
  if (file.bpm !== null) {
    lines.push(`- BPM: ${file.bpm.toFixed(1)}`);
  }
  if (file.quickHash) {
    lines.push(`- Quick Hash: ${markdownLiteral(file.quickHash)}`);
  }
  lines.push('');
}

function appendTechnicalSummary(lines: string[], analysis: AnalysisReport['analysis']): void {
  lines.push('## Technical Summary');
  if (!analysis) {
    lines.push('No analysis available.', '');
    return;
  }
  lines.push(`- Peak: ${formatDb(analysis.peakDb)}`);
  lines.push(`- RMS: ${formatDb(analysis.rmsDb)}`);
  lines.push(`- Crest Factor: ${formatDb(analysis.crestFactorDb)}`);
  lines.push(`- DR Proxy: ${formatDb(analysis.dynamicRangeProxyDb)}`);
  const offset = Math.abs(analysis.dcOffset) < 0.0001 ? '≈ 0' : analysis.dcOffset.toFixed(4);
  lines.push(`- DC Offset: ${offset}`, '');
}

function appendSignalSummary(lines: string[], signal: AnalysisReport['signal']): void {
  lines.push('## Signal Summary');
  if (!signal) {
    lines.push('No analysis available.', '');
    return;
  }
  lines.push(`- Clipping: ${RISK_LABELS[signal.clippingRisk]}`);
  if (signal.clippedSampleCount > 0) {
    const ratio =
      signal.clippedSampleRatio < 0.00001
        ? '<0.001%'
        : `${(signal.clippedSampleRatio * 100).toFixed(3)}%`;
    lines.push(`- Clipped Samples: ${signal.clippedSampleCount} (${ratio})`);
  }
  lines.push(`- Silence: ${(signal.silentSampleRatio * 100).toFixed(1)}%`);
  lines.push(`- Silent Regions: ${signal.silentRegionCount}`);
  if (signal.longestSilentRegionSeconds > 0) {
    lines.push(`- Longest Silence: ${signal.longestSilentRegionSeconds.toFixed(2)} s`);
  }
  lines.push('');
}

function appendSelection(lines: string[], selection: AnalysisReport['selection']): void {
  lines.push('## Selected Range');
  if (!selection) {
    lines.push('No selection.', '');
    return;
  }
  lines.push(`- Start: ${formatTime(selection.startSeconds)}`);
  lines.push(`- End: ${formatTime(selection.endSeconds)}`);
  lines.push(`- Duration: ${selection.durationSeconds.toFixed(3)} s`, '');
}

function appendMarkers(lines: string[], markers: AnalysisReport['markers']): void {
  lines.push('## Markers / Checkpoints');
  if (markers.length === 0) {
    lines.push('No markers.');
  }
  for (const marker of markers) {
    const time =
      marker.type === 'range' && marker.endSeconds !== null
        ? `${formatTime(marker.startSeconds)} — ${formatTime(marker.endSeconds)}`
        : formatTime(marker.startSeconds);
    lines.push(`- ${markdownLiteral(marker.label)}: ${time}`);
  }
  lines.push('');
}

export function serializeReportMarkdown(report: AnalysisReport): string {
  const lines = [
    '# Audio Signal Lab — Analysis Report',
    '',
    `Exported: ${report.exportedAt}`,
    `App: ${report.app.name} v${report.app.version}`,
    '',
  ];
  appendActiveFile(lines, report.activeFile);
  appendTechnicalSummary(lines, report.analysis);
  appendSignalSummary(lines, report.signal);
  appendSelection(lines, report.selection);
  appendMarkers(lines, report.markers);
  lines.push('## Notes / Limitations');
  for (const note of report.limitations.notes) {
    lines.push(`- ${note}`);
  }
  lines.push('');
  return lines.join('\n');
}
