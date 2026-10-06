import { it, expect } from 'vitest';
import { MAX_FILE_COUNT, generateFileId } from './persistence';
// Suite: generateFileId
it('returns a non-empty string', () => {
  expect(typeof generateFileId()).toBe('string');
  expect(generateFileId().length).toBeGreaterThan(0);
});
it('two sequential calls return different values', () => {
  expect(generateFileId()).not.toBe(generateFileId());
});
it('generated ids start with "file-"', () => {
  expect(generateFileId().startsWith('file-')).toBe(true);
});
it('generated ids do not collide with fixed numeric ids', () => {
  // generateFileId appends a timestamp+random suffix; it never matches short fixed ids.
  const id = generateFileId();
  for (let i = 0; i < MAX_FILE_COUNT; i++) {
    expect(id).not.toBe(`layer-${i}`);
    expect(id).not.toBe(`file-${i}`);
  }
});
