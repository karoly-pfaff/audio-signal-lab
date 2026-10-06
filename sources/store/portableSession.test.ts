import { expect, it } from 'vitest';
import {
  jsonUtf8ByteLength,
  MAX_PORTABLE_FILENAME_LENGTH,
  MAX_PORTABLE_SESSION_BYTES,
  portableFilenameError,
  portableJsonBlob,
  utf8ByteLength,
} from './portableSession';

it('measures UTF-8 bytes and JSON escaping separately', () => {
  expect(utf8ByteLength('\u0800')).toBe(3);
  expect(jsonUtf8ByteLength('\u0800')).toBe(5);
  expect(utf8ByteLength('\u0000')).toBe(1);
  expect(jsonUtf8ByteLength('\u0000')).toBe(8);
});

it('accepts a maximum ordinary filename and rejects a longer one', () => {
  expect(portableFilenameError('\u0800'.repeat(MAX_PORTABLE_FILENAME_LENGTH))).toBeNull();
  expect(portableFilenameError('a'.repeat(MAX_PORTABLE_FILENAME_LENGTH + 1))).toMatch(
    /Filename exceeds/,
  );
});

it('measures the actual downloadable blob against the shared limit', () => {
  const allowed = portableJsonBlob({ content: 'a'.repeat(MAX_PORTABLE_SESSION_BYTES - 100) });
  expect(allowed.size).toBeLessThanOrEqual(MAX_PORTABLE_SESSION_BYTES);
  expect(() => portableJsonBlob({ content: 'a'.repeat(MAX_PORTABLE_SESSION_BYTES) })).toThrow(
    /size limit/,
  );
});
