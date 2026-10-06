import { webcrypto } from 'node:crypto';
import { IDBFactory } from 'fake-indexeddb';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { blobArrayBuffer, audioContentId } from './mediaStorageHash';
import {
  clearStoredAudio,
  loadAudioFile,
  pruneStoredAudio,
  resetMediaStorageForTests,
  storeAudioFile,
} from './mediaStorage';

beforeAll(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.stubGlobal('crypto', webcrypto);
});

afterEach(async () => {
  await resetMediaStorageForTests();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

it('hashes bytes and uses Blob.arrayBuffer when available', async () => {
  const bytes = new TextEncoder().encode('abc').buffer;
  const blob = { arrayBuffer: vi.fn(async () => bytes) } as unknown as Blob;
  expect(await blobArrayBuffer(blob)).toBe(bytes);
  expect(await audioContentId(bytes)).toBe(
    'sha256-ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  );
});

it('stores content once and restores it with the requested display name', async () => {
  const first = new File(['same audio'], 'first.wav', { type: 'audio/wav', lastModified: 12 });
  const second = new File(['same audio'], 'second.wav', { type: 'audio/wav', lastModified: 34 });
  const firstId = await storeAudioFile(first);
  const secondId = await storeAudioFile(second);

  expect(firstId).toMatch(/^sha256-[a-f0-9]{64}$/);
  expect(secondId).toBe(firstId);
  const restoredFirst = await loadAudioFile(firstId!, {
    name: first.name,
    lastModified: first.lastModified,
  });
  const restoredSecond = await loadAudioFile(secondId!, {
    name: second.name,
    lastModified: second.lastModified,
  });
  expect(restoredFirst).toMatchObject({ name: 'first.wav', type: 'audio/wav', lastModified: 12 });
  expect(restoredSecond).toMatchObject({ name: 'second.wav', lastModified: 34 });
  expect(new TextDecoder().decode(await blobArrayBuffer(restoredFirst!))).toBe('same audio');
});

it('prunes unreferenced assets and clears the remaining records', async () => {
  const keep = await storeAudioFile(new File(['keep'], 'keep.wav'));
  const remove = await storeAudioFile(new File(['remove'], 'remove.wav'));
  await pruneStoredAudio([keep!]);

  expect(await loadAudioFile(keep!)).not.toBeNull();
  expect(await loadAudioFile(remove!)).toBeNull();
  expect(await clearStoredAudio()).toBe(true);
  expect(await loadAudioFile(keep!)).toBeNull();
});

it('does not prune files being stored concurrently', async () => {
  const referencedIds: string[] = [];
  const files = ['first', 'second', 'third'].map(
    (name) => new File([name], `${name}.wav`, { type: 'audio/wav' }),
  );
  const ids = await Promise.all(
    files.map(async (file) => {
      const id = await storeAudioFile(file);
      if (id) {
        referencedIds.push(id);
      }
      await pruneStoredAudio(() => referencedIds);
      return id;
    }),
  );

  const restored = await Promise.all(ids.map((id) => loadAudioFile(id!)));
  expect(restored.every(Boolean)).toBe(true);
});

it('invalidates a delayed store before reset and does not resurrect cleared audio', async () => {
  const bytes = new TextEncoder().encode('private audio').buffer;
  let release: (value: ArrayBuffer) => void = () => {};
  const delayedFile = {
    name: 'private.wav',
    type: 'audio/wav',
    lastModified: 1,
    arrayBuffer: () => new Promise<ArrayBuffer>((resolve) => (release = resolve)),
  } as File;

  const pendingStore = storeAudioFile(delayedFile);
  const pendingClear = clearStoredAudio();
  release(bytes);

  expect(await pendingClear).toBe(true);
  expect(await pendingStore).toBeNull();
  expect(await loadAudioFile(await audioContentId(bytes))).toBeNull();
});

it('degrades safely when hashing or IndexedDB is unavailable', async () => {
  vi.stubGlobal('crypto', {});
  expect(await storeAudioFile(new File(['audio'], 'track.wav'))).toBeNull();
  vi.stubGlobal('crypto', webcrypto);
  await resetMediaStorageForTests();
  vi.stubGlobal('indexedDB', undefined);

  expect(await storeAudioFile(new File(['audio'], 'track.wav'))).toBeNull();
  expect(await loadAudioFile('missing')).toBeNull();
  await pruneStoredAudio([]);
  expect(await clearStoredAudio()).toBe(false);
  await resetMediaStorageForTests();
});

it('rejects direct hashing when Web Crypto is absent', async () => {
  vi.stubGlobal('crypto', undefined);
  await expect(audioContentId(new ArrayBuffer(0))).rejects.toThrow('Secure hashing is unavailable');
});
