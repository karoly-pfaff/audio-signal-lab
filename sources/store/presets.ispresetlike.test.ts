import { it, expect } from 'vitest';
import { serializePreset, isPresetLike } from './presets';
import { defaultSession } from './persistence';
// Suite: isPresetLike
it('returns true for a valid preset-shaped object', () => {
  const preset = serializePreset(defaultSession());
  expect(isPresetLike(preset)).toBe(true);
});
it('returns false for null', () => {
  expect(isPresetLike(null)).toBe(false);
});
it('returns false for non-object primitives', () => {
  expect(isPresetLike('string')).toBe(false);
  expect(isPresetLike(42)).toBe(false);
});
it('returns false when schema field is missing', () => {
  expect(isPresetLike({ version: 2 })).toBe(false);
});
it('returns false for wrong schema name', () => {
  expect(isPresetLike({ schema: 'other-app', version: 2 })).toBe(false);
});
