import type { SessionSnapshot } from '../../store/snapshots';
import { SnapshotRenameInput } from './SnapshotRenameInput';
import { SnapshotRowActions } from './SnapshotRowActions';

interface SnapshotRowProps {
  snapshot: SessionSnapshot;
  editing: boolean;
  name: string;
  inputRef: React.RefObject<HTMLInputElement>;
  setName: (name: string) => void;
  startRename: () => void;
  commitRename: () => void;
  cancelRename: () => void;
  apply: () => void;
  duplicate: () => void;
  remove: () => void;
}

export function SnapshotRow(props: SnapshotRowProps) {
  return (
    <div className="snapshot-row">
      {props.editing ? (
        <SnapshotRenameInput
          inputRef={props.inputRef}
          name={props.name}
          setName={props.setName}
          commit={props.commitRename}
          cancel={props.cancelRename}
        />
      ) : (
        <span
          className="snapshot-name"
          title={props.snapshot.name}
          onDoubleClick={props.startRename}
        >
          {props.snapshot.name}
        </span>
      )}
      <SnapshotRowActions
        snapshot={props.snapshot}
        apply={props.apply}
        rename={props.startRename}
        duplicate={props.duplicate}
        remove={props.remove}
      />
    </div>
  );
}
