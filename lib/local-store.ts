const DATABASE_NAME = "bible-vision";
const STORE_NAME = "app";
const STATE_KEY = "state-v2";
const LEGACY_KEY = "bible-vision-state";

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadLocalState<T extends object>(): Promise<Partial<T>> {
  if (typeof window === "undefined") return {};

  try {
    const database = await openDatabase();
    const stored = await new Promise<Partial<T> | undefined>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(STATE_KEY);
      request.onsuccess = () => resolve(request.result as Partial<T> | undefined);
      request.onerror = () => reject(request.error);
    });
    database.close();
    if (stored) return stored;
  } catch {
    // A localStorage fallback keeps the app usable in restrictive browsers.
  }

  try {
    return JSON.parse(localStorage.getItem(LEGACY_KEY) || "{}") as Partial<T>;
  } catch {
    return {};
  }
}

export async function saveLocalState<T extends object>(state: T) {
  if (typeof window === "undefined") return;

  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(state, STATE_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(state));
  }
}

export async function clearLocalState() {
  if (typeof window === "undefined") return;
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(STATE_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  } finally {
    localStorage.removeItem(LEGACY_KEY);
  }
}
