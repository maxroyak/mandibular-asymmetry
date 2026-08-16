// ── AI Landmark Detection Tests ──────────────────────────────
// Tests for domain AI heuristics, ROI letterbox detection, manual trigger safeguards, candidate states, and i18n.

import { describe, it, expect, beforeEach } from "vitest";
import {
  detectMandibularLandmarks,
  detectRadiographRoi,
  isAnatomicallyPlausible,
} from "../domain/ai/landmarkDetector";
import { useStudyStore } from "../store/studyStore";
import { getTranslations, en, ru } from "../locales";
import type { LandmarkName } from "../domain/types";

// Mock localStorage for test environment
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => storageMap.set(key, value),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null,
  get length() { return storageMap.size; },
};
Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  configurable: true,
  writable: true,
});

describe("AI Landmark Detection & ROI Letterbox Cropping", () => {
  it("generates candidate coordinates in strict anatomical proportional zones", () => {
    const result = detectMandibularLandmarks(1920, 1080, { isDicom: true });
    const required: LandmarkName[] = ["CoR", "GoR", "CoL", "GoL", "Me"];

    for (const name of required) {
      expect(result.landmarks[name]).toBeDefined();
      expect(isAnatomicallyPlausible(name, result.landmarks[name])).toBe(true);
    }

    // Condylar points Y ∈ [0.18, 0.28], never above 0.12
    expect(result.landmarks.CoR.y).toBeGreaterThanOrEqual(0.18);
    expect(result.landmarks.CoR.y).toBeLessThanOrEqual(0.28);
    expect(result.landmarks.CoL.y).toBeGreaterThanOrEqual(0.18);
    expect(result.landmarks.CoL.y).toBeLessThanOrEqual(0.28);

    // Condylar horizontal: CoR X ∈ [0.12, 0.22], CoL X ∈ [0.78, 0.88]
    expect(result.landmarks.CoR.x).toBeGreaterThanOrEqual(0.12);
    expect(result.landmarks.CoR.x).toBeLessThanOrEqual(0.22);
    expect(result.landmarks.CoL.x).toBeGreaterThanOrEqual(0.78);
    expect(result.landmarks.CoL.x).toBeLessThanOrEqual(0.88);

    // Gonial points: Y ∈ [0.60, 0.72], GoR X ∈ [0.15, 0.25], GoL X ∈ [0.75, 0.85]
    expect(result.landmarks.GoR.y).toBeGreaterThanOrEqual(0.60);
    expect(result.landmarks.GoR.y).toBeLessThanOrEqual(0.72);
    expect(result.landmarks.GoR.x).toBeGreaterThanOrEqual(0.15);
    expect(result.landmarks.GoR.x).toBeLessThanOrEqual(0.25);
    expect(result.landmarks.GoL.x).toBeGreaterThanOrEqual(0.75);
    expect(result.landmarks.GoL.x).toBeLessThanOrEqual(0.85);

    // Menton: Y ∈ [0.80, 0.88], never below 0.90, X ∈ [0.48, 0.52]
    expect(result.landmarks.Me.y).toBeGreaterThanOrEqual(0.80);
    expect(result.landmarks.Me.y).toBeLessThanOrEqual(0.88);
    expect(result.landmarks.Me.x).toBeGreaterThanOrEqual(0.48);
    expect(result.landmarks.Me.x).toBeLessThanOrEqual(0.52);

    expect(result.averageConfidence).toBeGreaterThanOrEqual(0.90);
  });

  it("detects dark gray letterbox margins via adaptive luminance and variance", () => {
    const width = 1000;
    const height = 500;
    const pixelData = new Uint8ClampedArray(width * height * 4);

    // Fill background with dark gray letterbox (RGB = 18, 18, 18)
    for (let i = 0; i < pixelData.length; i += 4) {
      pixelData[i] = 18;
      pixelData[i + 1] = 18;
      pixelData[i + 2] = 18;
      pixelData[i + 3] = 255;
    }

    // Active exposure area: 15% margin left/right, 20% margin top/bottom
    const leftMargin = 150;
    const rightMargin = 850;
    const topMargin = 100;
    const bottomMargin = 400;

    for (let y = topMargin; y < bottomMargin; y++) {
      for (let x = leftMargin; x < rightMargin; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 140;     // R
        pixelData[idx + 1] = 140; // G
        pixelData[idx + 2] = 140; // B
        pixelData[idx + 3] = 255; // A
      }
    }

    const roi = detectRadiographRoi(width, height, pixelData);
    expect(roi.hasLetterbox).toBe(true);
    expect(roi.roi.x).toBeGreaterThanOrEqual(130);
    expect(roi.roi.x).toBeLessThanOrEqual(160);
    expect(roi.roi.y).toBeGreaterThanOrEqual(90);
    expect(roi.roi.y).toBeLessThanOrEqual(110);

    // Detect landmarks on the letterboxed image
    const result = detectMandibularLandmarks(width, height, { pixelData });

    // Menton Y should be securely clamped inside active content and not exceed 0.88
    expect(result.landmarks.Me.y).toBeLessThanOrEqual(0.88);
    expect(result.landmarks.Me.y).toBeGreaterThanOrEqual(0.70);

    // CoR Y should be located within active exposure field and >= 0.18
    expect(result.landmarks.CoR.y).toBeGreaterThanOrEqual(0.18);
  });

  it("applies fallback central Y clamp [0.08, 0.90] when no pixelData is provided on non-DICOM image", () => {
    const roi = detectRadiographRoi(1000, 500, null, false);
    expect(roi.hasLetterbox).toBe(true);
    expect(roi.normalizedRoi.minY).toBe(0.08);
    expect(roi.normalizedRoi.maxY).toBe(0.90);
  });

  it("bypasses letterbox detection when isDicom is true", () => {
    const width = 1000;
    const height = 500;
    const pixelData = new Uint8ClampedArray(width * height * 4).fill(0);

    const roi = detectRadiographRoi(width, height, pixelData, true);
    expect(roi.hasLetterbox).toBe(false);
    expect(roi.roi).toEqual({ x: 0, y: 0, width, height });
  });

  it("validates anatomical plausibility bounds correctly", () => {
    // CoR in bottom right is invalid
    expect(isAnatomicallyPlausible("CoR", { x: 0.8, y: 0.8 })).toBe(false);
    // CoR in upper left is valid
    expect(isAnatomicallyPlausible("CoR", { x: 0.18, y: 0.22 })).toBe(true);

    // Me in upper half is invalid
    expect(isAnatomicallyPlausible("Me", { x: 0.5, y: 0.2 })).toBe(false);
    // Me in lower middle (<= 0.90) is valid
    expect(isAnatomicallyPlausible("Me", { x: 0.5, y: 0.86 })).toBe(true);
    // Me below 0.90 is invalid
    expect(isAnatomicallyPlausible("Me", { x: 0.5, y: 0.95 })).toBe(false);
  });
});

describe("AI Detection Store Integration & Clinician Safeguards", () => {
  beforeEach(() => {
    storageMap.clear();
    useStudyStore.getState().newStudy();
    useStudyStore.getState().setLanguage("en");
  });

  it("does NOT run AI detection automatically on study creation", () => {
    useStudyStore
      .getState()
      .createStudy("TEST-PATIENT", "data:image/png;base64,mock", 1600, 900);

    const state = useStudyStore.getState();
    expect(state.isAiDetecting).toBe(false);
    expect(Object.keys(state.landmarks).length).toBe(0);
    expect(Object.keys(state.aiCandidateLandmarks).length).toBe(0);
  });

  it("runs detection ONLY on explicit detectLandmarksAi trigger and marks candidates", async () => {
    useStudyStore
      .getState()
      .createStudy("TEST-PATIENT", "data:image/png;base64,mock", 1600, 900);

    await useStudyStore.getState().detectLandmarksAi();

    const state = useStudyStore.getState();
    expect(state.isAiDetecting).toBe(false);
    expect(Object.keys(state.landmarks).length).toBe(5);

    // All 5 landmarks must be marked as candidate proposals
    const required: LandmarkName[] = ["CoR", "GoR", "CoL", "GoL", "Me"];
    for (const name of required) {
      expect(state.aiCandidateLandmarks[name]).toBe(true);
    }

    // Menton candidate must be <= 0.88
    expect(state.landmarks.Me?.y).toBeLessThanOrEqual(0.88);

    // Measurements and conclusion must be calculated immediately
    expect(state.measurements?.ramusHeight).not.toBeNull();
    expect(state.measurements?.bodyLength).not.toBeNull();
  });

  it("acceptAllAiProposals converts all candidate points to verified", async () => {
    useStudyStore
      .getState()
      .createStudy("TEST-PATIENT", "data:image/png;base64,mock", 1600, 900);

    await useStudyStore.getState().detectLandmarksAi();
    expect(Object.keys(useStudyStore.getState().aiCandidateLandmarks).length).toBe(5);

    useStudyStore.getState().acceptAllAiProposals();
    const state = useStudyStore.getState();

    // All landmarks remain placed
    expect(Object.keys(state.landmarks).length).toBe(5);
    // All candidate flags cleared (verified)
    expect(Object.keys(state.aiCandidateLandmarks).length).toBe(0);
  });

  it("clearAiProposals clears only unverified AI candidate points", async () => {
    useStudyStore
      .getState()
      .createStudy("TEST-PATIENT", "data:image/png;base64,mock", 1600, 900);

    await useStudyStore.getState().detectLandmarksAi();

    // Manually adjust CoR to verify it
    useStudyStore.getState().moveLandmark("CoR", { x: 0.18, y: 0.22 });
    expect(useStudyStore.getState().aiCandidateLandmarks.CoR).toBe(false);

    // Clear proposals
    useStudyStore.getState().clearAiProposals();
    const state = useStudyStore.getState();

    // CoR was verified, so it remains; the other 4 candidates are removed
    expect(state.landmarks.CoR).toBeDefined();
    expect(state.landmarks.GoR).toBeUndefined();
    expect(state.landmarks.CoL).toBeUndefined();
    expect(state.landmarks.GoL).toBeUndefined();
    expect(state.landmarks.Me).toBeUndefined();
  });

  it("manual moveLandmark/setLandmark transitions point from candidate to verified", async () => {
    useStudyStore
      .getState()
      .createStudy("TEST-PATIENT", "data:image/png;base64,mock", 1600, 900);

    await useStudyStore.getState().detectLandmarksAi();
    expect(useStudyStore.getState().aiCandidateLandmarks.Me).toBe(true);

    // Clinician drags/adjusts Menton
    useStudyStore.getState().moveLandmark("Me", { x: 0.50, y: 0.85 });

    expect(useStudyStore.getState().landmarks.Me).toEqual({ x: 0.50, y: 0.85 });
    expect(useStudyStore.getState().aiCandidateLandmarks.Me).toBe(false);
  });
});

describe("AI Detection Localization Completeness", () => {
  it("English and Russian dictionaries define all required AI strings", () => {
    const keys = Object.keys(en.ai) as (keyof typeof en.ai)[];
    expect(keys.length).toBeGreaterThanOrEqual(7);

    for (const key of keys) {
      expect(en.ai[key]).toBeDefined();
      expect(ru.ai[key]).toBeDefined();
    }

    const tEn = getTranslations("en");
    expect(tEn.ai.proposalsActive(5)).toBe("5 AI landmark proposals ready for clinical review");

    const tRu = getTranslations("ru");
    expect(tRu.ai.proposalsActive(5)).toBe("5 точек предложено ИИ для клинической проверки");
  });
});
