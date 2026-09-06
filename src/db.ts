import type { AppData } from './core';
import { EMPTY_DATA } from './core';

const DB_NAME = 'practice-next-card';
const DEMO_DB_NAME = 'demo:practice-next-card';
const STORE = 'app';
export type StorageMode = 'real' | 'demo';

function databaseName(mode: StorageMode): string {
  return mode === 'demo' ? DEMO_DB_NAME : DB_NAME;
}

function openDb(mode: StorageMode): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName(mode), 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local storage.'));
  });
}

export async function loadData(mode: StorageMode = 'real'): Promise<AppData> {
  const db = await openDb(mode);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readonly');
    const request = transaction.objectStore(STORE).get('state');
    request.onsuccess = () => resolve(request.result ?? structuredClone(EMPTY_DATA));
    request.onerror = () => reject(request.error ?? new Error('Could not read your cards.'));
    transaction.oncomplete = () => db.close();
  });
}

export async function saveData(data: AppData, mode: StorageMode = 'real'): Promise<void> {
  const db = await openDb(mode);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(data, 'state');
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error ?? new Error('Could not save your cards.')); };
  });
}

export async function deleteData(mode: StorageMode): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(databaseName(mode));
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Could not clear local storage.'));
    request.onblocked = () => reject(new Error('Close other Practice Next Card tabs, then try again.'));
  });
}
