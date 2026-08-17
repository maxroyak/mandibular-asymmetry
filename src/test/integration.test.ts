// ── Integration Tests ────────────────────────────────────────
// End-to-end store behavior tests:
// - Upload image flow (createStudy)
// - Place all five landmarks
// - Complete calibration
// - Verify result recalculation
// - Save study
// - Reload study
// - Verify persistence
// - Delete study
//
// Tests behavior, not implementation details.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { useStudyStore } from "../store/studyStore";
import type { Point, LandmarkName } from "../domain/types";

// ── localStorage mock ──
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

// ── Mock imageStore ──
const mockImageStore = new Map<string, { imageDataUrl: string; width: number; height: number }>();

vi.mock("../persistence/imageStore", () => ({
  saveImage: vi.fn(async (studyId: string, imageDataUrl: string, width: number, height: number) => {
    mockImageStore.set(studyId, { imageDataUrl, width, height });
  }),
  loadImage: vi.fn(async (studyId: string) => {
    const record = mockImageStore.get(studyId);
    return record ? { studyId, ...record } : null;
  }),
  deleteImage: vi.fn(async (studyId: string) => {
    mockImageStore.delete(studyId);
  }),
  hasIndexedDB: vi.fn(() => true),
  testIndexedDB: vi.fn(async () => true),
}));

// ── Test data ──

const TEST_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";
const TEST_WIDTH = 1000;
const TEST_HEIGHT = 800;

const TEST_LANDMARKS: Record<LandmarkName, Point> = {
  CoR: { x: 0.15, y: 0.2 },
  GoR: { x: 0.15, y: 0.8 },
  CoL: { x: 0.85, y: 0.2 },
  GoL: { x: 0.85, y: 0.8 },
  Me: { x: 0.5, y: 0.95 },
};

// ── Tests ──

describe("Integration — full workflow", () => {
  beforeEach(() => {
    storageMap.clear();
    mockImageStore.clear();
    useStudyStore.getState().newStudy();
    useStudyStore.getState().clearPersistenceError();
  });

  it("complete flow: upload → landmarks → calibrate → results → save → reload → delete", async () => {
    const store = useStudyStore.getState;

    // ── 1. Upload image flow ──
    store().createStudy("integration-patient", TEST_IMAGE, TEST_WIDTH, TEST_HEIGHT);
    expect(store().studyId).not.toBeNull();
    expect(store().imageDataUrl).toBe(TEST_IMAGE);
    expect(store().imageNaturalWidth).toBe(TEST_WIDTH);
    expect(store().imageNaturalHeight).toBe(TEST_HEIGHT);
    expect(store().patientId).toBe("integration-patient");

    // ── 2. Place all five landmarks ──
    for (const [name, point] of Object.entries(TEST_LANDMARKS)) {
      store().setLandmark(name as LandmarkName, point);
    }
    expect(Object.keys(store().landmarks)).toHaveLength(5);
    expect(store().landmarks.CoR).toEqual(TEST_LANDMARKS.CoR);
    expect(store().landmarks.GoL).toEqual(TEST_LANDMARKS.GoL);
    expect(store().landmarks.Me).toEqual(TEST_LANDMARKS.Me);

    // ── 3. Verify result recalculation (before calibration) ──
    // Measurements should be computed with all 5 landmarks placed
    expect(store().measurements).not.toBeNull();
    expect(store().measurements!.ramusHeight).not.toBeNull();
    expect(store().measurements!.bodyLength).not.toBeNull();
    // Ramus and body both have classification=null (3-tier system removed per PIBot)
    expect(store().measurements!.ramusHeight!.classification).toBeNull();
    // Body is horizontal → should NOT have classification
    expect(store().measurements!.bodyLength!.classification).toBeNull();
    // Without calibration, mm values should be null
    expect(store().measurements!.ramusHeight!.rightMm).toBeNull();
    expect(store().measurements!.ramusHeight!.leftMm).toBeNull();

    // ── 4. Complete calibration ──
    store().startCalibration();
    expect(store().calibrationStage).toBe("placing-point-1");

    // Place calibration point 1
    store().placeCalibrationPoint({ x: 0.0, y: 0.5 });
    expect(store().calibrationStage).toBe("reviewing-point-1");
    store().confirmPoint1();
    expect(store().calibrationStage).toBe("placing-point-2");

    // Place calibration point 2 (normalized distance of 0.1 → 100px with 1000px max)
    store().placeCalibrationPoint({ x: 0.1, y: 0.5 });
    expect(store().calibrationStage).toBe("reviewing-point-2");
    store().confirmPoint2();
    expect(store().calibrationStage).toBe("entering-distance");

    // Confirm calibration with known distance
    store().confirmCalibration(20);
    expect(store().calibrationStage).toBe("calibrated");
    expect(store().calibration).not.toBeNull();
    expect(store().calibration!.realDistanceMm).toBe(20);
    expect(store().calibration!.mmPerPixel).toBeCloseTo(0.2, 5);

    // ── 5. Verify recalculation after calibration ──
    // Now mm values should be populated
    expect(store().measurements!.ramusHeight!.rightMm).not.toBeNull();
    expect(store().measurements!.ramusHeight!.leftMm).not.toBeNull();
    expect(store().measurements!.bodyLength!.rightMm).not.toBeNull();
    expect(store().measurements!.bodyLength!.leftMm).not.toBeNull();

    // ── 6. Save study ──
    await store().saveStudy();
    expect(store().isSaved).toBe(true);

    // Verify metadata is in localStorage (without imageDataUrl)
    const raw = storageMap.get("ma.studies");
    expect(raw).toBeDefined();
    const stored = JSON.parse(raw!);
    expect(stored).toHaveLength(1);
    expect(stored[0].studyId).toBe(store().studyId);
    expect(stored[0].imageDataUrl).toBeUndefined(); // Image not in localStorage
    expect(stored[0].landmarks.CoR).toEqual(TEST_LANDMARKS.CoR);
    expect(stored[0].calibration).not.toBeNull();

    // Verify image is in IndexedDB (mocked)
    expect(mockImageStore.has(store().studyId!)).toBe(true);
    expect(mockImageStore.get(store().studyId!)!.imageDataUrl).toBe(TEST_IMAGE);

    const savedStudyId = store().studyId!;

    // ── 7. Reload study ──
    // Start a new study first to clear state
    store().newStudy();
    expect(store().studyId).toBeNull();
    expect(store().imageDataUrl).toBeNull();
    expect(Object.keys(store().landmarks)).toHaveLength(0);

    // Load the saved study
    await store().loadStudy(savedStudyId);

    // ── 8. Verify persistence ──
    expect(store().studyId).toBe(savedStudyId);
    expect(store().patientId).toBe("integration-patient");
    expect(store().imageDataUrl).toBe(TEST_IMAGE);
    expect(store().imageNaturalWidth).toBe(TEST_WIDTH);
    expect(store().imageNaturalHeight).toBe(TEST_HEIGHT);

    // Landmarks should be restored
    expect(store().landmarks.CoR).toEqual(TEST_LANDMARKS.CoR);
    expect(store().landmarks.GoR).toEqual(TEST_LANDMARKS.GoR);
    expect(store().landmarks.CoL).toEqual(TEST_LANDMARKS.CoL);
    expect(store().landmarks.GoL).toEqual(TEST_LANDMARKS.GoL);
    expect(store().landmarks.Me).toEqual(TEST_LANDMARKS.Me);

    // Calibration should be restored
    expect(store().calibration).not.toBeNull();
    expect(store().calibration!.realDistanceMm).toBe(20);
    expect(store().calibration!.mmPerPixel).toBeCloseTo(0.2, 5);
    expect(store().calibrationMode).toBe("B");
    expect(store().calibrationStage).toBe("calibrated");

    // Measurements should be recalculated
    expect(store().measurements).not.toBeNull();
    expect(store().measurements!.ramusHeight).not.toBeNull();
    expect(store().measurements!.bodyLength).not.toBeNull();
    expect(store().measurements!.ramusHeight!.rightMm).not.toBeNull();

    // ── 9. Delete study ──
    await store().deleteStudy(savedStudyId);

    // Study should be gone from localStorage
    const afterDelete = JSON.parse(storageMap.get("ma.studies") || "[]");
    expect(afterDelete).toHaveLength(0);

    // Image should be gone from IndexedDB (mocked)
    expect(mockImageStore.has(savedStudyId)).toBe(false);

    // Study list should be empty
    expect(store().studyList).toHaveLength(0);
  });

  it("upload image flow sets initial state correctly", () => {
    const store = useStudyStore.getState;
    store().createStudy("test-upload", TEST_IMAGE, 2400, 1200);

    expect(store().studyId).not.toBeNull();
    expect(store().imageDataUrl).toBe(TEST_IMAGE);
    expect(store().imageNaturalWidth).toBe(2400);
    expect(store().imageNaturalHeight).toBe(1200);
    expect(store().landmarks).toEqual({});
    expect(store().calibration).toBeNull();
    expect(store().calibrationMode).toBe("A");
    expect(store().calibrationStage).toBe("idle");
    expect(store().measurements).toBeNull();
    expect(store().isSaved).toBe(false);
  });

  it("placing landmarks triggers immediate recalculation", () => {
    const store = useStudyStore.getState;
    store().createStudy("test-landmarks", TEST_IMAGE, TEST_WIDTH, TEST_HEIGHT);

    // Place just CoR and GoR — ramus should still be null (needs all 4)
    store().setLandmark("CoR", { x: 0.1, y: 0.1 });
    store().setLandmark("GoR", { x: 0.1, y: 0.9 });
    expect(store().measurements!.ramusHeight).toBeNull();

    // Place CoL and GoL — ramus should now be computed
    store().setLandmark("CoL", { x: 0.9, y: 0.1 });
    store().setLandmark("GoL", { x: 0.9, y: 0.9 });
    expect(store().measurements!.ramusHeight).not.toBeNull();

    // Place Me — body length should now be computed
    store().setLandmark("Me", { x: 0.5, y: 0.95 });
    expect(store().measurements!.bodyLength).not.toBeNull();
  });

  it("moving a landmark triggers recalculation", () => {
    const store = useStudyStore.getState;
    store().createStudy("test-move", TEST_IMAGE, TEST_WIDTH, TEST_HEIGHT);

    // Place all landmarks
    for (const [name, point] of Object.entries(TEST_LANDMARKS)) {
      store().setLandmark(name as LandmarkName, point);
    }

    const beforeRamus = store().measurements!.ramusHeight!;
    const beforeRight = beforeRamus.right;

    // Move CoR to a different position
    store().moveLandmark("CoR", { x: 0.15, y: 0.05 });

    const afterRamus = store().measurements!.ramusHeight!;
    // The right ramus distance should change
    expect(afterRamus.right).not.toBe(beforeRight);
  });

  it("deleting a landmark nullifies the affected measurement", () => {
    const store = useStudyStore.getState;
    store().createStudy("test-delete-landmark", TEST_IMAGE, TEST_WIDTH, TEST_HEIGHT);

    // Place all landmarks
    for (const [name, point] of Object.entries(TEST_LANDMARKS)) {
      store().setLandmark(name as LandmarkName, point);
    }
    expect(store().measurements!.ramusHeight).not.toBeNull();

    // Delete CoR — ramus should become null
    store().deleteLandmark("CoR");
    expect(store().measurements!.ramusHeight).toBeNull();
  });

  it("new study clears all state", async () => {
    const store = useStudyStore.getState;
    store().createStudy("test-new", TEST_IMAGE, TEST_WIDTH, TEST_HEIGHT);
    for (const [name, point] of Object.entries(TEST_LANDMARKS)) {
      store().setLandmark(name as LandmarkName, point);
    }
    await store().saveStudy();

    expect(store().studyId).not.toBeNull();

    store().newStudy();
    expect(store().studyId).toBeNull();
    expect(store().patientId).toBe("");
    expect(store().imageDataUrl).toBeNull();
    expect(store().landmarks).toEqual({});
    expect(store().calibration).toBeNull();
    expect(store().measurements).toBeNull();
    expect(store().isSaved).toBe(false);
  });

  it("study list refreshes after save and delete", async () => {
    const store = useStudyStore.getState;

    // Initially empty
    store().refreshStudyList();
    expect(store().studyList).toHaveLength(0);

    // Create and save
    store().createStudy("list-test-1", TEST_IMAGE, TEST_WIDTH, TEST_HEIGHT);
    await store().saveStudy();
    expect(store().studyList).toHaveLength(1);

    // Create and save another
    store().createStudy("list-test-2", TEST_IMAGE, TEST_WIDTH, TEST_HEIGHT);
    await store().saveStudy();
    expect(store().studyList).toHaveLength(2);

    // Delete one
    const firstId = store().studyList[0].studyId;
    await store().deleteStudy(firstId);
    expect(store().studyList).toHaveLength(1);
  });

  it("clearAllStudies removes all saved studies from storage and state", async () => {
    const store = useStudyStore.getState;

    store().createStudy("batch-1", TEST_IMAGE, TEST_WIDTH, TEST_HEIGHT);
    await store().saveStudy();
    store().createStudy("batch-2", TEST_IMAGE, TEST_WIDTH, TEST_HEIGHT);
    await store().saveStudy();
    store().createStudy("batch-3", TEST_IMAGE, TEST_WIDTH, TEST_HEIGHT);
    await store().saveStudy();

    expect(store().studyList).toHaveLength(3);

    // Bulk clear all studies
    await store().clearAllStudies();

    expect(store().studyList).toHaveLength(0);
    expect(storageMap.get("ma.studies")).toBe("[]");
  });

  it("calibration clears correctly", () => {
    const store = useStudyStore.getState;
    store().createStudy("test-clear-cal", TEST_IMAGE, TEST_WIDTH, TEST_HEIGHT);

    // Complete calibration
    store().startCalibration();
    store().placeCalibrationPoint({ x: 0.0, y: 0.5 });
    store().confirmPoint1();
    store().placeCalibrationPoint({ x: 0.1, y: 0.5 });
    store().confirmPoint2();
    store().confirmCalibration(20);
    expect(store().calibration).not.toBeNull();
    expect(store().calibrationMode).toBe("B");

    // Clear calibration
    store().clearCalibration();
    expect(store().calibration).toBeNull();
    expect(store().calibrationMode).toBe("A");
    expect(store().calibrationPoints).toBeNull();
    expect(store().calibrationStage).toBe("idle");
  });
});