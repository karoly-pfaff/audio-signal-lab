import { DashboardPanel } from './DashboardPanel';

interface DashboardInstrumentProps {
  label: string;
  children: React.ReactNode;
  scroll?: boolean;
}

export function DashboardInstrument({ label, children, scroll = false }: DashboardInstrumentProps) {
  return (
    <DashboardPanel label={label} className="dash-panel--instrument">
      <div
        className={`dash-panel-body ${scroll ? 'dash-panel-body--scroll' : 'dash-panel-body--center'}`}
      >
        {children}
      </div>
    </DashboardPanel>
  );
}
