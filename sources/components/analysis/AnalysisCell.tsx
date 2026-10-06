interface AnalysisCellProps {
  label: string;
  value: string;
  title?: string;
  valueClass?: string;
}

export function AnalysisCell({ label, value, title, valueClass }: AnalysisCellProps) {
  return (
    <div className="analysis-cell" title={title}>
      <span className="analysis-label">{label}</span>
      <span className={valueClass ? `analysis-value ${valueClass}` : 'analysis-value'}>
        {value}
      </span>
    </div>
  );
}
