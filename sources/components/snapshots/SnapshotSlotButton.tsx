import type { SessionSnapshot } from '../../store/snapshots';

interface SnapshotSlotButtonProps {
  slot: 'a' | 'b';
  mode: 'assign' | 'apply';
  value: SessionSnapshot | null;
  action: (slot: 'a' | 'b') => void;
}

export function SnapshotSlotButton({ slot, mode, value, action }: SnapshotSlotButtonProps) {
  const upper = slot.toUpperCase();
  const applying = mode === 'apply';
  const className = applying
    ? `snapshot-btn snapshot-btn--compare${value ? ' snapshot-btn--compare-active' : ''}`
    : `snapshot-btn snapshot-btn--ab${value ? ' snapshot-btn--ab-set' : ''}`;
  const title = applying
    ? value
      ? `Apply snapshot ${upper}`
      : `${upper} slot is empty — assign first`
    : `Assign current session to ${upper}`;
  return (
    <button
      className={className}
      onClick={() => action(slot)}
      type="button"
      title={title}
      aria-label={`${applying ? 'Apply comparison snapshot' : 'Assign current session to comparison slot'} ${upper}`}
      disabled={applying && !value}
    >
      {applying ? upper : `→${upper}`}
    </button>
  );
}
