import { generateRulerTicks } from '../../utils/waveformRuler';

export function WaveformRuler({ duration }: { duration: number }) {
  return (
    <div className="waveform-ruler" aria-hidden="true">
      {generateRulerTicks(duration).map((tick, index) => (
        <div
          key={tick.label + index}
          className={`waveform-ruler-tick${index === 0 ? ' waveform-ruler-tick--first' : ''}`}
          style={{ left: `${tick.ratio * 100}%` }}
        >
          <div className="waveform-ruler-mark" />
          <span className="waveform-ruler-label">{tick.label}</span>
        </div>
      ))}
    </div>
  );
}
