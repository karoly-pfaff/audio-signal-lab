import { useAudioLabStore } from '../../store/useAudioLabStore';
import { MonitorControl } from './MonitorControl';
import { TransportControls } from './TransportControls';
import { TransportLoopControl } from './TransportLoopControl';

export function TransportBar() {
  const store = useAudioLabStore();
  const transportUnavailable =
    !store.mainTrack.buffer || store.mainTrack.loadingState === 'loading';
  return (
    <div className="transport-bar">
      <TransportLoopControl
        active={store.mainTrack.loop}
        disabled={transportUnavailable}
        toggle={() => store.setMainLoop(!store.mainTrack.loop)}
      />
      <TransportControls
        playing={store.transport.playing}
        disabled={transportUnavailable}
        playable={store.canPlay()}
        play={store.play}
        pause={store.pause}
        stop={store.stop}
        seekToStart={store.seekToStart}
        jumpBack={store.jumpBack}
        jumpForward={store.jumpForward}
      />
      <MonitorControl
        volume={store.transport.masterVolume}
        muted={store.transport.masterMuted}
        setVolume={store.setMasterVolume}
        toggleMute={store.toggleMasterMute}
      />
    </div>
  );
}
