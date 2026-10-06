import { useAudioLabStore } from '../../store/useAudioLabStore';
import { AnalysisPanelContent } from './AnalysisPanelContent';

export function AnalysisPanel() {
  const { mainTrack } = useAudioLabStore();
  const analysis = mainTrack.analysis ?? null;
  if (!analysis) {
    if (mainTrack.loadingState === 'loaded') {
      return (
        <div className="analysis-panel analysis-panel--analyzing">
          <div className="analysis-panel-header">
            <span className="panel-label">ANALYSIS</span>
          </div>
          <div className="analysis-pending">Analyzing signal…</div>
        </div>
      );
    }
    return null;
  }
  return <AnalysisPanelContent analysis={analysis} bpm={mainTrack.bpm} />;
}
