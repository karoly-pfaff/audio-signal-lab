import { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { subscribePlaybackPosition } from '../audio/playbackPositionEvents';

export function usePlaybackTime(): number {
  const [time, setTime] = useState(() => audioEngine.currentTime);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const unsubscribe = subscribePlaybackPosition(setTime);
    const tick = () => {
      setTime(audioEngine.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      unsubscribe();
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return time;
}
