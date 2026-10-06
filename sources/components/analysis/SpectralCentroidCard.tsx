import { useMemo } from 'react';
import { computeSpectralCentroid } from '../../utils/instrumentUtils';
import type { SpectroFrames } from '../../utils/instrumentUtils';

// Log position in human hearing range 20 Hz – 20 000 Hz
function centroidToRatio(hz: number): number {
  if (hz <= 0) {
    return 0;
  }
  const lo = Math.log10(20);
  const hi = Math.log10(20000);
  return Math.max(0, Math.min(1, (Math.log10(hz) - lo) / (hi - lo)));
}

function formatCentroid(hz: number): string {
  if (hz <= 0) {
    return '—';
  }
  if (hz >= 1000) {
    return `${(hz / 1000).toFixed(1)} kHz`;
  }
  return `${Math.round(hz)} Hz`;
}

// Map ratio to a color: warm (low/dark) → cool (high/bright)
function centroidColor(ratio: number): string {
  if (ratio < 0.33) {
    return '#E8A84A';
  } // warm amber — dark/bassy
  if (ratio < 0.6) {
    return '#8BA8EE';
  } // blue — mid-range
  return '#A0D0FF'; // light blue — bright
}

interface SpectralCentroidCardProps {
  spectroFrames: SpectroFrames | null;
  sampleRate: number;
}

export function SpectralCentroidCard({ spectroFrames, sampleRate }: SpectralCentroidCardProps) {
  const centroidHz = useMemo(() => {
    if (!spectroFrames) {
      return 0;
    }
    return computeSpectralCentroid(spectroFrames, sampleRate);
  }, [spectroFrames, sampleRate]);

  const ratio = centroidHz > 0 ? centroidToRatio(centroidHz) : null;
  const color = ratio !== null ? centroidColor(ratio) : 'rgba(240,240,248,0.5)';

  return (
    <div className="spectral-centroid-card">
      <div className="spectral-centroid-value" style={{ color }}>
        {formatCentroid(centroidHz)}
      </div>
      <div className="spectral-centroid-track">
        {ratio !== null && (
          <div
            className="spectral-centroid-indicator"
            style={{ left: `${ratio * 100}%`, background: color }}
          />
        )}
      </div>
      <div className="spectral-centroid-range">
        <span>20 Hz</span>
        <span>20 kHz</span>
      </div>
    </div>
  );
}
