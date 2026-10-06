import { BottomBarTrackSummary } from './BottomBarTrackSummary';
import { StereoMeter } from './StereoMeter';
import { TransportBar } from './TransportBar';

export function BottomBar() {
  return (
    <div className="bottom-bar">
      <BottomBarTrackSummary />
      <TransportBar />
      <div className="bottom-bar-right">
        <StereoMeter />
      </div>
    </div>
  );
}
