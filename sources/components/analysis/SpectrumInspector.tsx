import { useEffect, useRef, useState } from 'react';
import { inspectionShared } from '../../audio/inspectionShared';
import { getFrequencyAxisTicks, getSpectrumFrame } from '../../utils/instrumentUtils';
import {
  renderComputingSpectrum,
  renderIdleSpectrum,
  renderSpectrum,
} from '../../utils/spectrumCanvas';
import { SpectrumCanvas } from './SpectrumCanvas';

const WIDTH = 200;
const HEIGHT = 100;

function useSpectrumAvailability(buffer?: AudioBuffer | null) {
  const [available, setAvailable] = useState(() => inspectionShared.hasSpectroFramesFor(buffer));
  useEffect(() => {
    const update = () => setAvailable(inspectionShared.hasSpectroFramesFor(buffer));
    const unsubscribe = inspectionShared.subscribe(update);
    update();
    return unsubscribe;
  }, [buffer]);
  return available;
}

function useLiveSpectrum(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  enabled: boolean,
  sampleRate: number,
  buffer?: AudioBuffer | null,
) {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    let animationId = 0;
    let dirty = true;
    const unsubscribe = inspectionShared.subscribe(() => {
      dirty = true;
    });
    const tick = () => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (dirty && canvas && context) {
        const { spectroFrames, hoverRatio, playheadRatio } = inspectionShared;
        if (spectroFrames && (buffer === undefined || inspectionShared.spectroBuffer === buffer)) {
          const frame = getSpectrumFrame(spectroFrames, hoverRatio ?? playheadRatio);
          const ticks = getFrequencyAxisTicks(sampleRate, spectroFrames.binsPerFrame);
          renderSpectrum(context, frame, { width: canvas.width, height: canvas.height }, ticks);
        } else {
          renderComputingSpectrum(context, canvas.width, canvas.height);
        }
        dirty = false;
      }
      animationId = requestAnimationFrame(tick);
    };
    animationId = requestAnimationFrame(tick);
    return () => {
      unsubscribe();
      cancelAnimationFrame(animationId);
    };
  }, [buffer, canvasRef, enabled, sampleRate]);
}

interface SpectrumInspectorProps {
  buffer?: AudioBuffer | null;
  sampleRate?: number;
}

export function SpectrumInspector({ buffer, sampleRate = 44100 }: SpectrumInspectorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const available = useSpectrumAvailability(buffer);
  useLiveSpectrum(canvasRef, available, sampleRate, buffer);
  useEffect(() => {
    if (available) {
      return;
    }
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (canvas && context) {
      renderIdleSpectrum(
        context,
        canvas.width,
        canvas.height,
        getFrequencyAxisTicks(sampleRate, 512),
      );
    }
  }, [available, sampleRate]);
  return (
    <div className="spectrum-inspector">
      <div className="spectrum-inspector-header">
        <span className="panel-label">SPECTRUM</span>
        <span className="spectrum-inspector-hint">@ hover / playhead</span>
      </div>
      <SpectrumCanvas canvasRef={canvasRef} idle={!available} width={WIDTH} height={HEIGHT} />
    </div>
  );
}
