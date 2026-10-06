import type { AnalysisReport } from './reportExport';

export function serializeReportJson(report: AnalysisReport): string {
  return JSON.stringify(report, null, 2);
}
