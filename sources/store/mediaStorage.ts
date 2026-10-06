import { audioContentId, blobArrayBuffer } from './mediaStorageHash';

const MEDIA_DATABASE_NAME = 'audio-signal-lab-media';
const DATABASE_VERSION = 1;
const ASSET_STORE = 'assets';

interface AudioAssetRecord {
  id: string;
  type: string;
  bytes: ArrayBuffer;
}

export interface StoredAudioDescriptor {
  name: string;
  lastModified: number;
}

let databasePromise: Promise<IDBDatabase | null> | null = null;
const pendingStores = new Set<Promise<string | null>>();
let mediaWriteRevision = 0;
let mediaEpoch = 0;
let mutationTail: Promise<void> = Promise.resolve();

function enqueueMutation<T>(operation: () => Promise<T>): Promise<T> {
  const result = mutationTail.then(operation, operation);
  mutationTail = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(MEDIA_DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(ASSET_STORE)) {
        request.result.createObjectStore(ASSET_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open media storage'));
  });
}

async function getDatabase(): Promise<IDBDatabase | null> {
  databasePromise ??= openDatabase().catch(() => null);
  return databasePromise;
}

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Media storage request failed'));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Media storage failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Media storage aborted'));
  });
}

async function readRecord(id: string): Promise<AudioAssetRecord | null> {
  const database = await getDatabase();
  if (!database) {
    return null;
  }
  const transaction = database.transaction(ASSET_STORE, 'readonly');
  const completed = transactionComplete(transaction);
  const result = await requestValue(transaction.objectStore(ASSET_STORE).get(id));
  await completed;
  return (result as AudioAssetRecord | undefined) ?? null;
}

async function writeRecord(record: AudioAssetRecord): Promise<boolean> {
  const database = await getDatabase();
  if (!database) {
    return false;
  }
  const transaction = database.transaction(ASSET_STORE, 'readwrite');
  transaction.objectStore(ASSET_STORE).put(record);
  await transactionComplete(transaction);
  return true;
}

async function readAssetIds(): Promise<string[]> {
  const database = await getDatabase();
  if (!database) {
    return [];
  }
  const transaction = database.transaction(ASSET_STORE, 'readonly');
  const completed = transactionComplete(transaction);
  const keys = await requestValue(transaction.objectStore(ASSET_STORE).getAllKeys());
  await completed;
  return keys.filter((key): key is string => typeof key === 'string');
}

async function storeAudioFileOperation(file: File, epoch: number): Promise<string | null> {
  try {
    const bytes = await blobArrayBuffer(file);
    const id = await audioContentId(bytes);
    if (epoch !== mediaEpoch) {
      return null;
    }
    const saved = await enqueueMutation(async () => {
      if (epoch !== mediaEpoch) {
        return false;
      }
      if (await readRecord(id)) {
        return true;
      }
      return writeRecord({
        id,
        type: file.type,
        bytes,
      });
    });
    if (saved) {
      mediaWriteRevision++;
    }
    return saved ? id : null;
  } catch {
    return null;
  }
}

export function storeAudioFile(file: File): Promise<string | null> {
  const operation = storeAudioFileOperation(file, mediaEpoch);
  pendingStores.add(operation);
  void operation.then(
    () => pendingStores.delete(operation),
    () => pendingStores.delete(operation),
  );
  return operation;
}

export async function loadAudioFile(
  id: string,
  descriptor?: StoredAudioDescriptor,
): Promise<File | null> {
  try {
    const record = await readRecord(id);
    if (!record) {
      return null;
    }
    return new File([record.bytes], descriptor?.name || 'audio', {
      type: record.type,
      lastModified: descriptor?.lastModified ?? 0,
    });
  } catch {
    return null;
  }
}

async function waitForPendingStores(): Promise<void> {
  while (pendingStores.size > 0) {
    await Promise.allSettled([...pendingStores]);
  }
  await Promise.resolve();
}

type KeepIdSource = readonly string[] | (() => readonly string[]);

export async function pruneStoredAudio(keepIdSource: KeepIdSource): Promise<void> {
  try {
    await waitForPendingStores();
    const database = await getDatabase();
    if (!database) {
      return;
    }
    const revision = mediaWriteRevision;
    const ids = await readAssetIds();
    if (pendingStores.size > 0 || revision !== mediaWriteRevision) {
      await pruneStoredAudio(keepIdSource);
      return;
    }
    const keepIds = typeof keepIdSource === 'function' ? keepIdSource() : keepIdSource;
    const keep = new Set(keepIds);
    const transaction = database.transaction(ASSET_STORE, 'readwrite');
    ids
      .filter((id) => !keep.has(id))
      .forEach((id) => transaction.objectStore(ASSET_STORE).delete(id));
    await transactionComplete(transaction);
  } catch {
    // Storage cleanup is best effort.
  }
}

export async function clearStoredAudio(): Promise<boolean> {
  mediaEpoch++;
  return enqueueMutation(async () => {
    try {
      const database = await getDatabase();
      if (!database) {
        return false;
      }
      const transaction = database.transaction(ASSET_STORE, 'readwrite');
      transaction.objectStore(ASSET_STORE).clear();
      await transactionComplete(transaction);
      mediaWriteRevision++;
      return true;
    } catch {
      return false;
    }
  });
}

export async function resetMediaStorageForTests(): Promise<void> {
  await waitForPendingStores();
  await mutationTail;
  const pending = databasePromise;
  databasePromise = null;
  mediaWriteRevision = 0;
  mediaEpoch = 0;
  mutationTail = Promise.resolve();
  const database = await pending?.catch(() => null);
  database?.close();
  if (typeof indexedDB === 'undefined') {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(MEDIA_DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Unable to reset media storage'));
  });
}
