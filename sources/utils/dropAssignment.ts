import type { FileState } from '../audio/types';

const AUDIO_EXTENSIONS = new Set([
  'mp3',
  'wav',
  'ogg',
  'flac',
  'aac',
  'm4a',
  'opus',
  'weba',
  'webm',
  'aiff',
  'aif',
  'caf',
]);

export function isAudioFile(file: File): boolean {
  if (file.type.startsWith('audio/')) {
    return true;
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return AUDIO_EXTENSIONS.has(ext);
}

export interface DropAssignment {
  fileId: string;
  file: File;
}

// Assigns audio files from a drop event to empty file slots in order position.
// Non-audio files count as skipped. Audio files that exceed empty slots are returned
// in overflowFiles so the caller can create new file entries for them.
export function assignDropFiles(
  files: File[],
  existingFiles: FileState[],
): { assignments: DropAssignment[]; overflowFiles: File[]; skipped: number } {
  const audioFiles = files.filter(isAudioFile);
  const skipped = files.length - audioFiles.length;

  const emptyFiles = existingFiles
    .filter((f) => f.loadingState === 'empty')
    .sort((a, b) => a.order - b.order);

  const assignCount = Math.min(audioFiles.length, emptyFiles.length);
  const assignments: DropAssignment[] = [];
  for (let i = 0; i < assignCount; i++) {
    assignments.push({ fileId: emptyFiles[i]!.id, file: audioFiles[i]! });
  }

  const overflowFiles = audioFiles.slice(assignCount);
  return { assignments, overflowFiles, skipped };
}
