import { normalizeGaugeValue } from '../../utils/instrumentUtils';
import { DynamicsGaugeSvg } from './DynamicsGaugeSvg';
import { DYNAMICS_ARC_LENGTH, dynamicsGaugeColor, formatDynamicsDb } from './dynamicsGaugeUtils';

interface DynamicsGaugeProps {
  dynamicRangeProxyDb: number | null;
  crestFactorDb: number | null;
}

export function DynamicsGauge({ dynamicRangeProxyDb, crestFactorDb }: DynamicsGaugeProps) {
  const ratio =
    dynamicRangeProxyDb === null ? null : normalizeGaugeValue(dynamicRangeProxyDb, 0, 30);
  const color = ratio === null ? 'rgba(255,255,255,0.12)' : dynamicsGaugeColor(ratio);
  const offset = DYNAMICS_ARC_LENGTH - (ratio ?? 0) * DYNAMICS_ARC_LENGTH;
  return (
    <div className="dynamics-gauge">
      <DynamicsGaugeSvg color={color} offset={offset} ratio={ratio} value={dynamicRangeProxyDb} />
      {crestFactorDb !== null && (
        <div className="dynamics-gauge-crest">
          <span className="dynamics-gauge-crest-label">Crest</span>
          <span className="dynamics-gauge-crest-value">{formatDynamicsDb(crestFactorDb)}</span>
        </div>
      )}
    </div>
  );
}
