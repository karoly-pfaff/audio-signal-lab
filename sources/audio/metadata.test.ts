import { describe, it, expect, vi, afterEach } from 'vitest';
import { revokeArtworkUrl } from './metadata';

describe('revokeArtworkUrl', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls revokeObjectURL for blob: URLs', () => {
    const spy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    revokeArtworkUrl('blob:http://localhost/abc-123');
    expect(spy).toHaveBeenCalledWith('blob:http://localhost/abc-123');
  });

  it('does not call revokeObjectURL for https: URLs', () => {
    const spy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    revokeArtworkUrl('https://image.pollinations.ai/prompt/dark-ambient');
    expect(spy).not.toHaveBeenCalled();
  });

  it('handles null without throwing', () => {
    expect(() => revokeArtworkUrl(null)).not.toThrow();
  });

  it('handles empty string without throwing', () => {
    expect(() => revokeArtworkUrl('')).not.toThrow();
  });

  it('does not call revokeObjectURL for empty string', () => {
    const spy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    revokeArtworkUrl('');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('extractMetadata fallback behavior', () => {
  it('returns empty metadata when music-metadata is unavailable', async () => {
    // In the jsdom test environment, music-metadata may fail due to
    // missing ReadableStreamBYOBReader; extractMetadata catches all errors
    // and returns the empty-metadata sentinel.
    const { extractMetadata } = await import('./metadata');
    const file = new File(['not real audio'], 'test.mp3', { type: 'audio/mpeg' });
    const meta = await extractMetadata(file);
    // Should always return an object (never throw)
    expect(meta).toHaveProperty('title');
    expect(meta).toHaveProperty('artist');
    expect(meta).toHaveProperty('album');
    expect(meta).toHaveProperty('artworkUrl');
  });
});
