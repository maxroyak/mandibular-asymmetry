// ── Study Persistence Layer ──────────────────────────────────
// localStorage-based study metadata + IndexedDB image storage.
// Radiograph images (base64 data URLs) are stored in IndexedDB to avoid
// exceeding the 5–10 MB localStorage limit. localStorage holds only
// lightweight study metadata (landmarks, calibration, measurements).
// Architecture allows swapping for a backend API later.

import type {
  LandmarkSet,
  Calibration,
  StudyMeasurements,
  CalibrationDraft,
} from "../domain/types";
import { saveImage, loadImage, deleteImage, testIndexedDB } from "./imageStore";

// ── Types ───────────────────────────────────────────────────

/**
 * Lightweight study metadata stored in localStorage.
 * The full radiograph image (base64) is stored separately in IndexedDB
 * and referenced by `imageRef` (which equals `studyId`).
 */
export interface StoredStudy {
  studyId: string;
  patientId: string;
  /**
   * In the new format, this field is NOT present in localStorage.
   * Images are stored in IndexedDB, keyed by studyId.
   * During migration, this field may still contain the full base64
   * data URL — the migration function moves it to IndexedDB and
   * removes it from the localStorage record.
   */
  imageDataUrl?: string; // DEPRECATED — only present in legacy data
  imageNaturalWidth: number;
  imageNaturalHeight: number;
  landmarks: LandmarkSet;
  calibration: Calibration | null;
  calibrationPoints: CalibrationDraft | null;
  measurements: StudyMeasurements;
  interpretation: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudyRepository {
  getAll(): StoredStudy[];
  getById(studyId: string): StoredStudy | null;
  /**
   * Save study metadata to localStorage and image to IndexedDB.
   * The imageDataUrl is stored in IndexedDB (not localStorage).
   */
  save(study: StoredStudy, imageDataUrl?: string): Promise<void>;
  /**
   * Delete a study — removes metadata from localStorage and image from IndexedDB.
   */
  remove(studyId: string): Promise<void>;
  /**
   * Load the image data URL for a study from IndexedDB.
   * Returns null if the image is not found or IndexedDB is unavailable.
   */
  getImage(studyId: string): Promise<string | null>;
  getCurrentStudyId(): string | null;
  setCurrentStudyId(studyId: string | null): void;
  /**
   * Migrate any legacy localStorage records that still contain
   * embedded imageDataUrl. Moves images to IndexedDB and strips
   * the field from localStorage. Safe to call multiple times.
   */
  migrateLegacyImages(): Promise<void>;
  /**
   * Last error from a save operation (for UI display).
   */
  getLastError(): string | null;
  clearLastError(): void;
}

// ── Storage keys ────────────────────────────────────────────

const STORAGE_KEY = "ma.studies";
const CURRENT_KEY = "ma.currentStudyId";
const MIGRATED_KEY = "ma.imagesMigrated";

// ── Error tracking ──────────────────────────────────────────

let lastError: string | null = null;

// ── Helper: safe JSON parse of localStorage ─────────────────

function safeGetStorage(): StoredStudy[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as StoredStudy[];
  } catch {
    return [];
  }
}

// ── Helper: safe setItem with quota error handling ──────────

function safeSetStorage(studies: StoredStudy[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(studies));
    return true;
  } catch (e) {
    const err = e as Error;
    if (err.name === "QuotaExceededError" || (err as { code?: number }).code === 22) {
      lastError =
        "Storage limit exceeded. Could not save study. Try deleting old studies or clearing browser data.";
    } else {
      lastError = `Failed to save study: ${err.message ?? "Unknown error"}`;
    }
    return false;
  }
}

// ── Strip imageDataUrl from metadata before storing in localStorage ──

function stripImageMetadata(study: StoredStudy): StoredStudy {
  const { imageDataUrl: _imageDataUrl, ...metadata } = study;
  void _imageDataUrl;
  return metadata as StoredStudy;
}

// ── Implementation ──────────────────────────────────────────

export class LocalStorageStudyRepository implements StudyRepository {
  getAll(): StoredStudy[] {
    return safeGetStorage();
  }

  getById(studyId: string): StoredStudy | null {
    const all = this.getAll();
    return all.find((s) => s.studyId === studyId) ?? null;
  }

  async save(study: StoredStudy, imageDataUrl?: string): Promise<void> {
    // Save image to IndexedDB if provided
    if (imageDataUrl) {
      try {
        const idbOk = await testIndexedDB();
        if (idbOk) {
          await saveImage(study.studyId, imageDataUrl, study.imageNaturalWidth, study.imageNaturalHeight);
        } else {
          // IndexedDB unavailable — keep image in localStorage as fallback
          // This is the legacy behavior; will eventually hit quota but better than losing data
          const all = safeGetStorage();
          const idx = all.findIndex((s) => s.studyId === study.studyId);
          const studyWithImage = { ...study, imageDataUrl };
          if (idx >= 0) {
            all[idx] = studyWithImage;
          } else {
            all.push(studyWithImage);
          }
          if (!safeSetStorage(all)) {
            // Quota exceeded — the lastError is already set
            // Try saving without the image so at least metadata persists
            const stripped = stripImageMetadata(studyWithImage);
            const all2 = safeGetStorage();
            const idx2 = all2.findIndex((s) => s.studyId === study.studyId);
            if (idx2 >= 0) {
              all2[idx2] = stripped;
            } else {
              all2.push(stripped);
            }
            safeSetStorage(all2);
            return;
          }
          return;
        }
      } catch (e) {
        const err = e as Error;
        lastError = `Failed to save image: ${err.message ?? "Unknown error"}`;
        // Still try to save metadata without image
      }
    }

    // Save metadata to localStorage (without the image)
    const all = safeGetStorage();
    const idx = all.findIndex((s) => s.studyId === study.studyId);
    const metadata = stripImageMetadata(study);
    if (idx >= 0) {
      all[idx] = metadata;
    } else {
      all.push(metadata);
    }
    safeSetStorage(all);
  }

  async remove(studyId: string): Promise<void> {
    // Remove from localStorage
    const all = safeGetStorage();
    const filtered = all.filter((s) => s.studyId !== studyId);
    safeSetStorage(filtered);

    // Remove image from IndexedDB
    try {
      const idbOk = await testIndexedDB();
      if (idbOk) {
        await deleteImage(studyId);
      }
    } catch {
      // Best-effort — if IndexedDB delete fails, metadata is already removed
    }
  }

  async getImage(studyId: string): Promise<string | null> {
    // First try IndexedDB
    try {
      const idbOk = await testIndexedDB();
      if (idbOk) {
        const img = await loadImage(studyId);
        if (img) return img.imageDataUrl;
      }
    } catch {
      // Fall through to legacy localStorage check
    }

    // Legacy fallback: check if imageDataUrl is still in localStorage
    const study = this.getById(studyId);
    if (study?.imageDataUrl) {
      // Trigger migration for this study
      try {
        const idbOk = await testIndexedDB();
        if (idbOk) {
          await saveImage(studyId, study.imageDataUrl, study.imageNaturalWidth, study.imageNaturalHeight);
          // Strip image from localStorage after successful migration
          const all = safeGetStorage();
          const idx = all.findIndex((s) => s.studyId === studyId);
          if (idx >= 0) {
            all[idx] = stripImageMetadata(all[idx]);
            safeSetStorage(all);
          }
        }
      } catch {
        // Migration failed — return the legacy data anyway
      }
      return study.imageDataUrl;
    }

    return null;
  }

  getCurrentStudyId(): string | null {
    return localStorage.getItem(CURRENT_KEY);
  }

  setCurrentStudyId(studyId: string | null): void {
    if (studyId === null) {
      localStorage.removeItem(CURRENT_KEY);
    } else {
      localStorage.setItem(CURRENT_KEY, studyId);
    }
  }

  /**
   * Migrate all legacy localStorage records that still contain
   * embedded imageDataUrl. Moves images to IndexedDB and strips
   * the field from localStorage. Safe to call multiple times.
   */
  async migrateLegacyImages(): Promise<void> {
    // Skip if already migrated (and no legacy data remains)
    if (localStorage.getItem(MIGRATED_KEY) === "true") {
      // Quick check: if no study has imageDataUrl, we're done
      const all = safeGetStorage();
      const hasLegacy = all.some((s) => s.imageDataUrl !== undefined && s.imageDataUrl !== null && s.imageDataUrl !== "");
      if (!hasLegacy) return;
    }

    const idbOk = await testIndexedDB();
    if (!idbOk) {
      // IndexedDB not available — can't migrate, keep legacy behavior
      return;
    }

    const all = safeGetStorage();
    let migrated = 0;

    for (const study of all) {
      if (study.imageDataUrl && study.imageDataUrl.length > 0) {
        try {
          await saveImage(study.studyId, study.imageDataUrl, study.imageNaturalWidth, study.imageNaturalHeight);
          migrated++;
        } catch {
          // Continue with next study
        }
      }
    }

    // Strip imageDataUrl from all localStorage records
    const stripped = all.map((s) => stripImageMetadata(s));
    safeSetStorage(stripped);

    if (migrated > 0) {
      // Mark as migrated (some may have failed, but we tried)
      localStorage.setItem(MIGRATED_KEY, "true");
    } else {
      // No images to migrate — mark as done
      localStorage.setItem(MIGRATED_KEY, "true");
    }
  }

  getLastError(): string | null {
    return lastError;
  }

  clearLastError(): void {
    lastError = null;
  }
}

// ── Singleton export ────────────────────────────────────────

export const studyRepository: StudyRepository =
  new LocalStorageStudyRepository();