export const DYNAMICS_ARC_RADIUS = 44;
export const DYNAMICS_CENTER_X = 55;
export const DYNAMICS_CENTER_Y = 60;
export const DYNAMICS_ARC_PATH = `M ${DYNAMICS_CENTER_X - DYNAMICS_ARC_RADIUS},${DYNAMICS_CENTER_Y} A ${DYNAMICS_ARC_RADIUS},${DYNAMICS_ARC_RADIUS} 0 0,1 ${DYNAMICS_CENTER_X + DYNAMICS_ARC_RADIUS},${DYNAMICS_CENTER_Y}`;
export const DYNAMICS_ARC_LENGTH = Math.PI * DYNAMICS_ARC_RADIUS;

export function dynamicsGaugeColor(ratio: number): string {
  if (ratio < 0.2) {
    return '#E87070';
  }
  if (ratio < 0.45) {
    return '#E8A84A';
  }
  if (ratio < 0.72) {
    return '#72E8A0';
  }
  return '#8BA8EE';
}

export function formatDynamicsDb(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)} dB`;
}
