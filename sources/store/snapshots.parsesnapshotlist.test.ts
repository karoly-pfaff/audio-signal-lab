import { it, expect } from 'vitest';
import { parseSnapshotList, MAX_SNAPSHOTS } from './snapshots';
// Suite: parseSnapshotList
it('returns empty array for non-array input', () => {
  expect(parseSnapshotList(null)).toEqual([]);
  expect(parseSnapshotList('string')).toEqual([]);
  expect(parseSnapshotList({})).toEqual([]);
});
it('returns empty array for empty array', () => {
  expect(parseSnapshotList([])).toEqual([]);
});
it('parses valid snapshots', () => {
  const raw = [
    {
      id: 'a',
      name: 'Mix A',
      createdAt: '',
      main: {},
      masterVolume: 0.8,
      masterMuted: false,
      layers: [],
    },
    {
      id: 'b',
      name: 'Mix B',
      createdAt: '',
      main: {},
      masterVolume: 0.7,
      masterMuted: false,
      layers: [],
    },
  ];
  const result = parseSnapshotList(raw);
  expect(result).toHaveLength(2);
  expect(result[0].name).toBe('Mix A');
});
it('drops invalid entries', () => {
  const raw = [
    null,
    'string',
    {
      id: 'a',
      name: 'Valid',
      createdAt: '',
      main: {},
      masterVolume: 0.8,
      masterMuted: false,
      layers: [],
    },
  ];
  const result = parseSnapshotList(raw);
  expect(result).toHaveLength(1);
  expect(result[0].name).toBe('Valid');
});
it(`limits list to MAX_SNAPSHOTS (${MAX_SNAPSHOTS})`, () => {
  const raw = Array.from({ length: MAX_SNAPSHOTS + 5 }, (_, i) => ({
    id: `snap-${i}`,
    name: `Snap ${i}`,
    createdAt: '',
    main: {},
    masterVolume: 0.8,
    masterMuted: false,
    layers: [],
  }));
  const result = parseSnapshotList(raw);
  expect(result).toHaveLength(MAX_SNAPSHOTS);
});
