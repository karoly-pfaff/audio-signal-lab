import { useEffect, useRef } from 'react';
import { audioEngine } from '../../audio/AudioEngine';
import { smoothLevel, clampLevel } from '../../audio/meters';
import { useAudioLabStore } from '../../store/useAudioLabStore';
import { StereoMeterRow } from './StereoMeterRow';

const ATTACK = 0.3;
const DECAY = 0.88;

function useStereoMeter(playing: boolean) {
  const barLRef = useRef<HTMLDivElement>(null);
  const barRRef = useRef<HTMLDivElement>(null);
  const levelsRef = useRef({ left: 0, right: 0 });

  useEffect(() => {
    let active = true;
    let rafId: number;

    function tick() {
      if (!active) {
        return;
      }
      const raw = audioEngine.getStereoLevels();
      const prev = levelsRef.current;
      const sLeft = clampLevel(
        smoothLevel(prev.left, raw.left, raw.left > prev.left ? ATTACK : DECAY),
      );
      const sRight = clampLevel(
        smoothLevel(prev.right, raw.right, raw.right > prev.right ? ATTACK : DECAY),
      );
      levelsRef.current = { left: sLeft, right: sRight };
      if (barLRef.current) {
        barLRef.current.style.width = `${sLeft * 100}%`;
      }
      if (barRRef.current) {
        barRRef.current.style.width = `${sRight * 100}%`;
      }
      if (playing || sLeft > 0.001 || sRight > 0.001) {
        rafId = requestAnimationFrame(tick);
      }
    }

    rafId = requestAnimationFrame(tick);
    return () => {
      active = false;
      cancelAnimationFrame(rafId);
    };
  }, [playing]);

  return { barLRef, barRRef };
}

export function StereoMeter() {
  const playing = useAudioLabStore((state) => state.transport.playing);
  const { barLRef, barRRef } = useStereoMeter(playing);

  return (
    <div className="stereo-meter" aria-hidden="true">
      <StereoMeterRow label="L" barRef={barLRef} />
      <StereoMeterRow label="R" barRef={barRRef} />
    </div>
  );
}
