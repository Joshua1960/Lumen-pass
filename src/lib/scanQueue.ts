/**
 * Offline fallback queue for the verification portal (IndexedDB).
 * When the door loses connectivity, scanned QR payloads are stored locally
 * and pushed to the server (`/api/scan/batch`) once the connection returns.
 */

export interface QueuedScan {
  key: number; // auto-increment id
  eventId: number;
  token: string;
  at: string; // ISO timestamp of the physical scan
}

const DB_NAME = "lumen-door";
const DB_VERSION = 1;
const STORE = "scan-queue";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "key", autoIncrement: true });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB unavailable"));
    } catch (err) {
      reject(err instanceof Error ? err : new Error("IndexedDB unavailable"));
    }
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let result: T | void;
    try {
      const req = fn(store) as IDBRequest<T> | void;
      if (req && "onsuccess" in req) {
        (req as IDBRequest<T>).onsuccess = () => {
          result = (req as IDBRequest<T>).result;
        };
        (req as IDBRequest<T>).onerror = () => reject((req as IDBRequest<T>).error);
      }
    } catch (err) {
      db.close();
      reject(err);
      return;
    }
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("Queue transaction failed"));
    };
  });
}

export async function queueScan(eventId: number, token: string): Promise<number> {
  const entry = { eventId, token: token.trim(), at: new Date().toISOString() };
  const db = await openDb();
  const key = await new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).add(entry);
    req.onsuccess = () => resolve(Number(req.result));
    req.onerror = () => reject(req.error ?? new Error("Queue write failed"));
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("Queue transaction failed"));
    };
  });
  try {
    window.dispatchEvent(new CustomEvent("lumen:queue", { detail: { pending: -1 } }));
  } catch {
    /* noop */
  }
  return key;
}

export async function listQueued(eventId?: number): Promise<QueuedScan[]> {
  const all = (await withStore<QueuedScan[]>("readonly", (s) =>
    s.getAll(),
  )) as QueuedScan[];
  const rows = Array.isArray(all) ? all : [];
  return typeof eventId === "number" ? rows.filter((r) => r.eventId === eventId) : rows;
}

export async function countQueued(eventId?: number): Promise<number> {
  return (await listQueued(eventId)).length;
}

export async function clearQueued(keys: number[]): Promise<void> {
  if (!keys.length) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    for (const k of keys) {
      try {
        store.delete(k);
      } catch {
        /* keep going */
      }
    }
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("Queue clear failed"));
    };
  });
  try {
    window.dispatchEvent(new CustomEvent("lumen:queue", { detail: { pending: -1 } }));
  } catch {
    /* noop */
  }
}

export function idbAvailable(): boolean {
  try {
    return typeof indexedDB !== "undefined";
  } catch {
    return false;
  }
}
