// Web photo store: the checked JPEG bytes in IndexedDB, keyed by SHA-256. Nothing is uploaded from here.
import { bytesToBase64 } from "./bytes";

const DB_NAME = "prepared-home";
const STORE = "photos";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = run(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
    });
  } finally {
    db.close();
  }
}

async function getBytes(sha256: string): Promise<Uint8Array | null> {
  try {
    const value = await withStore<unknown>("readonly", (s) => s.get(sha256));
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (value instanceof Uint8Array) return value;
    return null;
  } catch {
    return null;
  }
}

export async function savePhoto(sha256: string, bytes: Uint8Array): Promise<void> {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  await withStore("readwrite", (s) => s.put(copy.buffer, sha256));
}

export async function loadPhotoBase64(sha256: string): Promise<string | null> {
  const bytes = await getBytes(sha256);
  return bytes ? bytesToBase64(bytes) : null;
}

export async function photoUri(sha256: string): Promise<string | null> {
  const bytes = await getBytes(sha256);
  return bytes ? `data:image/jpeg;base64,${bytesToBase64(bytes)}` : null;
}

export async function clearPhotos(): Promise<void> {
  try {
    await withStore("readwrite", (s) => s.clear());
  } catch {
    // Nothing stored.
  }
}

export async function downloadBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}
