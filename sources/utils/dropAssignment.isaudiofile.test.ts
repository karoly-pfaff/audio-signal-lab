import { it, expect } from 'vitest';
import { isAudioFile } from './dropAssignment';
function makeFile(name: string, type = ''): File {
  return new File([''], name, { type });
}
// Suite: isAudioFile
it('accepts file with audio/ MIME type', () => {
  expect(isAudioFile(makeFile('track.mp3', 'audio/mpeg'))).toBe(true);
});
it('accepts file with audio/* MIME type variants', () => {
  expect(isAudioFile(makeFile('loop.wav', 'audio/wav'))).toBe(true);
  expect(isAudioFile(makeFile('loop.ogg', 'audio/ogg'))).toBe(true);
});
it('accepts file by extension when MIME is empty', () => {
  expect(isAudioFile(makeFile('beat.mp3'))).toBe(true);
  expect(isAudioFile(makeFile('sample.flac'))).toBe(true);
  expect(isAudioFile(makeFile('loop.wav'))).toBe(true);
  expect(isAudioFile(makeFile('stem.m4a'))).toBe(true);
  expect(isAudioFile(makeFile('drone.aiff'))).toBe(true);
});
it('rejects image files', () => {
  expect(isAudioFile(makeFile('photo.jpg', 'image/jpeg'))).toBe(false);
  expect(isAudioFile(makeFile('icon.png', 'image/png'))).toBe(false);
});
it('rejects text files', () => {
  expect(isAudioFile(makeFile('readme.txt', 'text/plain'))).toBe(false);
});
it('rejects files with no extension and no MIME', () => {
  expect(isAudioFile(makeFile('noext'))).toBe(false);
});
it('is case-insensitive for extensions', () => {
  expect(isAudioFile(makeFile('TRACK.MP3'))).toBe(true);
  expect(isAudioFile(makeFile('loop.WAV'))).toBe(true);
});
