import { DynamicsGaugeLabels } from './DynamicsGaugeLabels';
import type { DynamicsGaugeSvgProps } from './dynamicsGaugeTypes';
import { DYNAMICS_ARC_LENGTH, DYNAMICS_ARC_PATH } from './dynamicsGaugeUtils';

export function DynamicsGaugeSvg({ color, offset, ratio, value }: DynamicsGaugeSvgProps) {
  return (
    <svg viewBox="0 0 110 64" aria-hidden="true" className="dynamics-gauge-svg">
      <path
        d={DYNAMICS_ARC_PATH}
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d={DYNAMICS_ARC_PATH}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={DYNAMICS_ARC_LENGTH}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.4s ease' }}
      />
      <DynamicsGaugeLabels ratio={ratio} color={color} value={value} />
    </svg>
  );
}
