import { useAudioLabStore } from '../../store/useAudioLabStore';
import { SignalThumbnail } from '../files/SignalThumbnail';

export function BottomBarTrackSummary() {
  const { mainTrack } = useAudioLabStore();
  const title = mainTrack.metadata?.title || mainTrack.name;
  const subtitle = [mainTrack.metadata?.artist, mainTrack.metadata?.album]
    .filter(Boolean)
    .join(' · ');
  return (
    <div className="bottom-bar-left">
      <SignalThumbnail
        buffer={mainTrack.buffer}
        artworkUrl={mainTrack.thumbnailUrl}
        size={36}
        color="#8BA8EE"
      />
      <div className="bottom-bar-text">
        {title ? (
          <>
            <span className="bottom-bar-title">{title}</span>
            {subtitle && <span className="bottom-bar-artist">{subtitle}</span>}
          </>
        ) : (
          <span className="bottom-bar-empty">No file loaded</span>
        )}
      </div>
    </div>
  );
}
