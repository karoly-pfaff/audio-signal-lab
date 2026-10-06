import { buildReportFilename, serializeReportJson, serializeReportMarkdown } from './reportExport';
import type { AnalysisReport } from './reportExport';

function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadReportMarkdown(report: AnalysisReport, baseName?: string | null): void {
  triggerDownload(
    serializeReportMarkdown(report),
    buildReportFilename(baseName, 'md'),
    'text/markdown',
  );
}

export function downloadReportJson(report: AnalysisReport, baseName?: string | null): void {
  triggerDownload(
    serializeReportJson(report),
    buildReportFilename(baseName, 'json'),
    'application/json',
  );
}
