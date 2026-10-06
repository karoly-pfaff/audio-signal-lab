import { assignDropFiles } from '../utils/dropAssignment';
import type { FileActions } from './audioLabStoreTypes';
import { MAX_FILE_COUNT } from './persistence';
import type { StoreContext } from './storeContext';

function loadOverflowFiles(context: StoreContext, files: File[]): number {
  let skipped = 0;
  for (const file of files) {
    if (context.get().files.length >= MAX_FILE_COUNT) {
      skipped++;
      continue;
    }
    context.get().addFile();
    const currentFiles = context.get().files;
    const newFile = currentFiles[currentFiles.length - 1];
    if (newFile) {
      context.get().loadFile(newFile.id, file);
    }
  }
  return skipped;
}

export function createDropFiles(context: StoreContext): FileActions['dropFiles'] {
  return (files) => {
    const result = assignDropFiles(files, context.get().files);
    result.assignments.forEach(({ fileId, file }) => context.get().loadFile(fileId, file));
    const totalSkipped = result.skipped + loadOverflowFiles(context, result.overflowFiles);
    if (totalSkipped > 0) {
      const suffix = totalSkipped === 1 ? '' : 's';
      context.status.show(
        `${totalSkipped} file${suffix} skipped — not audio or file limit reached`,
        3000,
      );
    }
  };
}
