import { describe, it, expect, beforeEach } from "vitest";
import { useStudyStore } from "./studyStore";
import type { Point, LandmarkName } from "../domain/types";

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

// ── Store: calibrationStage state machine tests ──
// These tests cover the calibration state machine redesign.
// The old isCalibrating boolean is replaced by calibrationStage.
// The old setCalibrationPoint(index, point) is replaced by
// placeCalibrationPoint(point) which uses the stage to decide which point to set.

describe("studyStore — calibrationStage state machine", () => {
  beforeEach(() => {
    useStudyStore.getState().newStudy();
  });

  it("calibrationStage defaults to idle", () => {
    expect(useStudyStore.getState().calibrationStage).toBe("idle");
  });

  it("startCalibration sets stage to placing-point-1", () => {
    useStudyStore.getState().startCalibration();
    expect(useStudyStore.getState().calibrationStage).toBe("placing-point-1");
  });

  it("startCalibration clears calibrationPoints", () => {
    useStudyStore.getState().startCalibration();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.3, y: 0.3 });
    expect(useStudyStore.getState().calibrationPoints).not.toBeNull();

    useStudyStore.getState().startCalibration();
    expect(useStudyStore.getState().calibrationPoints).not.toBeNull();
    expect(useStudyStore.getState().calibrationPoints?.point1).toBeNull();
    expect(useStudyStore.getState().calibrationPoints?.point2).toBeNull();
  });

  it("cancelCalibration sets stage to idle", () => {
    useStudyStore.getState().startCalibration();
    expect(useStudyStore.getState().calibrationStage).toBe("placing-point-1");

    useStudyStore.getState().cancelCalibration();
    expect(useStudyStore.getState().calibrationStage).toBe("idle");
  });

  it("cancelCalibration clears calibrationPoints", () => {
    useStudyStore.getState().startCalibration();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.3, y: 0.3 });
    expect(useStudyStore.getState().calibrationPoints?.point1).not.toBeNull();

    useStudyStore.getState().cancelCalibration();
    expect(useStudyStore.getState().calibrationPoints).toBeNull();
  });

  it("calibrationStage is reset to idle by newStudy", () => {
    useStudyStore.getState().startCalibration();
    expect(useStudyStore.getState().calibrationStage).toBe("placing-point-1");

    useStudyStore.getState().newStudy();
    expect(useStudyStore.getState().calibrationStage).toBe("idle");
  });

  it("calibrationStage is reset to idle by createStudy", () => {
    useStudyStore.getState().startCalibration();
    expect(useStudyStore.getState().calibrationStage).toBe("placing-point-1");

    useStudyStore.getState().createStudy("test-patient", "data:image/png;base64,abc", 800, 600);
    expect(useStudyStore.getState().calibrationStage).toBe("idle");
  });

  it("calibrationStage is reset to idle by clearCalibration", () => {
    useStudyStore.getState().startCalibration();
    expect(useStudyStore.getState().calibrationStage).toBe("placing-point-1");

    useStudyStore.getState().clearCalibration();
    expect(useStudyStore.getState().calibrationStage).toBe("idle");
  });
});

// ── State machine transition tests ──
// Each transition must be explicit — no stage may be skipped.

describe("studyStore — calibration state machine transitions", () => {
  beforeEach(() => {
    useStudyStore.getState().newStudy();
    useStudyStore.getState().createStudy("test", "data:image/png;base64,abc", 1000, 800);
  });

  it("full flow: start → place P1 → confirm P1 → place P2 → confirm P2 → enter distance → confirm → calibrated", () => {
    // Start
    useStudyStore.getState().startCalibration();
    expect(useStudyStore.getState().calibrationStage).toBe("placing-point-1");

    // Place Point 1
    useStudyStore.getState().placeCalibrationPoint({ x: 0.1, y: 0.1 });
    expect(useStudyStore.getState().calibrationStage).toBe("reviewing-point-1");
    expect(useStudyStore.getState().calibrationPoints?.point1).toEqual({ x: 0.1, y: 0.1 });
    expect(useStudyStore.getState().calibrationPoints?.point2).toBeNull();

    // Confirm Point 1
    useStudyStore.getState().confirmPoint1();
    expect(useStudyStore.getState().calibrationStage).toBe("placing-point-2");

    // Place Point 2
    useStudyStore.getState().placeCalibrationPoint({ x: 0.5, y: 0.1 });
    expect(useStudyStore.getState().calibrationStage).toBe("reviewing-point-2");
    expect(useStudyStore.getState().calibrationPoints?.point1).toEqual({ x: 0.1, y: 0.1 });
    expect(useStudyStore.getState().calibrationPoints?.point2).toEqual({ x: 0.5, y: 0.1 });

    // Confirm Point 2
    useStudyStore.getState().confirmPoint2();
    expect(useStudyStore.getState().calibrationStage).toBe("entering-distance");

    // Confirm calibration with known distance
    useStudyStore.getState().confirmCalibration(40);
    expect(useStudyStore.getState().calibrationStage).toBe("calibrated");
    expect(useStudyStore.getState().calibration).not.toBeNull();
    expect(useStudyStore.getState().calibration!.realDistanceMm).toBe(40);
    expect(useStudyStore.getState().calibration!.mmPerPixel).toBeGreaterThan(0);
    expect(useStudyStore.getState().calibrationMode).toBe("B");
  });

  it("placeCalibrationPoint in placing-point-1 places only point1 and transitions to reviewing-point-1", () => {
    useStudyStore.getState().startCalibration();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.25, y: 0.25 });

    const cp = useStudyStore.getState().calibrationPoints;
    expect(cp).not.toBeNull();
    expect(cp!.point1).toEqual({ x: 0.25, y: 0.25 });
    expect(cp!.point2).toBeNull();
    expect(useStudyStore.getState().calibrationStage).toBe("reviewing-point-1");
  });

  it("placeCalibrationPoint in placing-point-2 places only point2 and transitions to reviewing-point-2", () => {
    useStudyStore.getState().startCalibration();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.25, y: 0.25 });
    useStudyStore.getState().confirmPoint1();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.75, y: 0.75 });

    const cp = useStudyStore.getState().calibrationPoints;
    expect(cp!.point1).toEqual({ x: 0.25, y: 0.25 });
    expect(cp!.point2).toEqual({ x: 0.75, y: 0.75 });
    expect(useStudyStore.getState().calibrationStage).toBe("reviewing-point-2");
  });

  it("placeCalibrationPoint does nothing when not in a placing stage", () => {
    useStudyStore.getState().startCalibration();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.1, y: 0.1 });
    // Now in reviewing-point-1 — placing should be ignored
    useStudyStore.getState().placeCalibrationPoint({ x: 0.9, y: 0.9 });
    expect(useStudyStore.getState().calibrationStage).toBe("reviewing-point-1");
    expect(useStudyStore.getState().calibrationPoints?.point2).toBeNull();
  });

  it("confirmPoint1 only works from reviewing-point-1", () => {
    useStudyStore.getState().startCalibration();
    // Not yet in reviewing-point-1 — confirm should be no-op
    useStudyStore.getState().confirmPoint1();
    expect(useStudyStore.getState().calibrationStage).toBe("placing-point-1");

    // Place point 1 → now in reviewing-point-1
    useStudyStore.getState().placeCalibrationPoint({ x: 0.1, y: 0.1 });
    useStudyStore.getState().confirmPoint1();
    expect(useStudyStore.getState().calibrationStage).toBe("placing-point-2");
  });

  it("confirmPoint2 only works from reviewing-point-2", () => {
    useStudyStore.getState().startCalibration();
    useStudyStore.getState().confirmPoint2();
    expect(useStudyStore.getState().calibrationStage).toBe("placing-point-1");
  });

  it("resetPoint1 clears point1 and goes back to placing-point-1", () => {
    useStudyStore.getState().startCalibration();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.1, y: 0.1 });
    expect(useStudyStore.getState().calibrationStage).toBe("reviewing-point-1");

    useStudyStore.getState().resetPoint1();
    expect(useStudyStore.getState().calibrationStage).toBe("placing-point-1");
    expect(useStudyStore.getState().calibrationPoints?.point1).toBeNull();
    expect(useStudyStore.getState().calibrationPoints?.point2).toBeNull();
  });

  it("resetPoint2 clears point2 and goes back to placing-point-2 (keeps point1)", () => {
    useStudyStore.getState().startCalibration();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.1, y: 0.1 });
    useStudyStore.getState().confirmPoint1();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.5, y: 0.5 });
    expect(useStudyStore.getState().calibrationStage).toBe("reviewing-point-2");

    useStudyStore.getState().resetPoint2();
    expect(useStudyStore.getState().calibrationStage).toBe("placing-point-2");
    expect(useStudyStore.getState().calibrationPoints?.point1).toEqual({ x: 0.1, y: 0.1 });
    expect(useStudyStore.getState().calibrationPoints?.point2).toBeNull();
  });

  it("confirmCalibration only works from entering-distance stage", () => {
    useStudyStore.getState().startCalibration();
    // Not in entering-distance — should be no-op
    useStudyStore.getState().confirmCalibration(40);
    expect(useStudyStore.getState().calibration).toBeNull();
    expect(useStudyStore.getState().calibrationStage).toBe("placing-point-1");
  });

  it("confirmCalibration rejects non-positive distance", () => {
    useStudyStore.getState().startCalibration();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.1, y: 0.1 });
    useStudyStore.getState().confirmPoint1();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.5, y: 0.1 });
    useStudyStore.getState().confirmPoint2();
    expect(useStudyStore.getState().calibrationStage).toBe("entering-distance");

    useStudyStore.getState().confirmCalibration(0);
    expect(useStudyStore.getState().calibration).toBeNull();
    expect(useStudyStore.getState().calibrationStage).toBe("entering-distance");

    useStudyStore.getState().confirmCalibration(-5);
    expect(useStudyStore.getState().calibration).toBeNull();
    expect(useStudyStore.getState().calibrationStage).toBe("entering-distance");
  });

  it("goBackCalibration steps back correctly across all stages", () => {
    // 1. placing-point-1 → idle
    useStudyStore.getState().startCalibration();
    expect(useStudyStore.getState().calibrationStage).toBe("placing-point-1");
    useStudyStore.getState().goBackCalibration();
    expect(useStudyStore.getState().calibrationStage).toBe("idle");

    // 2. reviewing-point-1 → placing-point-1 (clears point1)
    useStudyStore.getState().startCalibration();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.1, y: 0.1 });
    expect(useStudyStore.getState().calibrationStage).toBe("reviewing-point-1");
    useStudyStore.getState().goBackCalibration();
    expect(useStudyStore.getState().calibrationStage).toBe("placing-point-1");
    expect(useStudyStore.getState().calibrationPoints?.point1).toBeNull();

    // 3. placing-point-2 → reviewing-point-1 (retains point1)
    useStudyStore.getState().placeCalibrationPoint({ x: 0.1, y: 0.1 });
    useStudyStore.getState().confirmPoint1();
    expect(useStudyStore.getState().calibrationStage).toBe("placing-point-2");
    useStudyStore.getState().goBackCalibration();
    expect(useStudyStore.getState().calibrationStage).toBe("reviewing-point-1");
    expect(useStudyStore.getState().calibrationPoints?.point1).toEqual({ x: 0.1, y: 0.1 });

    // 4. reviewing-point-2 → placing-point-2 (clears point2, retains point1)
    useStudyStore.getState().confirmPoint1();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.5, y: 0.5 });
    expect(useStudyStore.getState().calibrationStage).toBe("reviewing-point-2");
    useStudyStore.getState().goBackCalibration();
    expect(useStudyStore.getState().calibrationStage).toBe("placing-point-2");
    expect(useStudyStore.getState().calibrationPoints?.point1).toEqual({ x: 0.1, y: 0.1 });
    expect(useStudyStore.getState().calibrationPoints?.point2).toBeNull();

    // 5. entering-distance → reviewing-point-2 (retains point1 and point2)
    useStudyStore.getState().placeCalibrationPoint({ x: 0.5, y: 0.5 });
    useStudyStore.getState().confirmPoint2();
    expect(useStudyStore.getState().calibrationStage).toBe("entering-distance");
    useStudyStore.getState().goBackCalibration();
    expect(useStudyStore.getState().calibrationStage).toBe("reviewing-point-2");
    expect(useStudyStore.getState().calibrationPoints?.point1).toEqual({ x: 0.1, y: 0.1 });
    expect(useStudyStore.getState().calibrationPoints?.point2).toEqual({ x: 0.5, y: 0.5 });
  });

  it("cancelCalibration does NOT clear existing landmarks or measurements", () => {
    // Place a landmark
    useStudyStore.getState().setLandmark("CoR", { x: 0.5, y: 0.3 });
    expect(Object.keys(useStudyStore.getState().landmarks)).toContain("CoR");

    // Start calibration and cancel
    useStudyStore.getState().startCalibration();
    useStudyStore.getState().cancelCalibration();

    // Landmarks should still be there
    expect(Object.keys(useStudyStore.getState().landmarks)).toContain("CoR");
    expect(useStudyStore.getState().landmarks.CoR).toEqual({ x: 0.5, y: 0.3 });
  });
});

// ── Cancel/restore tests ──

describe("studyStore — calibration cancel/restore", () => {
  beforeEach(() => {
    useStudyStore.getState().newStudy();
    useStudyStore.getState().createStudy("test", "data:image/png;base64,abc", 1000, 800);
  });

  it("startCalibration saves previousCalibration for restore", () => {
    // First, complete a calibration
    useStudyStore.getState().startCalibration();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.1, y: 0.1 });
    useStudyStore.getState().confirmPoint1();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.5, y: 0.1 });
    useStudyStore.getState().confirmPoint2();
    useStudyStore.getState().confirmCalibration(40);
    expect(useStudyStore.getState().calibration).not.toBeNull();
    expect(useStudyStore.getState().calibrationStage).toBe("calibrated");

    // Start a new calibration (recalibrate)
    useStudyStore.getState().startCalibration();
    expect(useStudyStore.getState().previousCalibration).not.toBeNull();
    expect(useStudyStore.getState().previousCalibration?.calibration).not.toBeNull();
  });

  it("cancelCalibration restores previous calibration when recalibrating", () => {
    // Complete a calibration first
    useStudyStore.getState().startCalibration();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.1, y: 0.1 });
    useStudyStore.getState().confirmPoint1();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.5, y: 0.1 });
    useStudyStore.getState().confirmPoint2();
    useStudyStore.getState().confirmCalibration(40);
    const originalMmPerPixel = useStudyStore.getState().calibration!.mmPerPixel;

    // Start recalibration
    useStudyStore.getState().startCalibration();
    expect(useStudyStore.getState().calibrationStage).toBe("placing-point-1");

    // Cancel — should restore the previous calibration
    useStudyStore.getState().cancelCalibration();
    expect(useStudyStore.getState().calibrationStage).toBe("calibrated");
    expect(useStudyStore.getState().calibration).not.toBeNull();
    expect(useStudyStore.getState().calibration!.mmPerPixel).toBe(originalMmPerPixel);
  });

  it("cancelCalibration goes to idle when no previous calibration existed", () => {
    // Start fresh calibration (no previous)
    useStudyStore.getState().startCalibration();
    useStudyStore.getState().cancelCalibration();
    expect(useStudyStore.getState().calibrationStage).toBe("idle");
    expect(useStudyStore.getState().calibration).toBeNull();
  });
});

// ── Bug 1 regression tests: one click must never place two calibration points ──
// The placeCalibrationPoint function uses the stage to decide which point to set.
// In placing-point-1, it sets ONLY point1. In placing-point-2, it sets ONLY point2.
// A single call can never set both points.

describe("Bug 1 — one click must not place two calibration points", () => {
  beforeEach(() => {
    useStudyStore.getState().newStudy();
    useStudyStore.getState().createStudy("test", "data:image/png;base64,abc", 1000, 800);
    useStudyStore.getState().startCalibration();
  });

  it("placing point1 does NOT also set point2", () => {
    useStudyStore.getState().placeCalibrationPoint({ x: 0.3, y: 0.3 });

    const cp = useStudyStore.getState().calibrationPoints;
    expect(cp).not.toBeNull();
    expect(cp!.point1).toEqual({ x: 0.3, y: 0.3 });
    expect(cp!.point2).toBeNull();
  });

  it("after placing point1 and confirming, placing point2 does NOT change point1", () => {
    useStudyStore.getState().placeCalibrationPoint({ x: 0.3, y: 0.3 });
    useStudyStore.getState().confirmPoint1();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.7, y: 0.5 });

    const cp = useStudyStore.getState().calibrationPoints;
    expect(cp!.point1).toEqual({ x: 0.3, y: 0.3 });
    expect(cp!.point2).toEqual({ x: 0.7, y: 0.5 });
  });

  it("after startCalibration, calibrationPoints has null point1 and point2", () => {
    expect(useStudyStore.getState().calibrationPoints).not.toBeNull();
    expect(useStudyStore.getState().calibrationPoints?.point1).toBeNull();
    expect(useStudyStore.getState().calibrationPoints?.point2).toBeNull();
  });

  it("first placement places ONLY point1 — point2 remains null", () => {
    useStudyStore.getState().placeCalibrationPoint({ x: 0.25, y: 0.25 });

    const after = useStudyStore.getState().calibrationPoints;
    expect(after).not.toBeNull();
    expect(after!.point1).toEqual({ x: 0.25, y: 0.25 });
    expect(after!.point2).toBeNull();
  });

  it("second placement places ONLY point2 — point1 stays unchanged", () => {
    useStudyStore.getState().placeCalibrationPoint({ x: 0.25, y: 0.25 });
    useStudyStore.getState().confirmPoint1();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.75, y: 0.75 });

    const after = useStudyStore.getState().calibrationPoints;
    expect(after!.point1).toEqual({ x: 0.25, y: 0.25 });
    expect(after!.point2).toEqual({ x: 0.75, y: 0.75 });
  });
});

// ── Required spec tests: sequential calibration placement ──

describe("Sequential calibration — required spec tests", () => {
  beforeEach(() => {
    useStudyStore.getState().newStudy();
    useStudyStore.getState().createStudy("test", "data:image/png;base64,abc", 1000, 800);
    useStudyStore.getState().startCalibration();
  });

  it("Test 3 — point1 and point2 have different coordinates (not the same point)", () => {
    const click1: Point = { x: 0.2, y: 0.3 };
    const click2: Point = { x: 0.8, y: 0.7 };

    useStudyStore.getState().placeCalibrationPoint(click1);
    useStudyStore.getState().confirmPoint1();
    useStudyStore.getState().placeCalibrationPoint(click2);

    const cp = useStudyStore.getState().calibrationPoints;
    expect(cp).not.toBeNull();
    expect(cp!.point1).not.toBe(cp!.point2);
    expect(cp!.point1).toEqual(click1);
    expect(cp!.point2).toEqual(click2);
    const coordsDiffer =
      cp!.point1!.x !== cp!.point2!.x || cp!.point1!.y !== cp!.point2!.y;
    expect(coordsDiffer).toBe(true);
  });

  it("Test 5 — after reset (startCalibration), next placement places only point1", () => {
    // Place both points first
    useStudyStore.getState().placeCalibrationPoint({ x: 0.1, y: 0.1 });
    useStudyStore.getState().confirmPoint1();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.9, y: 0.9 });
    expect(useStudyStore.getState().calibrationPoints?.point2).not.toBeNull();

    // Reset via startCalibration
    useStudyStore.getState().startCalibration();
    expect(useStudyStore.getState().calibrationPoints?.point1).toBeNull();
    expect(useStudyStore.getState().calibrationPoints?.point2).toBeNull();

    // Next placement must place only point1
    useStudyStore.getState().placeCalibrationPoint({ x: 0.4, y: 0.4 });
    const cp = useStudyStore.getState().calibrationPoints;
    expect(cp!.point1).toEqual({ x: 0.4, y: 0.4 });
    expect(cp!.point2).toBeNull();
  });

  it("Test 5 variant — after cancelCalibration, restart and next placement places only point1", () => {
    useStudyStore.getState().placeCalibrationPoint({ x: 0.15, y: 0.15 });
    useStudyStore.getState().cancelCalibration();
    expect(useStudyStore.getState().calibrationPoints).toBeNull();

    useStudyStore.getState().startCalibration();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.5, y: 0.5 });
    const cp = useStudyStore.getState().calibrationPoints;
    expect(cp!.point1).toEqual({ x: 0.5, y: 0.5 });
    expect(cp!.point2).toBeNull();
  });

  it("Test 5 variant — after clearCalibration, restart and next placement places only point1", () => {
    // Complete calibration
    useStudyStore.getState().placeCalibrationPoint({ x: 0.1, y: 0.1 });
    useStudyStore.getState().confirmPoint1();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.9, y: 0.1 });
    useStudyStore.getState().confirmPoint2();
    useStudyStore.getState().confirmCalibration(40);
    expect(useStudyStore.getState().calibration).not.toBeNull();

    // Clear calibration
    useStudyStore.getState().clearCalibration();
    expect(useStudyStore.getState().calibrationPoints).toBeNull();
    expect(useStudyStore.getState().calibration).toBeNull();

    // Restart and place — should place only point1
    useStudyStore.getState().startCalibration();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.3, y: 0.6 });
    const cp = useStudyStore.getState().calibrationPoints;
    expect(cp!.point1).toEqual({ x: 0.3, y: 0.6 });
    expect(cp!.point2).toBeNull();
  });
});

// ── moveCalibrationPoint tests ──

describe("studyStore — moveCalibrationPoint", () => {
  beforeEach(() => {
    useStudyStore.getState().newStudy();
    useStudyStore.getState().createStudy("test", "data:image/png;base64,abc", 1000, 800);
    useStudyStore.getState().startCalibration();
  });

  it("moveCalibrationPoint moves point1 during reviewing-point-1", () => {
    useStudyStore.getState().placeCalibrationPoint({ x: 0.1, y: 0.1 });
    expect(useStudyStore.getState().calibrationStage).toBe("reviewing-point-1");

    useStudyStore.getState().moveCalibrationPoint(1, { x: 0.2, y: 0.2 });
    expect(useStudyStore.getState().calibrationPoints?.point1).toEqual({ x: 0.2, y: 0.2 });
  });

  it("moveCalibrationPoint moves point2 during reviewing-point-2", () => {
    useStudyStore.getState().placeCalibrationPoint({ x: 0.1, y: 0.1 });
    useStudyStore.getState().confirmPoint1();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.5, y: 0.5 });
    expect(useStudyStore.getState().calibrationStage).toBe("reviewing-point-2");

    useStudyStore.getState().moveCalibrationPoint(2, { x: 0.6, y: 0.6 });
    expect(useStudyStore.getState().calibrationPoints?.point2).toEqual({ x: 0.6, y: 0.6 });
  });

  it("moveCalibrationPoint does nothing outside review stages", () => {
    // In placing-point-1 — move should be no-op
    useStudyStore.getState().moveCalibrationPoint(1, { x: 0.5, y: 0.5 });
    expect(useStudyStore.getState().calibrationPoints?.point1).toBeNull();
  });
});

// ── Required spec tests: 9 calibration state machine tests ──
// These tests implement the user's explicit 9-test spec for the calibration
// state machine. Some are already covered by DevBot's tests above; those are
// noted in the summary. The ones here are the ones that were missing or that
// the spec requires as standalone assertions (not bundled into a full-flow
// test).

describe("Required spec — 9 calibration state machine tests", () => {
  beforeEach(() => {
    useStudyStore.getState().newStudy();
    useStudyStore.getState().createStudy("test", "data:image/png;base64,abc", 1000, 800);
  });

  // Test 1 — Start calibration
  // Spec: after startCalibration(): stage="placing-point-1", point1=null, point2=null
  // (DevBot split this across two tests; this is the standalone spec version.)
  it("Test 1 — startCalibration sets stage and nulls both points", () => {
    useStudyStore.getState().startCalibration();
    expect(useStudyStore.getState().calibrationStage).toBe("placing-point-1");
    expect(useStudyStore.getState().calibrationPoints).not.toBeNull();
    expect(useStudyStore.getState().calibrationPoints?.point1).toBeNull();
    expect(useStudyStore.getState().calibrationPoints?.point2).toBeNull();
  });

  // Test 3 — Confirm Point 1
  // Spec: after confirmPoint1(): point1 != null, point2 == null, stage="placing-point-2"
  // (DevBot only checks this inside the full-flow test; this is standalone.)
  it("Test 3 — confirmPoint1 transitions to placing-point-2 keeping point1", () => {
    useStudyStore.getState().startCalibration();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.2, y: 0.2 });
    expect(useStudyStore.getState().calibrationStage).toBe("reviewing-point-1");

    useStudyStore.getState().confirmPoint1();
    expect(useStudyStore.getState().calibrationStage).toBe("placing-point-2");
    expect(useStudyStore.getState().calibrationPoints?.point1).toEqual({ x: 0.2, y: 0.2 });
    expect(useStudyStore.getState().calibrationPoints?.point2).toBeNull();
  });

  // Test 5 — Confirm Point 2
  // Spec: after confirmPoint2(): stage="entering-distance"
  // (DevBot only checks this inside the full-flow test; this is standalone.)
  it("Test 5 — confirmPoint2 transitions to entering-distance", () => {
    useStudyStore.getState().startCalibration();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.1, y: 0.1 });
    useStudyStore.getState().confirmPoint1();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.6, y: 0.1 });
    expect(useStudyStore.getState().calibrationStage).toBe("reviewing-point-2");

    useStudyStore.getState().confirmPoint2();
    expect(useStudyStore.getState().calibrationStage).toBe("entering-distance");
  });

  // Test 6 — Enter distance and confirm
  // Spec: pixelDistance=100px, knownDistance=20mm → mmPerPixel=0.2, stage="calibrated"
  // Setup: image is 1000x800, max dimension=1000, so normalized distance of 0.1
  // gives exactly 100px: 0.1 * 1000 = 100. mmPerPixel = 20 / 100 = 0.2.
  it("Test 6 — confirmCalibration with 100px distance and 20mm gives mmPerPixel=0.2", () => {
    useStudyStore.getState().startCalibration();
    // Horizontal line of normalized length 0.1 → 100px with 1000px max dimension
    useStudyStore.getState().placeCalibrationPoint({ x: 0.0, y: 0.5 });
    useStudyStore.getState().confirmPoint1();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.1, y: 0.5 });
    useStudyStore.getState().confirmPoint2();
    expect(useStudyStore.getState().calibrationStage).toBe("entering-distance");

    useStudyStore.getState().confirmCalibration(20);
    expect(useStudyStore.getState().calibrationStage).toBe("calibrated");
    expect(useStudyStore.getState().calibration).not.toBeNull();
    expect(useStudyStore.getState().calibration!.pixelDistance).toBeCloseTo(100, 10);
    expect(useStudyStore.getState().calibration!.realDistanceMm).toBe(20);
    expect(useStudyStore.getState().calibration!.mmPerPixel).toBeCloseTo(0.2, 10);
  });

  // Test 8 — Pan conflict (store-level)
  // Spec: while in placing-point-1 or placing-point-2, placeCalibrationPoint
  // must place a calibration point and NOT trigger pan or landmark changes.
  // Verify landmarks (CoR, CoL, GoR, GoL, Me) are unchanged after placement.
  it("Test 8 — calibration placement does not change pan or landmarks (placing-point-1)", () => {
    // Pre-populate all 5 landmarks
    const landmarks: Record<LandmarkName, Point> = {
      CoR: { x: 0.1, y: 0.1 },
      CoL: { x: 0.9, y: 0.1 },
      GoR: { x: 0.1, y: 0.9 },
      GoL: { x: 0.9, y: 0.9 },
      Me: { x: 0.5, y: 0.5 },
    };
    for (const [name, pt] of Object.entries(landmarks)) {
      useStudyStore.getState().setLandmark(name as LandmarkName, pt);
    }
    // Set a non-default pan
    useStudyStore.getState().setPan(123, 456);
    const panBefore = { ...useStudyStore.getState().viewer };
    const landmarksBefore = { ...useStudyStore.getState().landmarks };

    // Start calibration and place point1
    useStudyStore.getState().startCalibration();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.3, y: 0.3 });

    // Pan must be unchanged
    expect(useStudyStore.getState().viewer).toEqual(panBefore);

    // All 5 landmarks must be unchanged
    expect(useStudyStore.getState().landmarks).toEqual(landmarksBefore);
    expect(useStudyStore.getState().landmarks.CoR).toEqual(landmarks.CoR);
    expect(useStudyStore.getState().landmarks.CoL).toEqual(landmarks.CoL);
    expect(useStudyStore.getState().landmarks.GoR).toEqual(landmarks.GoR);
    expect(useStudyStore.getState().landmarks.GoL).toEqual(landmarks.GoL);
    expect(useStudyStore.getState().landmarks.Me).toEqual(landmarks.Me);

    // And the calibration point was actually placed
    expect(useStudyStore.getState().calibrationPoints?.point1).toEqual({ x: 0.3, y: 0.3 });
  });

  // Test 8 variant — placing-point-2
  it("Test 8 — calibration placement does not change pan or landmarks (placing-point-2)", () => {
    const landmarks: Record<LandmarkName, Point> = {
      CoR: { x: 0.11, y: 0.12 },
      CoL: { x: 0.88, y: 0.13 },
      GoR: { x: 0.14, y: 0.87 },
      GoL: { x: 0.86, y: 0.89 },
      Me: { x: 0.5, y: 0.52 },
    };
    for (const [name, pt] of Object.entries(landmarks)) {
      useStudyStore.getState().setLandmark(name as LandmarkName, pt);
    }
    useStudyStore.getState().setPan(200, 300);
    const panBefore = { ...useStudyStore.getState().viewer };
    const landmarksBefore = { ...useStudyStore.getState().landmarks };

    useStudyStore.getState().startCalibration();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.2, y: 0.2 });
    useStudyStore.getState().confirmPoint1();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.7, y: 0.7 });

    expect(useStudyStore.getState().viewer).toEqual(panBefore);
    expect(useStudyStore.getState().landmarks).toEqual(landmarksBefore);
    expect(useStudyStore.getState().calibrationPoints?.point2).toEqual({ x: 0.7, y: 0.7 });
  });

  // Test 9 — Landmark conflict
  // Spec: calibration placement must not modify any anatomical landmark.
  // After placing calibration points, verify all 5 landmarks have the same
  // coordinates as before. This is the pure landmark-focused assertion.
  it("Test 9 — calibration placement preserves all 5 landmark coordinates", () => {
    const original: Record<LandmarkName, Point> = {
      CoR: { x: 0.15, y: 0.2 },
      CoL: { x: 0.85, y: 0.2 },
      GoR: { x: 0.15, y: 0.8 },
      GoL: { x: 0.85, y: 0.8 },
      Me: { x: 0.5, y: 0.55 },
    };
    for (const [name, pt] of Object.entries(original)) {
      useStudyStore.getState().setLandmark(name as LandmarkName, pt);
    }

    const before = { ...useStudyStore.getState().landmarks };

    // Place both calibration points through the full flow
    useStudyStore.getState().startCalibration();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.3, y: 0.4 });
    useStudyStore.getState().confirmPoint1();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.7, y: 0.4 });
    useStudyStore.getState().confirmPoint2();

    const after = useStudyStore.getState().landmarks;
    expect(after).toEqual(before);
    expect(after.CoR).toEqual(original.CoR);
    expect(after.CoL).toEqual(original.CoL);
    expect(after.GoR).toEqual(original.GoR);
    expect(after.GoL).toEqual(original.GoL);
    expect(after.Me).toEqual(original.Me);
  });
});

// ── Language / i18n store tests ──────────────────────────────

describe("studyStore — language and i18n", () => {
  beforeEach(() => {
    useStudyStore.getState().newStudy();
    useStudyStore.getState().setLanguage("en");
  });

  it("language defaults to 'en'", () => {
    expect(useStudyStore.getState().language).toBe("en");
  });

  it("setLanguage('ru') updates store and persists to localStorage", () => {
    useStudyStore.getState().setLanguage("ru");
    expect(useStudyStore.getState().language).toBe("ru");
    expect(localStorage.getItem("ma.language")).toBe("ru");
  });

  it("setLanguage switches conclusion and clinical interpretation between EN and RU", () => {
    // Set up study with all 5 landmarks and calibration
    useStudyStore.getState().createStudy("test-i18n", "data:image/png;base64,abc", 1000, 1000);
    useStudyStore.getState().setLandmark("CoR", { x: 0.2, y: 0.2 });
    useStudyStore.getState().setLandmark("GoR", { x: 0.2, y: 0.8 });
    useStudyStore.getState().setLandmark("CoL", { x: 0.8, y: 0.22 });
    useStudyStore.getState().setLandmark("GoL", { x: 0.8, y: 0.8 });
    useStudyStore.getState().setLandmark("Me", { x: 0.5, y: 0.9 });

    // Calibrate
    useStudyStore.getState().startCalibration();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.1, y: 0.1 });
    useStudyStore.getState().confirmPoint1();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.1, y: 0.2 });
    useStudyStore.getState().confirmPoint2();
    useStudyStore.getState().confirmCalibration(10); // 10mm for 0.1 distance

    // Initially English
    expect(useStudyStore.getState().language).toBe("en");
    expect(useStudyStore.getState().mandibularResult?.conclusion).toContain("The right ramus measures");
    expect(useStudyStore.getState().interpretation).toContain("CLINICAL MEASUREMENT REPORT");

    // Switch to Russian
    useStudyStore.getState().setLanguage("ru");
    expect(useStudyStore.getState().language).toBe("ru");
    expect(useStudyStore.getState().mandibularResult?.conclusion).toContain("Ветвь справа составляет");
    expect(useStudyStore.getState().interpretation).toContain("ОТЧЕТ КЛИНИЧЕСКИХ ИЗМЕРЕНИЙ");

    // Switch back to English
    useStudyStore.getState().setLanguage("en");
    expect(useStudyStore.getState().language).toBe("en");
    expect(useStudyStore.getState().mandibularResult?.conclusion).toContain("The right ramus measures");
    expect(useStudyStore.getState().interpretation).toContain("CLINICAL MEASUREMENT REPORT");
  });
});

describe("moveCalibrationPoint — Drag-to-adjust calibration points", () => {
  beforeEach(() => {
    storageMap.clear();
    useStudyStore.getState().newStudy();
    useStudyStore.getState().createStudy("test-cal-drag", "data:image/png;base64,abc", 1000, 1000);
    useStudyStore.getState().startCalibration();
  });

  it("allows dragging point1 during reviewing-point-1 stage with boundary clamping", () => {
    useStudyStore.getState().placeCalibrationPoint({ x: 0.2, y: 0.2 });
    expect(useStudyStore.getState().calibrationStage).toBe("reviewing-point-1");

    // Drag point 1 to valid coordinates
    useStudyStore.getState().moveCalibrationPoint(1, { x: 0.25, y: 0.3 });
    expect(useStudyStore.getState().calibrationPoints?.point1).toEqual({ x: 0.25, y: 0.3 });

    // Drag point 1 beyond bounds — should clamp to [0, 1]
    useStudyStore.getState().moveCalibrationPoint(1, { x: -0.1, y: 1.2 });
    expect(useStudyStore.getState().calibrationPoints?.point1).toEqual({ x: 0, y: 1 });
  });

  it("allows dragging both point1 and point2 during reviewing-point-2 and entering-distance stages", () => {
    useStudyStore.getState().placeCalibrationPoint({ x: 0.2, y: 0.2 });
    useStudyStore.getState().confirmPoint1();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.8, y: 0.8 });
    expect(useStudyStore.getState().calibrationStage).toBe("reviewing-point-2");

    // Adjust point 1 during point 2 review
    useStudyStore.getState().moveCalibrationPoint(1, { x: 0.22, y: 0.22 });
    expect(useStudyStore.getState().calibrationPoints?.point1).toEqual({ x: 0.22, y: 0.22 });

    // Adjust point 2 during point 2 review
    useStudyStore.getState().moveCalibrationPoint(2, { x: 0.82, y: 0.82 });
    expect(useStudyStore.getState().calibrationPoints?.point2).toEqual({ x: 0.82, y: 0.82 });

    // Move to entering-distance
    useStudyStore.getState().confirmPoint2();
    expect(useStudyStore.getState().calibrationStage).toBe("entering-distance");

    // Both points remain adjustable during entering-distance
    useStudyStore.getState().moveCalibrationPoint(1, { x: 0.15, y: 0.15 });
    useStudyStore.getState().moveCalibrationPoint(2, { x: 0.85, y: 0.85 });
    expect(useStudyStore.getState().calibrationPoints?.point1).toEqual({ x: 0.15, y: 0.15 });
    expect(useStudyStore.getState().calibrationPoints?.point2).toEqual({ x: 0.85, y: 0.85 });
  });

  it("updates calibration scale in real-time when dragging points after calibration is complete", () => {
    useStudyStore.getState().placeCalibrationPoint({ x: 0.2, y: 0.2 });
    useStudyStore.getState().confirmPoint1();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.2, y: 0.4 }); // 200px
    useStudyStore.getState().confirmPoint2();
    useStudyStore.getState().confirmCalibration(20); // 20mm for 200px = 0.1 mm/px

    expect(useStudyStore.getState().calibrationStage).toBe("calibrated");
    expect(useStudyStore.getState().calibration?.mmPerPixel).toBeCloseTo(0.1, 4);

    // Drag point 2 to y = 0.6 (400px distance)
    useStudyStore.getState().moveCalibrationPoint(2, { x: 0.2, y: 0.6 }); // 400px
    // 20mm for 400px = 0.05 mm/px
    expect(useStudyStore.getState().calibration?.mmPerPixel).toBeCloseTo(0.05, 4);
  });
});

// ── Radiograph Image Enhancement & Filter Suite Tests ────────

describe("studyStore — Image Filters & Enhancement Suite", () => {
  beforeEach(() => {
    storageMap.clear();
    useStudyStore.getState().newStudy();
  });

  it("filters state defaults to default baseline", () => {
    const filters = useStudyStore.getState().filters;
    expect(filters).toEqual({
      brightness: 100,
      contrast: 100,
      invert: false,
      sharpen: false,
      gamma: 1.0,
      preset: "default",
    });
  });

  it("setImageFilters updates partial fields and marks preset as 'custom'", () => {
    useStudyStore.getState().setImageFilters({ brightness: 125, contrast: 150 });
    const filters = useStudyStore.getState().filters;
    expect(filters.brightness).toBe(125);
    expect(filters.contrast).toBe(150);
    expect(filters.invert).toBe(false);
    expect(filters.preset).toBe("custom");
  });

  it("setImageFilters preserves custom preset if explicitly specified", () => {
    useStudyStore.getState().setImageFilters({ invert: true, preset: "inverted" });
    const filters = useStudyStore.getState().filters;
    expect(filters.invert).toBe(true);
    expect(filters.preset).toBe("inverted");
  });

  it("setFilterPreset applies preset parameters across all fields", () => {
    useStudyStore.getState().setFilterPreset("bone-enhanced");
    const filters = useStudyStore.getState().filters;
    expect(filters.preset).toBe("bone-enhanced");
    expect(filters.sharpen).toBe(true);
    expect(filters.contrast).toBeGreaterThan(100);

    useStudyStore.getState().setFilterPreset("inverted");
    expect(useStudyStore.getState().filters.preset).toBe("inverted");
    expect(useStudyStore.getState().filters.invert).toBe(true);
  });

  it("resetImageFilters restores filters to default", () => {
    useStudyStore.getState().setFilterPreset("high-contrast");
    expect(useStudyStore.getState().filters.preset).toBe("high-contrast");

    useStudyStore.getState().resetImageFilters();
    expect(useStudyStore.getState().filters).toEqual({
      brightness: 100,
      contrast: 100,
      invert: false,
      sharpen: false,
      gamma: 1.0,
      preset: "default",
    });
  });

  it("createStudy and newStudy initialize filters to default", () => {
    useStudyStore.getState().setImageFilters({ brightness: 140, invert: true });
    expect(useStudyStore.getState().filters.brightness).toBe(140);

    useStudyStore.getState().createStudy("patient-1", "data:image/png;base64,abc", 1000, 800);
    expect(useStudyStore.getState().filters.preset).toBe("default");
    expect(useStudyStore.getState().filters.brightness).toBe(100);
    expect(useStudyStore.getState().filters.invert).toBe(false);

    useStudyStore.getState().setFilterPreset("inverted");
    expect(useStudyStore.getState().filters.invert).toBe(true);

    useStudyStore.getState().newStudy();
    expect(useStudyStore.getState().filters.preset).toBe("default");
    expect(useStudyStore.getState().filters.invert).toBe(false);
  });

  it("saveStudy and loadStudy round-trip filters state", async () => {
    useStudyStore.getState().createStudy("patient-filters", "data:image/png;base64,mock", 1200, 800);
    useStudyStore.getState().setFilterPreset("bone-enhanced");

    const studyId = useStudyStore.getState().studyId!;
    await useStudyStore.getState().saveStudy();

    useStudyStore.getState().newStudy();
    expect(useStudyStore.getState().filters.preset).toBe("default");

    await useStudyStore.getState().loadStudy(studyId);
    expect(useStudyStore.getState().filters.preset).toBe("bone-enhanced");
    expect(useStudyStore.getState().filters.sharpen).toBe(true);
  });
});