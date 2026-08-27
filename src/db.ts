import type { AppData } from './core';
import { EMPTY_DATA } from './core';

const DB_NAME = 'practice-next-card';
const STORE = 'app';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local storage.'));
  });
}

export async function loadData(): Promise<AppData> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readonly');
    const request = transaction.objectStore(STORE).get('state');
    request.onsuccess = () => resolve(request.result ?? structuredClone(EMPTY_DATA));
    request.onerror = () => reject(request.error ?? new Error('Could not read your cards.'));
    transaction.oncomplete = () => db.close();
  });
}

export async function saveData(data: AppData): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(data, 'state');
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error ?? new Error('Could not save your cards.')); };
  });
}
