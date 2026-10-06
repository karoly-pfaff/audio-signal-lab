import type { SessionSnapshot } from '../../store/snapshots';

interface SnapshotRowActionsProps {
  snapshot: SessionSnapshot;
  apply: () => void;
  rename: () => void;
  duplicate: () => void;
  remove: () => void;
}

export function SnapshotRowActions({
  snapshot,
  apply,
  rename,
  duplicate,
  remove,
}: SnapshotRowActionsProps) {
  const actions = [
    { icon: '▶', title: 'Apply snapshot', label: `Apply snapshot ${snapshot.name}`, run: apply },
    { icon: '✎', title: 'Rename', label: `Rename snapshot ${snapshot.name}`, run: rename },
    { icon: '⊕', title: 'Duplicate', label: `Duplicate snapshot ${snapshot.name}`, run: duplicate },
    {
      icon: '✕',
      title: 'Delete',
      label: `Delete snapshot ${snapshot.name}`,
      run: remove,
      danger: true,
    },
  ];
  return (
    <div className="snapshot-row-actions">
      {actions.map((action) => (
        <button
          key={action.title}
          className={`snapshot-action-btn${action.danger ? ' snapshot-action-btn--delete' : ''}`}
          onClick={action.run}
          type="button"
          title={action.title}
          aria-label={action.label}
        >
          {action.icon}
        </button>
      ))}
    </div>
  );
}
