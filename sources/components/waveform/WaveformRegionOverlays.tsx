import type { SignalRegion } from '../../audio/analysis';

interface WaveformRegionOverlaysProps {
  regions: SignalRegion[];
  duration: number;
  kind: 'silence' | 'clipping';
}

export function WaveformRegionOverlays({ regions, duration, kind }: WaveformRegionOverlaysProps) {
  return regions.map((region, index) => (
    <div
      key={`${kind}-${index}`}
      className={`waveform-overlay waveform-overlay--${kind}`}
      style={{
        left: `${(region.startSeconds / duration) * 100}%`,
        width: `${Math.max(0.1, ((region.endSeconds - region.startSeconds) / duration) * 100)}%`,
      }}
      aria-hidden="true"
    />
  ));
}
