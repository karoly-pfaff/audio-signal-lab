import { BrandIcon } from './BrandIcon';
import { KeyboardHelp } from './KeyboardHelp';
import { SessionControls } from './SessionControls';

export function AppHeader() {
  return (
    <header className="app-bar">
      <div className="app-bar-brand">
        <BrandIcon />
        <span className="app-bar-brand-name">Audio Signal Lab</span>
        <span className="app-bar-version">v{__APP_VERSION__}</span>
      </div>
      <div className="app-bar-session">
        <SessionControls />
        <KeyboardHelp />
      </div>
    </header>
  );
}
