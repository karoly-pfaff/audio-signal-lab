import type { FileState } from '../../audio/types';

export function FileRowInfo({ file }: { file: FileState }) {
  const pending = file.loadingState === 'remembered';
  const displayName = file.metadata?.title || file.name;
  const metadata = [file.metadata?.artist, file.metadata?.album].filter(Boolean).join(' · ');
  let content: React.ReactNode = (
    <span className="track-name track-name--empty track-name--drop">
      drop audio here or click +
    </span>
  );
  if (file.loadingState === 'loading') {
    content = <span className="track-name track-name--file track-name--loading">Loading…</span>;
  } else if (file.loadingState === 'failed') {
    content = <span className="track-name track-name--file track-name--failed">Decode failed</span>;
  } else if (displayName) {
    content = (
      <>
        {pending && <span className="reload-badge reload-badge--sm">↻</span>}
        <span className={`track-name track-name--file${pending ? ' track-name--pending' : ''}`}>
          {displayName}
        </span>
        {metadata && <span className="file-metadata-inline">{metadata}</span>}
      </>
    );
  }
  return (
    <div className="file-info">
      <div className="file-name-row">
        <div className="file-name-left">{content}</div>
      </div>
    </div>
  );
}
