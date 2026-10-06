import type { FileState } from '../../audio/types';
import { FileRowInfo } from './FileRowInfo';
import { SignalThumbnail } from './SignalThumbnail';

interface FileActivationButtonProps {
  file: FileState;
  active: boolean;
  activate: (fileId: string) => void;
}

export function FileActivationButton({ file, active, activate }: FileActivationButtonProps) {
  if (!file.buffer) {
    return (
      <div className="file-activation-content">
        <SignalThumbnail
          buffer={file.buffer}
          artworkUrl={file.thumbnailUrl}
          size={44}
          color="#B0A0E8"
        />
        <FileRowInfo file={file} />
      </div>
    );
  }
  return (
    <button
      type="button"
      className="file-activation-button"
      aria-label={`Activate ${file.name || `file ${file.order + 1}`}`}
      aria-pressed={active}
      onClick={() => activate(file.id)}
    >
      <SignalThumbnail
        buffer={file.buffer}
        artworkUrl={file.thumbnailUrl}
        size={44}
        color="#B0A0E8"
      />
      <FileRowInfo file={file} />
    </button>
  );
}
