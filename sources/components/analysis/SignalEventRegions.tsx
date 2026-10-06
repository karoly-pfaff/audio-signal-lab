import type { SignalRegion } from '../../audio/analysis';
import { eventRailPercent, eventRailWidth } from './signalEventRailGeometry';

interface SignalEventRegionsProps {
  regions: SignalRegion[];
  duration: number;
  kind: 'silence' | 'clip';
}

export function SignalEventRegions({ regions, duration, kind }: SignalEventRegionsProps) {
  return regions.map((region, index) => (
    <div
      key={`${kind}-${index}`}
      className={`event-rail-${kind}`}
      style={{
        left: eventRailPercent(region.startSeconds, duration),
        width: eventRailWidth(region.startSeconds, region.endSeconds, duration),
      }}
    />
  ));
}
