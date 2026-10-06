import type { SnapshotActions } from '../../store/audioLabStoreTypes';
import type { ABSlots } from '../../store/snapshots';
import { SnapshotSlotButton } from './SnapshotSlotButton';

interface SnapshotToolbarProps {
  ab: ABSlots;
  save: () => void;
  assign: SnapshotActions['assignAB'];
  apply: SnapshotActions['applyAB'];
}

export function SnapshotToolbar({ ab, save, assign, apply }: SnapshotToolbarProps) {
  return (
    <div className="snapshot-toolbar">
      <span className="panel-label">SNAPSHOTS</span>
      <button
        className="snapshot-btn"
        onClick={save}
        type="button"
        title="Save current session as a snapshot"
        aria-label="Save current session as a snapshot"
      >
        Save
      </button>
      <span className="snapshot-toolbar-sep" aria-hidden="true" />
      <SnapshotSlotButton slot="a" mode="assign" value={ab.a} action={assign} />
      <SnapshotSlotButton slot="b" mode="assign" value={ab.b} action={assign} />
      <SnapshotSlotButton slot="a" mode="apply" value={ab.a} action={apply} />
      <SnapshotSlotButton slot="b" mode="apply" value={ab.b} action={apply} />
    </div>
  );
}
