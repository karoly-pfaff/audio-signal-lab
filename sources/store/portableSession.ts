export const MAX_PORTABLE_SESSION_BYTES = 8_000_000;
export const MAX_PORTABLE_FILENAME_LENGTH = 255;
export const MAX_PORTABLE_IDENTIFIER_LENGTH = 128;
export const MAX_PORTABLE_TIMESTAMP_LENGTH = 64;
export const MAX_PORTABLE_HASH_LENGTH = 128;
export const MAX_PORTABLE_TIME_SECONDS = Number.MAX_SAFE_INTEGER;

const encoder = new TextEncoder();

export function utf8ByteLength(value: string): number {
  return encoder.encode(value).byteLength;
}

export function jsonUtf8ByteLength(value: unknown): number {
  return utf8ByteLength(JSON.stringify(value));
}

export function isPortableText(value: unknown, maximumLength: number): value is string {
  if (typeof value !== 'string' || value.length > maximumLength) {
    return false;
  }
  // A JSON escape can expand one UTF-16 code unit to six UTF-8 bytes.
  return jsonUtf8ByteLength(value) <= maximumLength * 6 + 2;
}

export function portableFilenameError(filename: string): string | null {
  return isPortableText(filename, MAX_PORTABLE_FILENAME_LENGTH)
    ? null
    : `Filename exceeds the portable session limit (${MAX_PORTABLE_FILENAME_LENGTH} characters)`;
}

export function portableFilename(value: unknown): string | null {
  return isPortableText(value, MAX_PORTABLE_FILENAME_LENGTH) ? value : null;
}

export function portableIdentifier(value: unknown): string | null {
  return isPortableText(value, MAX_PORTABLE_IDENTIFIER_LENGTH) ? value : null;
}

export function portableTimestamp(value: unknown): string | null {
  return isPortableText(value, MAX_PORTABLE_TIMESTAMP_LENGTH) ? value : null;
}

export function suffixedPortableIdentifier(identifier: string, suffix: number): string {
  const ending = `-${suffix}`;
  return `${identifier.slice(0, MAX_PORTABLE_IDENTIFIER_LENGTH - ending.length)}${ending}`;
}

function serializePortableJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function portableJsonBlob(value: unknown): Blob {
  const blob = new Blob([serializePortableJson(value)], { type: 'application/json' });
  if (blob.size > MAX_PORTABLE_SESSION_BYTES) {
    throw new Error('Portable session exceeds its size limit');
  }
  return blob;
}
