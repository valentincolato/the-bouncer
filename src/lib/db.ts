export const DB_NAME = 'RestaurantBouncerDB';
export const STORE_NAME = 'characterImages';
export const DB_VERSION = 1;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('archetype', 'archetype', { unique: false });
      }
    };
  });
}

export async function saveImage(archetype: string, imageUrl: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add({ archetype, imageUrl, timestamp: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to save image to DB', e);
  }
}

export async function getRandomImageByArchetype(archetype: string): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('archetype');
      const request = index.getAll(archetype);

      request.onsuccess = () => {
        const results = request.result;
        if (results && results.length > 0) {
          const randomItem = results[Math.floor(Math.random() * results.length)];
          resolve(randomItem.imageUrl);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to get image from DB', e);
    return null;
  }
}

export async function getRandomImage(): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result;
        if (results && results.length > 0) {
          const randomItem = results[Math.floor(Math.random() * results.length)];
          resolve(randomItem.imageUrl);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to get random image from DB', e);
    return null;
  }
}
