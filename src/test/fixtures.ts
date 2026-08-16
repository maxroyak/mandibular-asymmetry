import type { LandmarkSet, Calibration } from "../domain/types";

// ── Mock Landmark Sets ──────────────────────────────────────

export const MOCK_LANDMARKS: LandmarkSet = {
  CoR: { x: 0.25, y: 0.20 },
  GoR: { x: 0.30, y: 0.70 },
  CoL: { x: 0.75, y: 0.20 },
  GoL: { x: 0.70, y: 0.70 },
  Me: { x: 0.50, y: 0.85 },
};

/** Symmetric landmarks — left and right are mirror images */
export const SYMMETRIC_LANDMARKS: LandmarkSet = {
  CoR: { x: 0.20, y: 0.15 },
  GoR: { x: 0.25, y: 0.70 },
  CoL: { x: 0.80, y: 0.15 },
  GoL: { x: 0.75, y: 0.70 },
  Me: { x: 0.50, y: 0.85 },
};

/** Asymmetric landmarks — right ramus is shorter */
export const ASYMMETRIC_LANDMARKS: LandmarkSet = {
  CoR: { x: 0.25, y: 0.30 }, // lower CoR = shorter right ramus
  GoR: { x: 0.30, y: 0.70 },
  CoL: { x: 0.75, y: 0.15 }, // higher CoL = taller left ramus
  GoL: { x: 0.70, y: 0.70 },
  Me: { x: 0.50, y: 0.85 },
};

export const MOCK_CALIBRATION: Calibration = {
  pixelDistance: 500,
  realDistanceMm: 40,
  mmPerPixel: 0.08,
};

export const MOCK_IMAGE_WIDTH = 2400;
export const MOCK_IMAGE_HEIGHT = 1200;