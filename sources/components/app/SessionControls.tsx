import { useRef } from 'react';
import { useAudioLabStore } from '../../store/useAudioLabStore';
import { SessionControlButton } from './SessionControlButton';
import { SessionFileInput } from './SessionFileInput';

export function SessionControls() {
  const { exportPreset, importPreset, resetSession, exportReportJson, exportReportMarkdown } =
    useAudioLabStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="preset-controls">
      <SessionFileInput inputRef={fileInputRef} importSession={importPreset} />
      <SessionControlButton
        label="Import session"
        title="Import a session JSON file"
        onClick={() => fileInputRef.current?.click()}
      />
      <SessionControlButton
        label="Export session"
        title="Export current session as JSON"
        onClick={exportPreset}
      />
      <SessionControlButton
        label="Reset session"
        title="Reset all settings and clear remembered session"
        onClick={resetSession}
        reset
      />
      <SessionControlButton
        label="JSON report"
        title="Create JSON inspection report"
        onClick={exportReportJson}
      />
      <SessionControlButton
        label="Markdown report"
        title="Create Markdown inspection report"
        onClick={exportReportMarkdown}
      />
    </div>
  );
}
