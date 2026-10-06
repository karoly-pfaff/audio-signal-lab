const SHORTCUTS = [
  { key: 'Space', action: 'Play / Pause' },
  { key: 'Esc', action: 'Stop' },
  { key: 'Home', action: 'Restart from start' },
  { key: '← / →', action: 'Jump ±5 seconds' },
  { key: 'Alt+M', action: 'Master mute toggle' },
  { key: 'Alt+↑ / ↓', action: 'Move file up / down' },
];

interface KeyboardShortcutDialogProps {
  closeRef: React.RefObject<HTMLButtonElement>;
  close: () => void;
}

export function KeyboardShortcutDialog({ closeRef, close }: KeyboardShortcutDialogProps) {
  return (
    <>
      <div className="kb-help-backdrop" onClick={close} aria-hidden="true" />
      <div
        id="keyboard-shortcuts-dialog"
        className="kb-help-popover"
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-shortcuts-title"
      >
        <div className="kb-help-header">
          <h2 id="keyboard-shortcuts-title" className="kb-help-title">
            Keyboard shortcuts
          </h2>
          <button
            ref={closeRef}
            className="kb-help-close"
            type="button"
            onClick={close}
            aria-label="Close keyboard shortcuts"
          >
            ✕
          </button>
        </div>
        <table className="kb-help-table">
          <caption className="visually-hidden">Available keyboard shortcuts</caption>
          <tbody>
            {SHORTCUTS.map(({ key, action }) => (
              <tr key={key}>
                <th scope="row" className="kb-help-key">
                  <kbd>{key}</kbd>
                </th>
                <td className="kb-help-action">{action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
