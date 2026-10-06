interface SliderProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  unit?: string;
  className?: string;
  showLabel?: boolean;
}

function formatSliderValue(value: number, unit: string) {
  if (unit === 'dB') {
    return value === 0 ? '-∞' : `${(20 * Math.log10(value)).toFixed(1)} dB`;
  }
  if (unit === 'L/R') {
    if (value === 0) {
      return 'C';
    }
    return value < 0 ? `L${Math.abs(Math.round(value * 100))}` : `R${Math.round(value * 100)}`;
  }
  return `${Math.round(value * 100)}%`;
}

export function Slider({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  unit = '',
  className = '',
  showLabel = true,
}: SliderProps) {
  const displayValue = formatSliderValue(value, unit);
  return (
    <div className={`slider-group ${className}`}>
      <label className="slider-label">
        {showLabel && <span className="slider-label-text">{label}</span>}
        <span className="slider-value">{displayValue}</span>
      </label>
      <input
        type="range"
        className="slider"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label ? `${label} (${displayValue})` : displayValue}
        onChange={(event) => onChange(Number.parseFloat(event.target.value))}
      />
    </div>
  );
}
