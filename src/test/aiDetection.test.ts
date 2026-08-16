// ── AI Landmark Detection Tests ──────────────────────────────
// Tests for domain AI heuristics, manual trigger safeguards, candidate states, and i18n.

import { describe, it, expect, beforeEach } from "vitest";
import {
  detectMandibularLandmarks,
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

describe("AI Landmark Detection Domain Logic", () => {
  it("generates candidate coordinates for all 5 anatomical landmarks", () => {
    const result = detectMandibularLandmarks(1920, 1080);
    const required: LandmarkName[] = ["CoR", "GoR", "CoL", "GoL", "Me"];

    for (const name of required) {
      expect(result.landmarks[name]).toBeDefined();
      expect(result.landmarks[name].x).toBeGreaterThanOrEqual(0.05);
      expect(result.landmarks[name].x).toBeLessThanOrEqual(0.95);
      expect(result.landmarks[name].y).toBeGreaterThanOrEqual(0.05);
      expect(result.landmarks[name].y).toBeLessThanOrEqual(0.95);
      expect(result.confidenceScores[name]).toBeGreaterThanOrEqual(0.85);
      expect(isAnatomicallyPlausible(name, result.landmarks[name])).toBe(true);
    }

    expect(result.averageConfidence).toBeGreaterThanOrEqual(0.88);
  });

  it("validates anatomical plausibility bounds correctly", () => {
    // CoR in bottom right is invalid
    expect(isAnatomicallyPlausible("CoR", { x: 0.8, y: 0.8 })).toBe(false);
    // CoR in upper left is valid
    expect(isAnatomicallyPlausible("CoR", { x: 0.25, y: 0.2 })).toBe(true);

    // Me in upper half is invalid
    expect(isAnatomicallyPlausible("Me", { x: 0.5, y: 0.2 })).toBe(false);
    // Me in lower middle is valid
    expect(isAnatomicallyPlausible("Me", { x: 0.5, y: 0.88 })).toBe(true);
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
    useStudyStore.getState().moveLandmark("CoR", { x: 0.23, y: 0.21 });
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
    useStudyStore.getState().moveLandmark("Me", { x: 0.51, y: 0.89 });

    expect(useStudyStore.getState().landmarks.Me).toEqual({ x: 0.51, y: 0.89 });
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
