import { it, expect } from 'vitest';
import { parseABSlots } from './snapshots';
// Suite: parseABSlots
it('returns null slots for non-object input', () => {
  expect(parseABSlots(null)).toEqual({ a: null, b: null });
  expect(parseABSlots('string')).toEqual({ a: null, b: null });
});
it('returns null slots for empty object', () => {
  expect(parseABSlots({})).toEqual({ a: null, b: null });
});
it('parses a and b slots', () => {
  const snapRaw = {
    id: 'x',
    name: 'A',
    createdAt: '',
    main: {},
    masterVolume: 0.8,
    masterMuted: false,
    layers: [],
  };
  const result = parseABSlots({ a: snapRaw, b: null });
  expect(result.a).not.toBeNull();
  expect(result.a!.name).toBe('A');
  expect(result.b).toBeNull();
});
it('returns null for invalid slot value', () => {
  const result = parseABSlots({ a: 'invalid', b: 42 });
  // parseSnapshot returns null for non-objects... but 'invalid' is a string, not null
  // parseSnapshot('invalid') returns null
  expect(result.a).toBeNull();
  expect(result.b).toBeNull();
});
