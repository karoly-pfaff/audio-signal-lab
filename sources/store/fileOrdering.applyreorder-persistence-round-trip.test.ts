import { it, expect } from 'vitest';
import { applyReorder } from '../utils/layerOrder';
import { defaultSession, parseSessionBody } from './persistence';
// Suite: applyReorder — persistence round-trip
function persistedFile(order: number) {
  return {
    id: `file-${order}`,
    order,
    volume: 1,
    filename: null,
    thumbnailUrl: null,
    bpm: null,
    bpmConfidence: null,
  };
}

it('serialized and re-parsed session preserves reordered file order', () => {
  const session = defaultSession();
  session.files = Array.from({ length: 5 }, (_, order) => persistedFile(order));
  // Move file-0 to position 2
  session.files = applyReorder(session.files, 'file-0', 2);
  const serialized = JSON.parse(JSON.stringify(session)) as Record<string, unknown>;
  const parsed = parseSessionBody(serialized);
  expect(parsed.files).toHaveLength(5);
  expect(parsed.files[0].id).toBe('file-1');
  expect(parsed.files[1].id).toBe('file-2');
  expect(parsed.files[2].id).toBe('file-0');
  expect(parsed.files[3].id).toBe('file-3');
  expect(parsed.files[4].id).toBe('file-4');
});
it('orders are compact 0..N-1 after round-trip', () => {
  const session = defaultSession();
  session.files = applyReorder(session.files, 'layer-4', 0);
  const serialized = JSON.parse(JSON.stringify(session)) as Record<string, unknown>;
  const parsed = parseSessionBody(serialized);
  parsed.files.forEach((l, i) => {
    expect(l.order).toBe(i);
  });
});
