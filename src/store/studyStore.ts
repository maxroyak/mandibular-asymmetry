// ── Zustand Study Store ──────────────────────────────────────
// Central state management. All landmark mutations trigger immediate recalculation.
// No manual "Recalculate" button — recalculation is automatic.

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import {
  calculateDistance,
  calculateSideDifference,
  calculateRelativeDifference,
  calculateAsymmetryIndex,
  determineLargerSide,
  generateClinicalSummary,
  calculateDifferenceMm,
  determineLongerSide,
  determineShorterSide,
  generateMandibularAsymmetryConclusion,
} from "../domain/mandibularAsymmetry";
import type {
  Point,
  LandmarkName,
  LandmarkSet,
  Calibration,
  CalibrationDraft,
  CalibrationStage,
  StudyMeasurements,
  MeasurementResult,
  BilateralMeasurement,
  MandibularAsymmetryResult,
  ImageFilterState,
  FilterPresetType,
} from "../domain/types";
import {
  createDefaultFilters,
  applyFilterPreset,
} from "../domain/imageFilters";
import type { Locale } from "../locales/types";
import {
  studyRepository,
  type StoredStudy,
} from "../persistence/studyRepository";
import { detectMandibularLandmarks } from "../domain/ai/landmarkDetector";

function getInitialLanguage(): Locale {
  try {
    const stored = localStorage.getItem("ma.language");
    if (stored === "ru" || stored === "en") return stored;
  } catch {
    // localStorage unavailable (e.g. test environments)
  }
  return "en";
}

// ── Store State ─────────────────────────────────────────────

interface ViewerState {
  zoom: number;
  panX: number;
  panY: number;
  brightness: number;
  contrast: number;
}

interface StudyState {
  // Study metadata
  studyId: string | null;
  patientId: string;
  createdAt: string;
  updatedAt: string;

  // Image
  imageDataUrl: string | null;
  imageNaturalWidth: number;
  imageNaturalHeight: number;

  // Landmarks (normalized 0.0–1.0)
  landmarks: LandmarkSet;
  activeLandmark: LandmarkName | null;

  // Calibration
  calibration: Calibration | null;
  calibrationPoints: CalibrationDraft | null;
  calibrationMode: "A" | "B";
  calibrationRealDistanceMm: number;
  calibrationStage: CalibrationStage; // explicit state machine for calibration workflow
  previousCalibration: { calibration: Calibration | null; calibrationMode: "A" | "B"; calibrationRealDistanceMm: number } | null;

  // Computed measurements
  measurements: StudyMeasurements | null;
  interpretation: string;
  mandibularResult: MandibularAsymmetryResult | null;

  // Image viewer transform
  viewer: ViewerState;

  // Radiograph image filters
  filters: ImageFilterState;

  // Persistence status
  isSaved: boolean;
  hoveredLine: string | null;

  // Language / i18n
  language: Locale;

  // AI-assisted landmark detection
  isAiDetecting: boolean;
  aiCandidateLandmarks: Partial<Record<LandmarkName, boolean>>;

  // Study list
  studyList: StoredStudy[];
}

interface StudyActions {
  // Language
  setLanguage: (lang: Locale) => void;

  // AI-assisted landmark detection
  detectLandmarksAi: () => Promise<void>;
  acceptAllAiProposals: () => void;
  clearAiProposals: () => void;

  // Study lifecycle
  createStudy: (
    patientId: string,
    imageDataUrl: string,
    width: number,
    height: number,
    initialCalibration?: Calibration | null
  ) => void;
  loadStudy: (studyId: string) => Promise<void>;
  /**
   * Auto-load the last active study on app startup.
   * Reads `ma.currentStudyId` from localStorage; if set, loads that study
   * (metadata from localStorage + image from IndexedDB). No-op if no current
   * study is set or the study no longer exists. Safe to call multiple times.
   */
  loadCurrentStudy: () => Promise<void>;
  saveStudy: () => Promise<void>;
  deleteStudy: (studyId: string) => Promise<void>;
  refreshStudyList: () => void;
  newStudy: () => void;
  /** Migrate legacy localStorage records with embedded images to IndexedDB */
  migrateLegacyImages: () => Promise<void>;
  /** Get last persistence error (for UI display) */
  getPersistenceError: () => string | null;
  clearPersistenceError: () => void;

  // Landmark operations
  setLandmark: (name: LandmarkName, point: Point) => void;
  moveLandmark: (name: LandmarkName, point: Point) => void;
  deleteLandmark: (name: LandmarkName) => void;
  setActiveLandmark: (name: LandmarkName | null) => void;
  clearActiveLandmark: () => void;

  // Calibration (state machine driven)
  setCalibrationRealDistance: (mm: number) => void;
  clearCalibration: () => void;
  startCalibration: () => void;
  cancelCalibration: () => void;
  placeCalibrationPoint: (point: Point) => void;
  confirmPoint1: () => void;
  confirmPoint2: () => void;
  resetPoint1: () => void;
  resetPoint2: () => void;
  confirmCalibration: (knownDistanceMm: number) => void;
  moveCalibrationPoint: (which: 1 | 2, point: Point) => void;
  goBackCalibration: () => void;

  // Radiograph Image Filters
  setImageFilters: (partial: Partial<ImageFilterState>) => void;
  resetImageFilters: () => void;
  setFilterPreset: (preset: FilterPresetType) => void;

  // Viewer transform
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setBrightness: (value: number) => void;
  setContrast: (value: number) => void;
  resetViewer: () => void;
  fitToScreen: () => void;

  // Hover state
  setHoveredLine: (line: string | null) => void;

  // Internal
  recalculate: () => void;
}

type Store = StudyState & StudyActions;

// ── Default viewer ───────────────────────────────────────────
const defaultViewer: ViewerState = {
  zoom: 1,
  panX: 0,
  panY: 0,
  brightness: 1,
  contrast: 1,
};

// ── Store-level measurement orchestration ───────────────────
// This is NOT a domain function — it sequences domain function calls.
// All clinical logic lives in the 7 pure domain functions.

function computeSingleMeasurement(
  rightA: Point | undefined,
  rightB: Point | undefined,
  leftA: Point | undefined,
  leftB: Point | undefined,
  calibration: Calibration | null,
  imageWidth: number,
  imageHeight: number,
  _isHorizontal: boolean
): MeasurementResult | null {
  if (!rightA || !rightB || !leftA || !leftB) return null;

  const rightNorm = calculateDistance(rightA, rightB);
  const leftNorm = calculateDistance(leftA, leftB);

  const habets = calculateAsymmetryIndex(rightNorm, leftNorm);
  const relDiff = calculateRelativeDifference(rightNorm, leftNorm);
  const larger = determineLargerSide(rightNorm, leftNorm);
  // 3-tier classification system removed per PIBot threshold validation.
  // Classification is always null for all measurements.
  const tier = null;
  const diff = calculateSideDifference(rightNorm, leftNorm);

  // Calibrated: convert to mm
  // Convert normalized → image pixels (using both dimensions for correct Euclidean)
  // Then pixels → mm via mmPerPixel
  // Full floating-point precision stored — display layer uses toFixed(1)
  let rightMm: number | null = null;
  let leftMm: number | null = null;
  if (calibration) {
    const rightPx = rightNorm * Math.max(imageWidth, imageHeight);
    const leftPx = leftNorm * Math.max(imageWidth, imageHeight);
    rightMm = rightPx * calibration.mmPerPixel;
    leftMm = leftPx * calibration.mmPerPixel;
  }

  return {
    right: rightNorm,
    left: leftNorm,
    difference: diff.difference,
    absoluteDifference: diff.absoluteDifference,
    relativeDifferencePercent: relDiff,
    asymmetryIndexPercent: habets,
    largerSide: larger,
    classification: tier,
    rightMm,
    leftMm,
  };
}

function computeMeasurements(
  landmarks: LandmarkSet,
  calibration: Calibration | null,
  imageWidth: number,
  imageHeight: number
): StudyMeasurements {
  // Ramus height: CoR→GoR (right), CoL→GoL (left) — vertical measurement
  const ramusHeight = computeSingleMeasurement(
    landmarks.CoR,
    landmarks.GoR,
    landmarks.CoL,
    landmarks.GoL,
    calibration,
    imageWidth,
    imageHeight,
    false // isHorizontal = false — vertical measurement, apply classification
  );

  // Body length: GoR→Me (right), GoL→Me (left) — horizontal measurement
  const bodyLength = computeSingleMeasurement(
    landmarks.GoR,
    landmarks.Me,
    landmarks.GoL,
    landmarks.Me,
    calibration,
    imageWidth,
    imageHeight,
    true // isHorizontal = true — horizontal measurement, no classification
  );

  return { ramusHeight, bodyLength };
}

// ── Bilateral mm result computation (Part 2) ───────────────
// Builds BilateralMeasurement objects from MeasurementResult mm values
// and generates the clinical conclusion. Returns null when mm values
// are unavailable (uncalibrated) or landmarks incomplete.

function buildBilateralMeasurement(
  result: MeasurementResult | null
): BilateralMeasurement | null {
  if (!result || result.rightMm === null || result.leftMm === null) return null;
  const rightMm = result.rightMm;
  const leftMm = result.leftMm;
  return {
    rightMm,
    leftMm,
    differenceMm: calculateDifferenceMm(rightMm, leftMm),
    absoluteDifferenceMm: Math.abs(rightMm - leftMm),
    longerSide: determineLongerSide(rightMm, leftMm),
    shorterSide: determineShorterSide(rightMm, leftMm),
    relativeDifferencePercent: result.relativeDifferencePercent,
    asymmetryIndexPercent: result.asymmetryIndexPercent,
  };
}

function computeMandibularResult(
  measurements: StudyMeasurements,
  locale: Locale = "en"
): MandibularAsymmetryResult | null {
  const ramus = buildBilateralMeasurement(measurements.ramusHeight);
  const body = buildBilateralMeasurement(measurements.bodyLength);
  if (!ramus || !body) return null;
  const conclusion = generateMandibularAsymmetryConclusion(
    ramus.rightMm,
    ramus.leftMm,
    body.rightMm,
    body.leftMm,
    locale
  );
  return { ramus, body, conclusion };
}

// ── Debounced save ──────────────────────────────────────────
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    useStudyStore.getState().saveStudy();
  }, 500);
}

// ── Store ───────────────────────────────────────────────────
export const useStudyStore = create<Store>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    studyId: null,
    patientId: "",
    createdAt: "",
    updatedAt: "",
    imageDataUrl: null,
    imageNaturalWidth: 0,
    imageNaturalHeight: 0,
    landmarks: {},
    activeLandmark: null,
    calibration: null,
    calibrationPoints: null,
    calibrationMode: "A",
    calibrationRealDistanceMm: 0,
    calibrationStage: "idle",
    previousCalibration: null,
    measurements: null,
    interpretation: "",
    mandibularResult: null,
    viewer: { ...defaultViewer },
    filters: createDefaultFilters(),
    isSaved: false,
    hoveredLine: null,
    language: getInitialLanguage(),
    isAiDetecting: false,
    aiCandidateLandmarks: {},
    studyList: [],

    // ── Language ──
    setLanguage: (lang: Locale) => {
      try {
        localStorage.setItem("ma.language", lang);
      } catch {
        // ignore in test/restricted environments
      }
      set({ language: lang });
      get().recalculate();
    },

    // ── Study lifecycle ──
    createStudy: (patientId, imageDataUrl, width, height, initialCalibration) => {
      const studyId = `study-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const now = new Date().toISOString();
      const isCalibrated = !!initialCalibration;
      set({
        studyId,
        patientId,
        imageDataUrl,
        imageNaturalWidth: width,
        imageNaturalHeight: height,
        landmarks: {},
        activeLandmark: null,
        isAiDetecting: false,
        aiCandidateLandmarks: {},
        calibration: initialCalibration ?? null,
        calibrationPoints: null,
        calibrationMode: isCalibrated ? "B" : "A",
        calibrationRealDistanceMm: initialCalibration?.realDistanceMm ?? 0,
        calibrationStage: isCalibrated ? "calibrated" : "idle",
        previousCalibration: null,
        measurements: null,
        interpretation: "",
        mandibularResult: null,
        viewer: { ...defaultViewer },
        filters: createDefaultFilters(),
        isSaved: false,
        createdAt: now,
        updatedAt: now,
      });
      studyRepository.setCurrentStudyId(studyId);
      get().refreshStudyList();
      if (isCalibrated) {
        get().recalculate();
      }
    },

    loadStudy: async (studyId) => {
      const study = studyRepository.getById(studyId);
      if (!study) return;
      // Load image from IndexedDB (or legacy localStorage fallback)
      let imageDataUrl: string | null = null;
      try {
        imageDataUrl = await studyRepository.getImage(studyId);
      } catch {
        imageDataUrl = study.imageDataUrl ?? null;
      }
      set({
        studyId: study.studyId,
        patientId: study.patientId,
        imageDataUrl: imageDataUrl,
        imageNaturalWidth: study.imageNaturalWidth,
        imageNaturalHeight: study.imageNaturalHeight,
        landmarks: study.landmarks,
        activeLandmark: null,
        isAiDetecting: false,
        aiCandidateLandmarks: {},
        calibration: study.calibration,
        calibrationPoints: study.calibrationPoints,
        calibrationMode: study.calibration ? "B" : "A",
        calibrationRealDistanceMm: study.calibration?.realDistanceMm ?? 0,
        calibrationStage: study.calibration ? "calibrated" : "idle",
        previousCalibration: null,
        measurements: study.measurements,
        interpretation: study.interpretation,
        mandibularResult: null, // recomputed in recalculate() below
        viewer: { ...defaultViewer },
        filters: study.filters ? { ...createDefaultFilters(), ...study.filters } : createDefaultFilters(),
        isSaved: true,
        createdAt: study.createdAt,
        updatedAt: study.updatedAt,
      });
      studyRepository.setCurrentStudyId(studyId);
      get().recalculate();
    },

    loadCurrentStudy: async () => {
      let currentId: string | null;
      try {
        currentId = studyRepository.getCurrentStudyId();
      } catch {
        // localStorage not available (e.g. test environment during module load)
        return;
      }
      if (!currentId) return;
      // Verify the study still exists in storage before loading
      const study = studyRepository.getById(currentId);
      if (!study) {
        // Stale currentStudyId — clear it so we don't keep trying
        studyRepository.setCurrentStudyId(null);
        return;
      }
      await get().loadStudy(currentId);
    },

    saveStudy: async () => {
      const state = get();
      if (!state.studyId || !state.imageDataUrl) return;
      const study: StoredStudy = {
        studyId: state.studyId,
        patientId: state.patientId,
        imageNaturalWidth: state.imageNaturalWidth,
        imageNaturalHeight: state.imageNaturalHeight,
        landmarks: state.landmarks,
        calibration: state.calibration,
        calibrationPoints: state.calibrationPoints,
        measurements: state.measurements ?? { ramusHeight: null, bodyLength: null },
        interpretation: state.interpretation,
        filters: state.filters,
        createdAt: state.createdAt,
        updatedAt: new Date().toISOString(),
      };
      await studyRepository.save(study, state.imageDataUrl);
      set({ isSaved: true });
      get().refreshStudyList();
    },

    deleteStudy: async (studyId) => {
      await studyRepository.remove(studyId);
      if (studyRepository.getCurrentStudyId() === studyId) {
        studyRepository.setCurrentStudyId(null);
      }
      get().refreshStudyList();
    },

    refreshStudyList: () => {
      set({ studyList: studyRepository.getAll() });
    },

    newStudy: () => {
      if (get().studyId) {
        studyRepository.setCurrentStudyId(null);
      }
      set({
        studyId: null,
        patientId: "",
        imageDataUrl: null,
        imageNaturalWidth: 0,
        imageNaturalHeight: 0,
        landmarks: {},
        activeLandmark: null,
        isAiDetecting: false,
        aiCandidateLandmarks: {},
        calibration: null,
        calibrationPoints: null,
        calibrationMode: "A",
        calibrationRealDistanceMm: 0,
        calibrationStage: "idle",
        previousCalibration: null,
        measurements: null,
        interpretation: "",
        mandibularResult: null,
        viewer: { ...defaultViewer },
        filters: createDefaultFilters(),
        isSaved: false,
        createdAt: "",
        updatedAt: "",
      });
    },

    // ── Persistence migration & error handling ──
    migrateLegacyImages: async () => {
      try {
        await studyRepository.migrateLegacyImages();
      } catch {
        // Non-fatal — migration can be retried on next load
      }
    },

    getPersistenceError: () => studyRepository.getLastError(),

    clearPersistenceError: () => studyRepository.clearLastError(),

    // ── AI Landmark Detection ──
    detectLandmarksAi: async () => {
      const state = get();
      if (!state.imageDataUrl) return;
      set({ isAiDetecting: true });

      // Small async yield for realistic UI progress indicator
      await new Promise((resolve) => setTimeout(resolve, 200));

      let pixelData: Uint8ClampedArray | null = null;
      if (
        typeof window !== "undefined" &&
        typeof document !== "undefined" &&
        state.imageDataUrl &&
        !state.imageDataUrl.startsWith("data:image/svg+xml")
      ) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = state.imageDataUrl;
          await new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
              resolve();
              return;
            }
            const timer = setTimeout(() => resolve(), 30);
            img.onload = () => {
              clearTimeout(timer);
              resolve();
            };
            img.onerror = () => {
              clearTimeout(timer);
              resolve();
            };
          });
          if (img.naturalWidth > 0) {
            const canvas = document.createElement("canvas");
            const w = state.imageNaturalWidth || img.naturalWidth || 1000;
            const h = state.imageNaturalHeight || img.naturalHeight || 500;
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              pixelData = ctx.getImageData(0, 0, w, h).data;
            }
          }
        } catch {
          // Gracefully fallback without pixel data
        }
      }

      const detection = detectMandibularLandmarks(
        state.imageNaturalWidth,
        state.imageNaturalHeight,
        { pixelData, isDicom: false }
      );

      const newLandmarks = { ...get().landmarks, ...detection.landmarks };
      const candidateFlags: Partial<Record<LandmarkName, boolean>> = {};
      for (const name of Object.keys(detection.landmarks) as LandmarkName[]) {
        candidateFlags[name] = true;
      }

      set((curr) => {
        const measurements = computeMeasurements(
          newLandmarks,
          curr.calibration,
          curr.imageNaturalWidth,
          curr.imageNaturalHeight
        );
        return {
          isAiDetecting: false,
          landmarks: newLandmarks,
          aiCandidateLandmarks: candidateFlags,
          measurements,
          mandibularResult: computeMandibularResult(measurements),
          isSaved: false,
          updatedAt: new Date().toISOString(),
        };
      });

      get().recalculate();
      debouncedSave();
    },

    acceptAllAiProposals: () => {
      set({
        aiCandidateLandmarks: {},
        isSaved: false,
        updatedAt: new Date().toISOString(),
      });
      debouncedSave();
    },

    clearAiProposals: () => {
      const { landmarks, aiCandidateLandmarks } = get();
      const updatedLandmarks = { ...landmarks };
      for (const name of Object.keys(aiCandidateLandmarks) as LandmarkName[]) {
        if (aiCandidateLandmarks[name]) {
          delete updatedLandmarks[name];
        }
      }
      set((curr) => {
        const measurements = computeMeasurements(
          updatedLandmarks,
          curr.calibration,
          curr.imageNaturalWidth,
          curr.imageNaturalHeight
        );
        return {
          landmarks: updatedLandmarks,
          aiCandidateLandmarks: {},
          measurements,
          mandibularResult: computeMandibularResult(measurements),
          isSaved: false,
          updatedAt: new Date().toISOString(),
        };
      });
      get().recalculate();
      debouncedSave();
    },

    // ── Landmark operations ──
    setLandmark: (name, point) => {
      set((state) => {
        const landmarks = { ...state.landmarks, [name]: point };
        const aiCandidateLandmarks = { ...state.aiCandidateLandmarks, [name]: false };
        const measurements = computeMeasurements(
          landmarks,
          state.calibration,
          state.imageNaturalWidth,
          state.imageNaturalHeight
        );
        return {
          landmarks,
          aiCandidateLandmarks,
          measurements,
          mandibularResult: computeMandibularResult(measurements),
          isSaved: false,
          updatedAt: new Date().toISOString(),
        };
      });
      // Recalculate interpretation
      get().recalculate();
      // Debounced auto-save
      debouncedSave();
    },

    moveLandmark: (name, point) => {
      set((state) => {
        const landmarks = { ...state.landmarks, [name]: point };
        const aiCandidateLandmarks = { ...state.aiCandidateLandmarks, [name]: false };
        const measurements = computeMeasurements(
          landmarks,
          state.calibration,
          state.imageNaturalWidth,
          state.imageNaturalHeight
        );
        return {
          landmarks,
          aiCandidateLandmarks,
          measurements,
          mandibularResult: computeMandibularResult(measurements),
          isSaved: false,
          updatedAt: new Date().toISOString(),
        };
      });
      // Recalculate interpretation
      get().recalculate();
      // Debounced auto-save
      debouncedSave();
    },

    deleteLandmark: (name) => {
      set((state) => {
        const landmarks = { ...state.landmarks };
        delete landmarks[name];
        const aiCandidateLandmarks = { ...state.aiCandidateLandmarks };
        delete aiCandidateLandmarks[name];
        const measurements = computeMeasurements(
          landmarks,
          state.calibration,
          state.imageNaturalWidth,
          state.imageNaturalHeight
        );
        return {
          landmarks,
          aiCandidateLandmarks,
          measurements,
          mandibularResult: computeMandibularResult(measurements),
          isSaved: false,
          updatedAt: new Date().toISOString(),
        };
      });
      get().recalculate();
      debouncedSave();
    },

    setActiveLandmark: (name) => set({ activeLandmark: name }),
    clearActiveLandmark: () => set({ activeLandmark: null }),

    // ── Calibration (state machine) ──
    // The calibration workflow follows an explicit state machine:
    //   idle → placing-point-1 → reviewing-point-1 → placing-point-2
    //   → reviewing-point-2 → entering-distance → calibrated
    // No stage may be skipped. Each action guards on the current stage.

    setCalibrationRealDistance: (mm) => {
      set({ calibrationRealDistanceMm: mm });
    },

    startCalibration: () => {
      set((state) => ({
        calibrationStage: "placing-point-1",
        calibrationPoints: { point1: null, point2: null },
        // Save previous calibration for cancel/restore
        previousCalibration: state.calibration
          ? {
              calibration: state.calibration,
              calibrationMode: state.calibrationMode,
              calibrationRealDistanceMm: state.calibrationRealDistanceMm,
            }
          : null,
        // Don't clear existing calibration yet — only clear on confirm or cancel
        calibrationRealDistanceMm: 0,
      }));
    },

    cancelCalibration: () => {
      set((state) => {
        // Restore previous calibration if it existed
        if (state.previousCalibration) {
          return {
            calibrationStage: state.previousCalibration.calibration ? "calibrated" : "idle",
            calibrationPoints: null,
            calibration: state.previousCalibration.calibration,
            calibrationMode: state.previousCalibration.calibrationMode,
            calibrationRealDistanceMm: state.previousCalibration.calibrationRealDistanceMm,
            previousCalibration: null,
          };
        }
        return {
          calibrationStage: "idle",
          calibrationPoints: null,
          previousCalibration: null,
        };
      });
      get().recalculate();
    },

    placeCalibrationPoint: (point) => {
      set((state) => {
        if (state.calibrationStage === "placing-point-1") {
          return {
            calibrationPoints: { point1: point, point2: null },
            calibrationStage: "reviewing-point-1" as CalibrationStage,
          };
        }
        if (state.calibrationStage === "placing-point-2") {
          return {
            calibrationPoints: {
              point1: state.calibrationPoints?.point1 ?? null,
              point2: point,
            },
            calibrationStage: "reviewing-point-2" as CalibrationStage,
          };
        }
        // Not in a placing stage — ignore
        return {};
      });
    },

    moveCalibrationPoint: (which, point) => {
      set((state) => {
        if (!state.calibrationPoints) return {};
        const clampedPoint: Point = {
          x: Math.max(0, Math.min(1, point.x)),
          y: Math.max(0, Math.min(1, point.y)),
        };
        const stage = state.calibrationStage;
        const canMove =
          (which === 1 &&
            (stage === "reviewing-point-1" ||
              stage === "reviewing-point-2" ||
              stage === "entering-distance" ||
              stage === "calibrated")) ||
          (which === 2 &&
            (stage === "reviewing-point-2" ||
              stage === "entering-distance" ||
              stage === "calibrated"));

        if (!canMove) return {};

        const updatedPoints = {
          ...state.calibrationPoints,
          [which === 1 ? "point1" : "point2"]: clampedPoint,
        };

        // If already calibrated, update calibration scale in real-time
        let calibration = state.calibration;
        if (
          stage === "calibrated" &&
          updatedPoints.point1 &&
          updatedPoints.point2 &&
          state.calibrationRealDistanceMm > 0 &&
          state.imageNaturalWidth > 0 &&
          state.imageNaturalHeight > 0
        ) {
          const dxPx = (updatedPoints.point2.x - updatedPoints.point1.x) * state.imageNaturalWidth;
          const dyPx = (updatedPoints.point2.y - updatedPoints.point1.y) * state.imageNaturalHeight;
          const pixelDistance = Math.sqrt(dxPx * dxPx + dyPx * dyPx);
          if (pixelDistance >= 5) {
            const mmPerPixel = state.calibrationRealDistanceMm / pixelDistance;
            calibration = {
              realDistanceMm: state.calibrationRealDistanceMm,
              pixelDistance,
              mmPerPixel,
            };
          }
        }

        return {
          calibrationPoints: updatedPoints,
          calibration,
          isSaved: false,
          updatedAt: new Date().toISOString(),
        };
      });
      get().recalculate();
      debouncedSave();
    },

    confirmPoint1: () => {
      set((state) => {
        if (state.calibrationStage !== "reviewing-point-1") return {};
        return { calibrationStage: "placing-point-2" as CalibrationStage };
      });
    },

    confirmPoint2: () => {
      set((state) => {
        if (state.calibrationStage !== "reviewing-point-2") return {};
        return { calibrationStage: "entering-distance" as CalibrationStage };
      });
    },

    resetPoint1: () => {
      set((state) => {
        if (state.calibrationStage !== "reviewing-point-1") return {};
        return {
          calibrationPoints: { point1: null, point2: null },
          calibrationStage: "placing-point-1" as CalibrationStage,
        };
      });
    },

    resetPoint2: () => {
      set((state) => {
        if (state.calibrationStage !== "reviewing-point-2") return {};
        return {
          calibrationPoints: {
            point1: state.calibrationPoints?.point1 ?? null,
            point2: null,
          },
          calibrationStage: "placing-point-2" as CalibrationStage,
        };
      });
    },

    goBackCalibration: () => {
      const stage = get().calibrationStage;
      if (stage === "reviewing-point-1") {
        get().resetPoint1();
      } else if (stage === "placing-point-2") {
        set({ calibrationStage: "reviewing-point-1" });
      } else if (stage === "reviewing-point-2") {
        get().resetPoint2();
      } else if (stage === "entering-distance") {
        set({ calibrationStage: "reviewing-point-2" });
      } else if (stage === "placing-point-1") {
        get().cancelCalibration();
      }
    },

    confirmCalibration: (knownDistanceMm) => {
      const state = get();
      if (state.calibrationStage !== "entering-distance") return;
      if (!state.calibrationPoints) return;
      const p0 = state.calibrationPoints.point1;
      const p1 = state.calibrationPoints.point2;
      if (!p0 || !p1) return;
      if (knownDistanceMm <= 0) return;
      const normDist = calculateDistance(p0, p1);
      const pixelDist =
        normDist * Math.max(state.imageNaturalWidth, state.imageNaturalHeight);
      if (pixelDist === 0) return;
      const mmPerPixel = knownDistanceMm / pixelDist;
      set({
        calibration: {
          pixelDistance: pixelDist,
          realDistanceMm: knownDistanceMm,
          mmPerPixel,
        },
        calibrationMode: "B",
        calibrationRealDistanceMm: knownDistanceMm,
        calibrationStage: "calibrated",
        previousCalibration: null,
      });
      get().recalculate();
      debouncedSave();
    },

    clearCalibration: () => {
      set({
        calibration: null,
        calibrationPoints: null,
        calibrationMode: "A",
        calibrationRealDistanceMm: 0,
        calibrationStage: "idle",
        previousCalibration: null,
      });
      get().recalculate();
      debouncedSave();
    },

    // ── Radiograph Image Filters ──
    setImageFilters: (partial) => {
      set((state) => {
        const newFilters: ImageFilterState = {
          ...state.filters,
          ...partial,
        };
        if (partial.preset === undefined) {
          newFilters.preset = "custom";
        }
        return {
          filters: newFilters,
          isSaved: false,
          updatedAt: new Date().toISOString(),
        };
      });
      debouncedSave();
    },

    resetImageFilters: () => {
      set({
        filters: createDefaultFilters(),
        isSaved: false,
        updatedAt: new Date().toISOString(),
      });
      debouncedSave();
    },

    setFilterPreset: (preset) => {
      set({
        filters: applyFilterPreset(preset),
        isSaved: false,
        updatedAt: new Date().toISOString(),
      });
      debouncedSave();
    },

    // ── Viewer transform ──
    setZoom: (zoom) =>
      set((state) => ({
        viewer: { ...state.viewer, zoom: Math.max(0.5, Math.min(8, zoom)) },
      })),

    setPan: (x, y) =>
      set((state) => ({ viewer: { ...state.viewer, panX: x, panY: y } })),

    setBrightness: (value) =>
      set((state) => ({
        viewer: { ...state.viewer, brightness: Math.max(0.3, Math.min(2.0, value)) },
      })),

    setContrast: (value) =>
      set((state) => ({
        viewer: { ...state.viewer, contrast: Math.max(0.3, Math.min(2.0, value)) },
      })),

    resetViewer: () => set({ viewer: { ...defaultViewer } }),
    fitToScreen: () => set({ viewer: { ...defaultViewer } }),

    // ── Hover state ──
    setHoveredLine: (line) => set({ hoveredLine: line }),

    // ── Recalculate (internal) ──
    recalculate: () => {
      const state = get();
      const measurements = computeMeasurements(
        state.landmarks,
        state.calibration,
        state.imageNaturalWidth,
        state.imageNaturalHeight
      );
      const interpretation = generateClinicalSummary(
        {
          ramusHeight: measurements.ramusHeight,
          bodyLength: measurements.bodyLength,
          calibration: state.calibration,
          calibrationMode: state.calibrationMode,
        },
        state.language
      );
      const mandibularResult = computeMandibularResult(measurements, state.language);
      set({ measurements, interpretation, mandibularResult });
    },
  }))
);

// ── Initialize study list on module load ────────────────────
useStudyStore.getState().refreshStudyList();

// ── Migrate legacy localStorage images to IndexedDB on load ──
// This is async and non-blocking — runs in the background.
// Safe to call multiple times; no-op if already migrated.
useStudyStore.getState().migrateLegacyImages();

// ── Auto-load last active study on startup ──────────────────
// Restores the study the user was working on before page reload.
// Reads ma.currentStudyId from localStorage, loads metadata (sync)
// and image from IndexedDB (async). No-op if no current study or
// the study no longer exists. Must run after refreshStudyList so
// the study sidebar is populated.
// Wrapped in try/catch because localStorage may not be available
// during module load in some test environments (jsdom without mock
// yet set up). The App component also calls loadCurrentStudy() in a
// useEffect as a fallback.
void useStudyStore.getState().loadCurrentStudy().catch(() => {
  // localStorage or IndexedDB not ready — App.tsx useEffect will retry
});