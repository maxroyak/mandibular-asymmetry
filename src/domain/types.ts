// ── Core Domain Types ─────────────────────────────────────────
// All types for the Mandibular Asymmetry Analysis domain layer.
// Pure data definitions — no React imports, no side effects.

/** Normalized point: x and y in range [0.0, 1.0] */
export type Point = { x: number; y: number };

/** The 5 anatomical landmarks */
export type LandmarkName = "CoR" | "GoR" | "CoL" | "GoL" | "Me";

/** Partial set of placed landmarks */
export type LandmarkSet = Partial<Record<LandmarkName, Point>>;

/** Calibration data (user-marked reference distance) */
export interface Calibration {
  pixelDistance: number; // distance between calibration points in image px
  realDistanceMm: number; // known real-world distance
  mmPerPixel: number; // computed: realDistanceMm / pixelDistance
}

/**
 * Calibration draft state during the interactive calibration workflow.
 *
 * `point1` and `point2` are stored as INDEPENDENT nullable fields so that a
 * single click can never accidentally populate both slots. Placement logic
 * is strictly sequential and driven by the CalibrationStage state machine:
 *
 *   placing-point-1  → first click places point1, transitions to reviewing-point-1
 *   reviewing-point-1 → user confirms, transitions to placing-point-2
 *   placing-point-2  → next click places point2, transitions to reviewing-point-2
 *   reviewing-point-2 → user confirms, transitions to entering-distance
 *   entering-distance → user enters known mm, confirms → calibrated
 */
export interface CalibrationDraft {
  point1: Point | null;
  point2: Point | null;
}

/**
 * Explicit state machine for the calibration workflow.
 * No stage may be skipped — each transition requires a specific user action.
 *
 *   idle             → (click "Calibrate image") → placing-point-1
 *   placing-point-1  → (image click places Point 1) → reviewing-point-1
 *   reviewing-point-1 → (click Confirm Point 1) → placing-point-2
 *   placing-point-2  → (image click places Point 2) → reviewing-point-2
 *   reviewing-point-2 → (click Confirm Point 2) → entering-distance
 *   entering-distance → (enter distance, click Confirm) → calibrated
 *   calibrated       → (click Recalibrate) → placing-point-1 (saves previous)
 */
export type CalibrationStage =
  | "idle"
  | "placing-point-1"
  | "reviewing-point-1"
  | "placing-point-2"
  | "reviewing-point-2"
  | "entering-distance"
  | "calibrated";

/** Larger measured side determination */
export type LargerSide = "right" | "left" | "equal";

/** Asymmetry classification tiers */
export type AsymmetryTier =
  | "within_typical_range"
  | "borderline"
  | "above_technical_error_margin";

/** Side difference result */
export interface SideDifference {
  difference: number; // R − L (signed)
  absoluteDifference: number; // |R − L|
}

/** Complete measurement for one anatomical measurement (ramus or body) */
export interface MeasurementResult {
  right: number; // right-side distance (normalized)
  left: number; // left-side distance (normalized)
  difference: number; // R − L (signed)
  absoluteDifference: number; // |R − L|
  relativeDifferencePercent: number; // |R−L| / max(R,L) × 100
  asymmetryIndexPercent: number; // |R−L| / (R+L) × 100 (absolute)
  largerSide: LargerSide;
  classification: AsymmetryTier | null; // null = not classified (horizontal measurements)
  rightMm: number | null; // null when uncalibrated
  leftMm: number | null; // null when uncalibrated
}

/** All measurements for a study */
export interface StudyMeasurements {
  ramusHeight: MeasurementResult | null; // null if landmarks incomplete
  bodyLength: MeasurementResult | null;
}

/** Full results for clinical summary generation */
export interface FullResults {
  ramusHeight: MeasurementResult | null;
  bodyLength: MeasurementResult | null;
  calibration: Calibration | null;
  calibrationMode: "A" | "B";
}

// ── Bilateral mm measurement (Part 2 change request) ───────

/** Bilateral measurement in millimeters with side-to-side comparison */
export type BilateralMeasurement = {
  rightMm: number;
  leftMm: number;
  differenceMm: number; // signed: right − left
  absoluteDifferenceMm: number; // |right − left|
  longerSide: "right" | "left" | "equal";
  shorterSide: "right" | "left" | "equal";
  relativeDifferencePercent?: number;
  asymmetryIndexPercent?: number;
};

/** Mandibular asymmetry result with ramus, body, and conclusion */
export type MandibularAsymmetryResult = {
  ramus: BilateralMeasurement;
  body: BilateralMeasurement;
  conclusion: string;
};

/** Landmark metadata for UI display */
export interface LandmarkMeta {
  name: LandmarkName;
  label: string;
  fullName: string;
  hint: string;
  side: "right" | "left" | "midline";
  order: number;
}

/** Ordered landmark definitions for the placement workflow */
export const LANDMARK_DEFINITIONS: LandmarkMeta[] = [
  {
    name: "CoR",
    label: "CoR",
    fullName: "Condylion (Right)",
    hint: "Most superior point of the right condylar head",
    side: "right",
    order: 0,
  },
  {
    name: "GoR",
    label: "GoR",
    fullName: "Gonion (Right)",
    hint: "Most posterior-inferior point of the right gonial angle",
    side: "right",
    order: 1,
  },
  {
    name: "CoL",
    label: "CoL",
    fullName: "Condylion (Left)",
    hint: "Most superior point of the left condylar head",
    side: "left",
    order: 2,
  },
  {
    name: "GoL",
    label: "GoL",
    fullName: "Gonion (Left)",
    hint: "Most posterior-inferior point of the left gonial angle",
    side: "left",
    order: 3,
  },
  {
    name: "Me",
    label: "Me",
    fullName: "Menton",
    hint: "Most inferior point of the mental symphysis (menton)",
    side: "midline",
    order: 4,
  },
];