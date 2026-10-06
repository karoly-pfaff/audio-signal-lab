import type { DynamicsGaugeSvgProps } from './dynamicsGaugeTypes';
import {
  DYNAMICS_ARC_RADIUS,
  DYNAMICS_CENTER_X,
  DYNAMICS_CENTER_Y,
  formatDynamicsDb,
} from './dynamicsGaugeUtils';

type DynamicsGaugeLabelsProps = Pick<DynamicsGaugeSvgProps, 'ratio' | 'color' | 'value'>;
const MUTED_TEXT = 'rgba(240,240,248,0.5)';

export function DynamicsGaugeLabels({ ratio, color, value }: DynamicsGaugeLabelsProps) {
  return (
    <>
      <text
        x={DYNAMICS_CENTER_X}
        y={DYNAMICS_CENTER_Y - 10}
        textAnchor="middle"
        fontSize="14"
        fontFamily="IBM Plex Mono, monospace"
        fontWeight="500"
        fill={ratio !== null ? color : MUTED_TEXT}
      >
        {formatDynamicsDb(value)}
      </text>
      <text
        x={DYNAMICS_CENTER_X}
        y={DYNAMICS_CENTER_Y + 2}
        textAnchor="middle"
        fontSize="7"
        fontFamily="IBM Plex Mono, monospace"
        fill={MUTED_TEXT}
      >
        DR PROXY
      </text>
      <text
        x={DYNAMICS_CENTER_X - DYNAMICS_ARC_RADIUS + 2}
        y={DYNAMICS_CENTER_Y + 12}
        fontSize="7"
        fontFamily="monospace"
        fill={MUTED_TEXT}
        textAnchor="middle"
      >
        0
      </text>
      <text
        x={DYNAMICS_CENTER_X + DYNAMICS_ARC_RADIUS - 2}
        y={DYNAMICS_CENTER_Y + 12}
        fontSize="7"
        fontFamily="monospace"
        fill={MUTED_TEXT}
        textAnchor="middle"
      >
        30
      </text>
    </>
  );
}
