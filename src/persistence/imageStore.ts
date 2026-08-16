// ── IndexedDB Image Store ───────────────────────────────────
// Stores radiograph images (base64 data URLs) in IndexedDB to avoid
// exceeding the 5–10 MB localStorage limit. localStorage is reserved for
// lightweight study metadata (landmarks, calibration, measurements).
//
// Architecture allows swapping for a backend API later.

const DB_NAME = "mandibular-asymmetry";
const DB_VERSION = 1;
const STORE_NAME = "images";

// ── Types ───────────────────────────────────────────────────

export interface StoredImage {
  studyId: string;
  imageDataUrl: string;
  width: number;
  height: number;
}

// ── IndexedDB availability check ────────────────────────────

function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

// ── Database connection (lazy, cached) ──────────────────────

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (!isIndexedDBAvailable()) {
    return Promise.reject(new Error("IndexedDB is not available in this environment"));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "studyId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
  });

  return dbPromise;
}

// ── Public API ──────────────────────────────────────────────

/**
 * Save an image (base64 data URL) to IndexedDB, keyed by studyId.
 * Overwrites any existing image for the same studyId.
 */
export async function saveImage(
  studyId: string,
  imageDataUrl: string,
  width: number,
  height: number
): Promise<void> {
  const db = await getDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const record: StoredImage = { studyId, imageDataUrl, width, height };
    store.put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to save image to IndexedDB"));
    tx.onabort = () => reject(tx.error ?? new Error("Image save transaction aborted"));
  });
}

/**
 * Load an image (base64 data URL) from IndexedDB by studyId.
 * Returns null if no image is found.
 */
export async function loadImage(studyId: string): Promise<StoredImage | null> {
  const db = await getDB();
  return new Promise<StoredImage | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(studyId);
    request.onsuccess = () => {
      resolve(request.result ?? null);
    };
    request.onerror = () => reject(request.error ?? new Error("Failed to load image from IndexedDB"));
  });
}

/**
 * Delete an image from IndexedDB by studyId.
 * No-op if the image does not exist.
 */
export async function deleteImage(studyId: string): Promise<void> {
  const db = await getDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(studyId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to delete image from IndexedDB"));
  });
}

/**
 * Check whether IndexedDB is available and usable in the current environment.
 * Used by the migration logic and the studyRepository to decide fallback behavior.
 */
export function hasIndexedDB(): boolean {
  return isIndexedDBAvailable();
}

/**
 * Test that we can actually open a connection to IndexedDB.
 * Used during migration to verify functionality before moving data.
 */
export async function testIndexedDB(): Promise<boolean> {
  try {
    await getDB();
    return true;
  } catch {
    return false;
  }
}