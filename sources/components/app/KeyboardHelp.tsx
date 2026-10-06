import { useEffect, useRef, useState } from 'react';
import { KeyboardShortcutDialog } from './KeyboardShortcutDialog';

function useDialogFocus(open: boolean, close: () => void) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) {
      return;
    }
    const trigger = triggerRef.current;
    closeRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
      } else if (event.key === 'Tab') {
        event.preventDefault();
        closeRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => {
      window.removeEventListener('keydown', handleKey, true);
      trigger?.focus();
    };
  }, [close, open]);
  return { triggerRef, closeRef };
}

export function KeyboardHelp() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const { triggerRef, closeRef } = useDialogFocus(open, close);
  return (
    <div className="kb-help">
      <button
        ref={triggerRef}
        className={`kb-help-btn${open ? ' kb-help-btn--active' : ''}`}
        onClick={() => setOpen((value) => !value)}
        type="button"
        title="Keyboard shortcuts"
        aria-label="Keyboard shortcuts"
        aria-expanded={open}
        aria-controls="keyboard-shortcuts-dialog"
      >
        ?
      </button>
      {open && <KeyboardShortcutDialog closeRef={closeRef} close={close} />}
    </div>
  );
}
