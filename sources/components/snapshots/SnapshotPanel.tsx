import { useEffect, useRef, useState } from 'react';
import type { SessionSnapshot } from '../../store/snapshots';
import { useAudioLabStore } from '../../store/useAudioLabStore';
import { SnapshotRow } from './SnapshotRow';
import { SnapshotToolbar } from './SnapshotToolbar';

export function SnapshotPanel() {
  const store = useAudioLabStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editingId) {
      inputRef.current?.focus();
    }
  }, [editingId]);
  const startRename = (snapshot: SessionSnapshot) => {
    setEditingId(snapshot.id);
    setEditingName(snapshot.name);
  };
  const commitRename = (id: string) => {
    store.renameSnapshot(id, editingName);
    setEditingId(null);
  };
  return (
    <section className="snapshot-panel" aria-label="Analysis snapshots">
      <SnapshotToolbar
        ab={store.ab}
        save={() => store.saveSnapshot()}
        assign={store.assignAB}
        apply={store.applyAB}
      />
      {store.snapshots.length > 0 && (
        <div className="snapshot-list">
          {store.snapshots.map((snapshot) => (
            <SnapshotRow
              key={snapshot.id}
              snapshot={snapshot}
              editing={editingId === snapshot.id}
              name={editingName}
              inputRef={inputRef}
              setName={setEditingName}
              startRename={() => startRename(snapshot)}
              commitRename={() => commitRename(snapshot.id)}
              cancelRename={() => setEditingId(null)}
              apply={() => store.applySnapshot(snapshot.id)}
              duplicate={() => store.duplicateSnapshot(snapshot.id)}
              remove={() => store.deleteSnapshot(snapshot.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
