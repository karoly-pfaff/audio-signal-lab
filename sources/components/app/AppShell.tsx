import { useGlobalShortcuts } from '../../hooks/useGlobalShortcuts';
import { useAudioLabStore } from '../../store/useAudioLabStore';
import { AnalysisPanel } from '../analysis/AnalysisPanel';
import { AppHeader } from './AppHeader';
import { BottomBar } from '../transport/BottomBar';
import { FileSidebar } from '../files/FileSidebar';
import { MainTrackPanel } from '../analysis/MainTrackPanel';
import { SpectrumInspector } from '../analysis/SpectrumInspector';
import { StatusMessage } from './StatusMessage';

export function AppShell() {
  useGlobalShortcuts();
  const buffer = useAudioLabStore((state) => state.mainTrack.buffer);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#analysis-workspace">
        Skip to analysis workspace
      </a>
      <div className="scanlines" aria-hidden="true" />
      <div className="grid-bg" aria-hidden="true" />
      <AppHeader />
      <div className="workspace">
        <FileSidebar />
        <main id="analysis-workspace" className="center-panel" tabIndex={-1}>
          <MainTrackPanel />
        </main>
        <aside className="right-panel">
          <AnalysisPanel />
          {buffer && <SpectrumInspector buffer={buffer} sampleRate={buffer.sampleRate} />}
        </aside>
      </div>
      <BottomBar />
      <StatusMessage />
    </div>
  );
}
