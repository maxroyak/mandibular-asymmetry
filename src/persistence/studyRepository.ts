// ── Study Persistence Layer ──────────────────────────────────
// localStorage-based study repository for MVP.
// Architecture allows swapping for a backend API later.

import type {
  LandmarkSet,
  Calibration,
  StudyMeasurements,
  CalibrationDraft,
} from "../domain/types";

export interface StoredStudy {
  studyId: string;
  patientId: string;
  imageDataUrl: string;
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
  save(study: StoredStudy): void;
  remove(studyId: string): void;
  getCurrentStudyId(): string | null;
  setCurrentStudyId(studyId: string | null): void;
}

const STORAGE_KEY = "ma.studies";
const CURRENT_KEY = "ma.currentStudyId";

export class LocalStorageStudyRepository implements StudyRepository {
  getAll(): StoredStudy[] {
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

  getById(studyId: string): StoredStudy | null {
    const all = this.getAll();
    return all.find((s) => s.studyId === studyId) ?? null;
  }

  save(study: StoredStudy): void {
    const all = this.getAll();
    const idx = all.findIndex((s) => s.studyId === study.studyId);
    if (idx >= 0) {
      all[idx] = study;
    } else {
      all.push(study);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  remove(studyId: string): void {
    const all = this.getAll();
    const filtered = all.filter((s) => s.studyId !== studyId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
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
}

export const studyRepository: StudyRepository =
  new LocalStorageStudyRepository();