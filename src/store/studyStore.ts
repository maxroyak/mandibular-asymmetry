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
  determineDominantSide,
  classifyAsymmetry,
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
  StudyMeasurements,
  MeasurementResult,
  BilateralMeasurement,
  MandibularAsymmetryResult,
} from "../domain/types";
import {
  studyRepository,
  type StoredStudy,
} from "../persistence/studyRepository";

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
  isCalibrating: boolean; // shared UI state — true when calibration workflow is active

  // Computed measurements
  measurements: StudyMeasurements | null;
  interpretation: string;
  mandibularResult: MandibularAsymmetryResult | null;

  // Image viewer transform
  viewer: ViewerState;

  // Persistence status
  isSaved: boolean;
  hoveredLine: string | null;

  // Study list
  studyList: StoredStudy[];
}

interface StudyActions {
  // Study lifecycle
  createStudy: (patientId: string, imageDataUrl: string, width: number, height: number) => void;
  loadStudy: (studyId: string) => void;
  saveStudy: () => void;
  deleteStudy: (studyId: string) => void;
  refreshStudyList: () => void;
  newStudy: () => void;

  // Landmark operations
  setLandmark: (name: LandmarkName, point: Point) => void;
  moveLandmark: (name: LandmarkName, point: Point) => void;
  deleteLandmark: (name: LandmarkName) => void;
  setActiveLandmark: (name: LandmarkName | null) => void;
  clearActiveLandmark: () => void;

  // Calibration
  setCalibrationPoint: (index: 0 | 1, point: Point) => void;
  setCalibrationRealDistance: (mm: number) => void;
  clearCalibration: () => void;
  computeCalibration: () => void;
  startCalibration: () => void;
  cancelCalibration: () => void;

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
  imageHeight: number
): MeasurementResult | null {
  if (!rightA || !rightB || !leftA || !leftB) return null;

  const rightNorm = calculateDistance(rightA, rightB);
  const leftNorm = calculateDistance(leftA, leftB);

  const habets = calculateAsymmetryIndex(rightNorm, leftNorm);
  const relDiff = calculateRelativeDifference(rightNorm, leftNorm);
  const dominant = determineDominantSide(rightNorm, leftNorm);
  const tier = classifyAsymmetry(Math.abs(habets));
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
    dominantSide: dominant,
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
  // Ramus height: CoR→GoR (right), CoL→GoL (left)
  const ramusHeight = computeSingleMeasurement(
    landmarks.CoR,
    landmarks.GoR,
    landmarks.CoL,
    landmarks.GoL,
    calibration,
    imageWidth,
    imageHeight
  );

  // Body length: GoR→Me (right), GoL→Me (left)
  const bodyLength = computeSingleMeasurement(
    landmarks.GoR,
    landmarks.Me,
    landmarks.GoL,
    landmarks.Me,
    calibration,
    imageWidth,
    imageHeight
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
  measurements: StudyMeasurements
): MandibularAsymmetryResult | null {
  const ramus = buildBilateralMeasurement(measurements.ramusHeight);
  const body = buildBilateralMeasurement(measurements.bodyLength);
  if (!ramus || !body) return null;
  const conclusion = generateMandibularAsymmetryConclusion(
    ramus.rightMm,
    ramus.leftMm,
    body.rightMm,
    body.leftMm
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
    isCalibrating: false,
    measurements: null,
    interpretation: "",
    mandibularResult: null,
    viewer: { ...defaultViewer },
    isSaved: false,
    hoveredLine: null,
    studyList: [],

    // ── Study lifecycle ──
    createStudy: (patientId, imageDataUrl, width, height) => {
      const studyId = `study-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const now = new Date().toISOString();
      set({
        studyId,
        patientId,
        imageDataUrl,
        imageNaturalWidth: width,
        imageNaturalHeight: height,
        landmarks: {},
        activeLandmark: null,
        calibration: null,
        calibrationPoints: null,
        calibrationMode: "A",
        calibrationRealDistanceMm: 0,
        isCalibrating: false,
        measurements: null,
        interpretation: "",
        mandibularResult: null,
        viewer: { ...defaultViewer },
        isSaved: false,
        createdAt: now,
        updatedAt: now,
      });
      studyRepository.setCurrentStudyId(studyId);
      get().refreshStudyList();
    },

    loadStudy: (studyId) => {
      const study = studyRepository.getById(studyId);
      if (!study) return;
      set({
        studyId: study.studyId,
        patientId: study.patientId,
        imageDataUrl: study.imageDataUrl,
        imageNaturalWidth: study.imageNaturalWidth,
        imageNaturalHeight: study.imageNaturalHeight,
        landmarks: study.landmarks,
        activeLandmark: null,
        calibration: study.calibration,
        calibrationPoints: study.calibrationPoints,
        calibrationMode: study.calibration ? "B" : "A",
        calibrationRealDistanceMm: study.calibration?.realDistanceMm ?? 0,
        isCalibrating: false,
        measurements: study.measurements,
        interpretation: study.interpretation,
        mandibularResult: null, // recomputed in recalculate() below
        viewer: { ...defaultViewer },
        isSaved: true,
        createdAt: study.createdAt,
        updatedAt: study.updatedAt,
      });
      studyRepository.setCurrentStudyId(studyId);
      get().recalculate();
    },

    saveStudy: () => {
      const state = get();
      if (!state.studyId || !state.imageDataUrl) return;
      const study: StoredStudy = {
        studyId: state.studyId,
        patientId: state.patientId,
        imageDataUrl: state.imageDataUrl,
        imageNaturalWidth: state.imageNaturalWidth,
        imageNaturalHeight: state.imageNaturalHeight,
        landmarks: state.landmarks,
        calibration: state.calibration,
        calibrationPoints: state.calibrationPoints,
        measurements: state.measurements ?? { ramusHeight: null, bodyLength: null },
        interpretation: state.interpretation,
        createdAt: state.createdAt,
        updatedAt: new Date().toISOString(),
      };
      studyRepository.save(study);
      set({ isSaved: true });
      get().refreshStudyList();
    },

    deleteStudy: (studyId) => {
      studyRepository.remove(studyId);
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
        calibration: null,
        calibrationPoints: null,
        calibrationMode: "A",
        calibrationRealDistanceMm: 0,
        isCalibrating: false,
        measurements: null,
        interpretation: "",
        mandibularResult: null,
        viewer: { ...defaultViewer },
        isSaved: false,
        createdAt: "",
        updatedAt: "",
      });
    },

    // ── Landmark operations ──
    setLandmark: (name, point) => {
      set((state) => {
        const landmarks = { ...state.landmarks, [name]: point };
        const measurements = computeMeasurements(
          landmarks,
          state.calibration,
          state.imageNaturalWidth,
          state.imageNaturalHeight
        );
        return {
          landmarks,
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
        const measurements = computeMeasurements(
          landmarks,
          state.calibration,
          state.imageNaturalWidth,
          state.imageNaturalHeight
        );
        return {
          landmarks,
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
        const measurements = computeMeasurements(
          landmarks,
          state.calibration,
          state.imageNaturalWidth,
          state.imageNaturalHeight
        );
        return {
          landmarks,
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

    // ── Calibration ──
    // Bug 1 fix: calibration points are stored as independent nullable fields
    // (CalibrationDraft) rather than a `[Point, Point]` tuple. The old tuple
    // implementation used `?? point` fallbacks that filled BOTH slots with the
    // same coordinate when the tuple was null, causing a single click to place
    // two points. Now each slot is set independently and the other stays null.
    setCalibrationPoint: (index, point) => {
      set((state) => {
        const current = state.calibrationPoints ?? { point1: null, point2: null };
        if (index === 0) {
          return {
            calibrationPoints: { point1: point, point2: current.point2 },
          };
        } else {
          return {
            calibrationPoints: { point1: current.point1, point2: point },
          };
        }
      });
    },

    setCalibrationRealDistance: (mm) => {
      set({ calibrationRealDistanceMm: mm });
    },

    computeCalibration: () => {
      const state = get();
      if (!state.calibrationPoints) return;
      const p0 = state.calibrationPoints.point1;
      const p1 = state.calibrationPoints.point2;
      if (!p0 || !p1) return;
      const normDist = calculateDistance(p0, p1);
      const pixelDist =
        normDist * Math.max(state.imageNaturalWidth, state.imageNaturalHeight);
      if (pixelDist === 0) return;
      const mmPerPixel = state.calibrationRealDistanceMm / pixelDist;
      set({
        calibration: {
          pixelDistance: pixelDist,
          realDistanceMm: state.calibrationRealDistanceMm,
          mmPerPixel,
        },
        calibrationMode: "B",
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
        isCalibrating: false,
      });
      get().recalculate();
      debouncedSave();
    },

    startCalibration: () => {
      set({ isCalibrating: true, calibrationPoints: null, calibration: null });
    },

    cancelCalibration: () => {
      set({ isCalibrating: false, calibrationPoints: null });
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
      const interpretation = generateClinicalSummary({
        ramusHeight: measurements.ramusHeight,
        bodyLength: measurements.bodyLength,
        calibration: state.calibration,
        calibrationMode: state.calibrationMode,
      });
      const mandibularResult = computeMandibularResult(measurements);
      set({ measurements, interpretation, mandibularResult });
    },
  }))
);

// ── Initialize study list on module load ────────────────────
useStudyStore.getState().refreshStudyList();