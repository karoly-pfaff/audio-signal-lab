import { it, expect } from 'vitest';
import { applyReorder, reorderTargetFromDrop } from '../utils/layerOrder';
// Suite: applyReorder — pure reorder logic
type Stub = {
  id: string;
  order: number;
  name: string;
  buffer: null;
};
function make(id: string, order: number): Stub {
  return { id, order, name: 'test', buffer: null };
}
it('moves a layer from the start to the end', () => {
  const layers = [make('a', 0), make('b', 1), make('c', 2)];
  const result = applyReorder(layers, 'a', 2);
  expect(result.map((l) => l.id)).toEqual(['b', 'c', 'a']);
  expect(result.map((l) => l.order)).toEqual([0, 1, 2]);
});
it('moves a layer from the end to the start', () => {
  const layers = [make('a', 0), make('b', 1), make('c', 2)];
  const result = applyReorder(layers, 'c', 0);
  expect(result.map((l) => l.id)).toEqual(['c', 'a', 'b']);
  expect(result.map((l) => l.order)).toEqual([0, 1, 2]);
});
it('moves a layer from position 1 to position 3', () => {
  const layers = [make('a', 0), make('b', 1), make('c', 2), make('d', 3)];
  const result = applyReorder(layers, 'b', 3);
  expect(result.map((l) => l.id)).toEqual(['a', 'c', 'd', 'b']);
  expect(result.map((l) => l.order)).toEqual([0, 1, 2, 3]);
});
it('ids are stable after reorder — all original ids present', () => {
  const layers = [make('layer-x', 0), make('layer-y', 1), make('layer-z', 2)];
  const result = applyReorder(layers, 'layer-x', 1);
  const ids = result.map((l) => l.id);
  expect(ids).toContain('layer-x');
  expect(ids).toContain('layer-y');
  expect(ids).toContain('layer-z');
});
it('moved layer gets the target order value', () => {
  const layers = [make('layer-x', 0), make('layer-y', 1), make('layer-z', 2)];
  const result = applyReorder(layers, 'layer-x', 1);
  expect(result.find((l) => l.id === 'layer-x')!.order).toBe(1);
});
it('orders are always compact 0..N-1 after reorder', () => {
  const layers = [make('a', 0), make('b', 1), make('c', 2), make('d', 3)];
  const result = applyReorder(layers, 'b', 3);
  expect(result.map((l) => l.order)).toEqual([0, 1, 2, 3]);
});
it('clamps targetOrder below 0 to position 0', () => {
  const layers = [make('a', 0), make('b', 1), make('c', 2)];
  const result = applyReorder(layers, 'c', -5);
  expect(result[0].id).toBe('c');
  expect(result[0].order).toBe(0);
});
it('clamps targetOrder beyond length-1 to the last position', () => {
  const layers = [make('a', 0), make('b', 1), make('c', 2)];
  const result = applyReorder(layers, 'a', 99);
  expect(result[result.length - 1].id).toBe('a');
  expect(result[result.length - 1].order).toBe(2);
});
it('returns the original array reference when layerId is not found', () => {
  const layers = [make('a', 0), make('b', 1)];
  const result = applyReorder(layers, 'unknown', 0);
  expect(result).toBe(layers);
});
it('does not mutate the original array', () => {
  const layers = [make('a', 0), make('b', 1), make('c', 2)];
  const original = layers.map((l) => ({ ...l }));
  applyReorder(layers, 'a', 2);
  layers.forEach((l, i) => {
    expect(l.id).toBe(original[i].id);
    expect(l.order).toBe(original[i].order);
  });
});
it('preserves non-order fields (name, buffer) after reorder', () => {
  const layers = [make('x', 0), make('y', 1)];
  const result = applyReorder(layers, 'x', 1);
  const moved = result.find((l) => l.id === 'x')!;
  expect(moved.name).toBe('test');
  expect(moved.buffer).toBeNull();
});
it('no-op move (same order) returns compacted array', () => {
  const layers = [make('a', 0), make('b', 1), make('c', 2)];
  const result = applyReorder(layers, 'b', 1);
  expect(result.map((l) => l.id)).toEqual(['a', 'b', 'c']);
  expect(result.map((l) => l.order)).toEqual([0, 1, 2]);
});

it('converts drop positions to post-removal orders in both directions', () => {
  expect(reorderTargetFromDrop(0, 1, true)).toBe(0);
  expect(reorderTargetFromDrop(0, 1, false)).toBe(1);
  expect(reorderTargetFromDrop(1, 3, true)).toBe(2);
  expect(reorderTargetFromDrop(3, 1, false)).toBe(2);
});
