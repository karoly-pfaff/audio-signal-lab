import type { SelectionRange } from '../../audio/types';

interface SpectrogramSelectionOverlayProps {
  selection: SelectionRange | null | undefined;
  duration: number;
}

export function SpectrogramSelectionOverlay({
  selection,
  duration,
}: SpectrogramSelectionOverlayProps) {
  if (!selection || duration <= 0) {
    return null;
  }
  const style = {
    left: `${(selection.startSeconds / duration) * 100}%`,
    width: `${Math.max(0, ((selection.endSeconds - selection.startSeconds) / duration) * 100)}%`,
  };
  return <div className="spectrogram-selection" style={style} aria-hidden="true" />;
}
