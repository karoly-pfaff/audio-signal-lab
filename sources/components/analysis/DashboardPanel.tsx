interface DashboardPanelProps {
  label: string;
  className: string;
  children: React.ReactNode;
}

export function DashboardPanel({ label, className, children }: DashboardPanelProps) {
  return (
    <div className={`dash-panel ${className}`}>
      <div className="dash-panel-header">
        <span className="panel-label">{label}</span>
      </div>
      {children}
    </div>
  );
}
