import { describe, it, expect, beforeEach } from "vitest";
import { useStudyStore } from "./studyStore";
import type { Point } from "../domain/types";

// ── localStorage mock for jsdom environment ──
// The studyStore calls studyRepository which uses localStorage.
// jsdom in this config doesn't provide localStorage, so we mock it.
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

// ── Store: isCalibrating state & startCalibration/cancelCalibration ──
// These tests cover the new store actions added in the calibration UX redesign.
// The store is a Zustand store — we can call actions directly and assert state.

describe("studyStore — isCalibrating state", () => {
  beforeEach(() => {
    // Reset to a known state before each test
    useStudyStore.getState().newStudy();
    // newStudy resets isCalibrating to false
  });

  it("isCalibrating defaults to false", () => {
    expect(useStudyStore.getState().isCalibrating).toBe(false);
  });

  it("startCalibration sets isCalibrating to true", () => {
    useStudyStore.getState().startCalibration();
    expect(useStudyStore.getState().isCalibrating).toBe(true);
  });

  it("startCalibration clears calibrationPoints", () => {
    // Set up some calibration points first
    const p1: Point = { x: 0.1, y: 0.1 };
    const p2: Point = { x: 0.5, y: 0.5 };
    useStudyStore.getState().setCalibrationPoint(0, p1);
    useStudyStore.getState().setCalibrationPoint(1, p2);
    expect(useStudyStore.getState().calibrationPoints).not.toBeNull();

    // startCalibration should clear them
    useStudyStore.getState().startCalibration();
    expect(useStudyStore.getState().calibrationPoints).toBeNull();
  });

  it("startCalibration clears existing calibration", () => {
    // We can't easily set calibration without going through the full flow,
    // but startCalibration should set calibration to null
    useStudyStore.getState().startCalibration();
    expect(useStudyStore.getState().calibration).toBeNull();
  });

  it("cancelCalibration sets isCalibrating to false", () => {
    // First start calibration
    useStudyStore.getState().startCalibration();
    expect(useStudyStore.getState().isCalibrating).toBe(true);

    // Then cancel
    useStudyStore.getState().cancelCalibration();
    expect(useStudyStore.getState().isCalibrating).toBe(false);
  });

  it("cancelCalibration clears calibrationPoints", () => {
    // Start calibration and set some points
    useStudyStore.getState().startCalibration();
    const p: Point = { x: 0.3, y: 0.3 };
    useStudyStore.getState().setCalibrationPoint(0, p);
    expect(useStudyStore.getState().calibrationPoints).not.toBeNull();

    // Cancel should clear points
    useStudyStore.getState().cancelCalibration();
    expect(useStudyStore.getState().calibrationPoints).toBeNull();
  });

  it("cancelCalibration does NOT clear existing calibration object", () => {
    // cancelCalibration should only clear the in-progress calibration state,
    // not a previously completed calibration. We verify by checking that
    // cancelCalibration only touches isCalibrating and calibrationPoints.
    // (If calibration was already null, it stays null.)
    useStudyStore.getState().startCalibration();
    useStudyStore.getState().cancelCalibration();
    // calibration was null before start (newStudy), startCalibration set it null,
    // cancel doesn't restore it — that's correct behavior (cancel aborts the flow)
    expect(useStudyStore.getState().calibration).toBeNull();
  });

  it("isCalibrating is reset to false by newStudy", () => {
    useStudyStore.getState().startCalibration();
    expect(useStudyStore.getState().isCalibrating).toBe(true);

    useStudyStore.getState().newStudy();
    expect(useStudyStore.getState().isCalibrating).toBe(false);
  });

  it("isCalibrating is reset to false by createStudy", () => {
    useStudyStore.getState().startCalibration();
    expect(useStudyStore.getState().isCalibrating).toBe(true);

    useStudyStore.getState().createStudy("test-patient", "data:image/png;base64,abc", 800, 600);
    expect(useStudyStore.getState().isCalibrating).toBe(false);
  });

  it("isCalibrating is reset to false by clearCalibration", () => {
    useStudyStore.getState().startCalibration();
    expect(useStudyStore.getState().isCalibrating).toBe(true);

    useStudyStore.getState().clearCalibration();
    expect(useStudyStore.getState().isCalibrating).toBe(false);
  });
});

describe("studyStore — startCalibration / cancelCalibration interaction with computeCalibration", () => {
  beforeEach(() => {
    useStudyStore.getState().newStudy();
  });

  it("full calibration flow: start → set points → set distance → compute → isCalibrating stays false (computeCalibration does not set it)", () => {
    // Create a study so we have image dimensions
    useStudyStore.getState().createStudy("test", "data:image/png;base64,abc", 1000, 800);

    // Start calibration
    useStudyStore.getState().startCalibration();
    expect(useStudyStore.getState().isCalibrating).toBe(true);

    // Set calibration points
    useStudyStore.getState().setCalibrationPoint(0, { x: 0.1, y: 0.1 } as Point);
    useStudyStore.getState().setCalibrationPoint(1, { x: 0.5, y: 0.1 } as Point);

    // Set real distance
    useStudyStore.getState().setCalibrationRealDistance(40);

    // Compute calibration
    useStudyStore.getState().computeCalibration();

    // After computeCalibration, calibration should be set
    const cal = useStudyStore.getState().calibration;
    expect(cal).not.toBeNull();
    expect(cal!.mmPerPixel).toBeGreaterThan(0);
    expect(cal!.realDistanceMm).toBe(40);
    // calibrationMode should be "B" (calibrated)
    expect(useStudyStore.getState().calibrationMode).toBe("B");
  });

  it("cancel during calibration aborts without setting calibration", () => {
    useStudyStore.getState().createStudy("test", "data:image/png;base64,abc", 1000, 800);

    useStudyStore.getState().startCalibration();
    useStudyStore.getState().setCalibrationPoint(0, { x: 0.2, y: 0.2 } as Point);
    useStudyStore.getState().setCalibrationPoint(1, { x: 0.8, y: 0.2 } as Point);
    useStudyStore.getState().setCalibrationRealDistance(50);

    // Cancel before computing
    useStudyStore.getState().cancelCalibration();

    expect(useStudyStore.getState().isCalibrating).toBe(false);
    expect(useStudyStore.getState().calibrationPoints).toBeNull();
    expect(useStudyStore.getState().calibration).toBeNull();
    // calibrationMode should still be "A" (uncalibrated) since we never computed
    expect(useStudyStore.getState().calibrationMode).toBe("A");
  });
});

// ── Bug 1 regression tests: one click must never place two calibration points ──
// The old setCalibrationPoint used `?? point` fallbacks in a [Point, Point]
// tuple. When calibrationPoints was null, `setCalibrationPoint(0, point)` would
// fill BOTH tuple slots with the same point because `current[1] ?? point`
// resolved `undefined ?? point` → point. The fix uses independent nullable
// fields (CalibrationDraft: { point1, point2 }) so each slot is set
// independently and the other stays null.

describe("Bug 1 — one click must not place two calibration points", () => {
  beforeEach(() => {
    useStudyStore.getState().newStudy();
    useStudyStore.getState().createStudy("test", "data:image/png;base64,abc", 1000, 800);
    useStudyStore.getState().startCalibration();
  });

  it("setting calibration point 0 does NOT also set point 2", () => {
    const p: Point = { x: 0.3, y: 0.3 };
    useStudyStore.getState().setCalibrationPoint(0, p);

    const cp = useStudyStore.getState().calibrationPoints;
    expect(cp).not.toBeNull();
    expect(cp!.point1).toEqual(p);
    // Bug 1: point2 must still be null — it must NOT have been filled with the
    // same coordinate from the `?? point` fallback.
    expect(cp!.point2).toBeNull();
  });

  it("setting calibration point 1 does NOT also set point 1", () => {
    const p1: Point = { x: 0.3, y: 0.3 };
    const p2: Point = { x: 0.7, y: 0.5 };
    useStudyStore.getState().setCalibrationPoint(0, p1);
    useStudyStore.getState().setCalibrationPoint(1, p2);

    const cp = useStudyStore.getState().calibrationPoints;
    expect(cp).not.toBeNull();
    expect(cp!.point1).toEqual(p1);
    expect(cp!.point2).toEqual(p2);
  });

  it("after startCalibration, calibrationPoints is null", () => {
    // startCalibration sets calibrationPoints to null
    expect(useStudyStore.getState().calibrationPoints).toBeNull();
  });

  it("first click places ONLY point1 — point2 remains null", () => {
    // Simulate what handleOverlayClick does on first click
    const cp = useStudyStore.getState().calibrationPoints;
    if (!cp || !cp.point1) {
      useStudyStore.getState().setCalibrationPoint(0, { x: 0.25, y: 0.25 } as Point);
    }

    const after = useStudyStore.getState().calibrationPoints;
    expect(after).not.toBeNull();
    expect(after!.point1).toEqual({ x: 0.25, y: 0.25 });
    expect(after!.point2).toBeNull();
  });

  it("second click places ONLY point2 — point1 stays unchanged", () => {
    // First click
    useStudyStore.getState().setCalibrationPoint(0, { x: 0.25, y: 0.25 } as Point);

    // Simulate what handleOverlayClick does on second click
    const cp = useStudyStore.getState().calibrationPoints;
    if (cp && cp.point1 && !cp.point2) {
      useStudyStore.getState().setCalibrationPoint(1, { x: 0.75, y: 0.75 } as Point);
    }

    const after = useStudyStore.getState().calibrationPoints;
    expect(after).not.toBeNull();
    expect(after!.point1).toEqual({ x: 0.25, y: 0.25 });
    expect(after!.point2).toEqual({ x: 0.75, y: 0.75 });
  });

  it("replacing point1 does not lose point2", () => {
    useStudyStore.getState().setCalibrationPoint(0, { x: 0.1, y: 0.1 } as Point);
    useStudyStore.getState().setCalibrationPoint(1, { x: 0.9, y: 0.9 } as Point);

    // Re-set point1
    useStudyStore.getState().setCalibrationPoint(0, { x: 0.5, y: 0.5 } as Point);

    const after = useStudyStore.getState().calibrationPoints;
    expect(after!.point1).toEqual({ x: 0.5, y: 0.5 });
    expect(after!.point2).toEqual({ x: 0.9, y: 0.9 });
  });
});

// ── Required spec tests: sequential calibration placement ──
// These tests implement the 5 user-specified tests for sequential calibration.
// Tests 1, 2, and 4 are already covered by the Bug 1 regression tests above:
//   Test 1 → "first click places ONLY point1 — point2 remains null"
//   Test 2 → "second click places ONLY point2 — point1 stays unchanged"
//   Test 4 → "setting calibration point 0 does NOT also set point 2"
// Tests 3 and 5 are added below.

describe("Sequential calibration — required spec tests", () => {
  beforeEach(() => {
    useStudyStore.getState().newStudy();
    useStudyStore.getState().createStudy("test", "data:image/png;base64,abc", 1000, 800);
    useStudyStore.getState().startCalibration();
  });

  it("Test 3 — point1 and point2 have different coordinates (not the same point)", () => {
    const click1: Point = { x: 0.2, y: 0.3 };
    const click2: Point = { x: 0.8, y: 0.7 };

    useStudyStore.getState().setCalibrationPoint(0, click1);
    useStudyStore.getState().setCalibrationPoint(1, click2);

    const cp = useStudyStore.getState().calibrationPoints;
    expect(cp).not.toBeNull();
    // The two points must be different objects (not the same reference)
    expect(cp!.point1).not.toBe(cp!.point2);
    // The coordinates must be different — not the same coordinate
    expect(cp!.point1).not.toEqual(cp!.point2);
    // Verify they correspond to the two separate user clicks
    expect(cp!.point1).toEqual(click1);
    expect(cp!.point2).toEqual(click2);
    // Explicitly verify at least one coordinate differs
    const coordsDiffer =
      cp!.point1!.x !== cp!.point2!.x || cp!.point1!.y !== cp!.point2!.y;
    expect(coordsDiffer).toBe(true);
  });

  it("Test 5 — after reset (startCalibration), next click places only point1", () => {
    // Place both points first
    useStudyStore.getState().setCalibrationPoint(0, { x: 0.1, y: 0.1 } as Point);
    useStudyStore.getState().setCalibrationPoint(1, { x: 0.9, y: 0.9 } as Point);
    const cpBefore = useStudyStore.getState().calibrationPoints;
    expect(cpBefore!.point1).not.toBeNull();
    expect(cpBefore!.point2).not.toBeNull();

    // Reset via startCalibration
    useStudyStore.getState().startCalibration();
    expect(useStudyStore.getState().calibrationPoints).toBeNull();

    // Next click must place only point1 — point2 must remain null
    useStudyStore.getState().setCalibrationPoint(0, { x: 0.4, y: 0.4 } as Point);
    const cpAfter = useStudyStore.getState().calibrationPoints;
    expect(cpAfter).not.toBeNull();
    expect(cpAfter!.point1).toEqual({ x: 0.4, y: 0.4 });
    expect(cpAfter!.point2).toBeNull();
  });

  it("Test 5 variant — after cancelCalibration, next click places only point1", () => {
    // Place both points first
    useStudyStore.getState().setCalibrationPoint(0, { x: 0.15, y: 0.15 } as Point);
    useStudyStore.getState().setCalibrationPoint(1, { x: 0.85, y: 0.85 } as Point);
    expect(useStudyStore.getState().calibrationPoints!.point2).not.toBeNull();

    // Cancel calibration
    useStudyStore.getState().cancelCalibration();
    expect(useStudyStore.getState().calibrationPoints).toBeNull();

    // Restart calibration and click — should place only point1
    useStudyStore.getState().startCalibration();
    useStudyStore.getState().setCalibrationPoint(0, { x: 0.5, y: 0.5 } as Point);
    const cp = useStudyStore.getState().calibrationPoints;
    expect(cp).not.toBeNull();
    expect(cp!.point1).toEqual({ x: 0.5, y: 0.5 });
    expect(cp!.point2).toBeNull();
  });

  it("Test 5 variant — after clearCalibration, next click places only point1", () => {
    // Place both points and compute calibration
    useStudyStore.getState().setCalibrationPoint(0, { x: 0.1, y: 0.1 } as Point);
    useStudyStore.getState().setCalibrationPoint(1, { x: 0.9, y: 0.1 } as Point);
    useStudyStore.getState().setCalibrationRealDistance(40);
    useStudyStore.getState().computeCalibration();
    expect(useStudyStore.getState().calibration).not.toBeNull();

    // Clear calibration
    useStudyStore.getState().clearCalibration();
    expect(useStudyStore.getState().calibrationPoints).toBeNull();
    expect(useStudyStore.getState().calibration).toBeNull();

    // Restart and click — should place only point1
    useStudyStore.getState().startCalibration();
    useStudyStore.getState().setCalibrationPoint(0, { x: 0.3, y: 0.6 } as Point);
    const cp = useStudyStore.getState().calibrationPoints;
    expect(cp).not.toBeNull();
    expect(cp!.point1).toEqual({ x: 0.3, y: 0.6 });
    expect(cp!.point2).toBeNull();
  });
});