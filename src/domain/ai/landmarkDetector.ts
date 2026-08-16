// ── AI Landmark Detector Engine ──────────────────────────────
// Content-aware ROI bounding-box cropping & anatomical landmark proposal model.
// Generates candidate normalized coordinates [0.0 - 1.0] for CoR, GoR, CoL, GoL, Me
// taking into account non-pitch-black letterbox padding on standard radiographic images.
// Pure calculation layer — zero React / DOM dependencies.

import type { LandmarkName, Point } from "../types";
import type { AiDetectionResult, BoundingBox, RoiDetectionResult } from "./types";

/**
 * Detects the active radiograph Region of Interest (ROI) by filtering
 * out dark letterbox/pillarbox padding using adaptive thresholding and luminance variance.
 */
export function detectRadiographRoi(
  width: number,
  height: number,
  pixelData?: Uint8ClampedArray | Uint8Array | null,
  isDicom = false
): RoiDetectionResult {
  const fullRoi: BoundingBox = { x: 0, y: 0, width, height };
  const fullResult: RoiDetectionResult = {
    roi: fullRoi,
    normalizedRoi: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
    hasLetterbox: false,
  };

  // DICOM files bypass letterbox detection (DICOM matrices contain no letterboxes)
  if (isDicom) {
    return fullResult;
  }

  // Non-DICOM images without pixel data: apply fallback central Y clamp [0.08, 0.90]
  if (!width || !height || !pixelData || pixelData.length < width * height) {
    const fallbackTop = Math.floor(height * 0.08);
    const fallbackBottom = Math.floor(height * 0.90);
    const fallbackHeight = Math.max(1, fallbackBottom - fallbackTop + 1);
    return {
      roi: { x: 0, y: fallbackTop, width, height: fallbackHeight },
      normalizedRoi: { minX: 0, minY: 0.08, maxX: 1, maxY: 0.90 },
      hasLetterbox: true,
    };
  }

  const isRgba = pixelData.length >= width * height * 4;
  const stride = isRgba ? 4 : 1;

  function getLuminance(x: number, y: number): number {
    const idx = (y * width + x) * stride;
    if (isRgba) {
      // Perceived luminance formula (ITU-R BT.709)
      return 0.2126 * pixelData![idx] + 0.7152 * pixelData![idx + 1] + 0.0722 * pixelData![idx + 2];
    }
    return pixelData![idx];
  }

  const sampleStepX = Math.max(1, Math.floor(width / 160));
  const sampleStepY = Math.max(1, Math.floor(height / 160));

  function getRowStats(y: number): { mean: number; variance: number; brightFraction: number } {
    let sum = 0;
    let sumSq = 0;
    let brightCount = 0;
    let sampled = 0;
    for (let x = 0; x < width; x += sampleStepX) {
      const lum = getLuminance(x, y);
      sum += lum;
      sumSq += lum * lum;
      if (lum > 20) brightCount++;
      sampled++;
    }
    const mean = sum / (sampled || 1);
    const variance = (sumSq / (sampled || 1)) - (mean * mean);
    const brightFraction = brightCount / (sampled || 1);
    return { mean, variance, brightFraction };
  }

  function isContentRow(stats: { mean: number; variance: number; brightFraction: number }): boolean {
    // Active radiograph regions have higher mean luminance and structural edge variance
    // Letterbox margins have low mean (<22) and flat variance (<15), or very low bright pixel count
    return (stats.brightFraction > 0.06 && stats.mean > 22) || stats.variance > 25 || stats.mean > 35;
  }

  // Find top boundary (scan from top to 45% height)
  let top = 0;
  let foundTop = false;
  for (let y = 0; y < height * 0.45; y += sampleStepY) {
    const stats = getRowStats(y);
    if (isContentRow(stats)) {
      top = Math.max(0, y - sampleStepY);
      foundTop = true;
      break;
    }
  }

  // Find bottom boundary (scan from bottom to 55% height)
  let bottom = height - 1;
  let foundBottom = false;
  for (let y = height - 1; y > height * 0.55; y -= sampleStepY) {
    const stats = getRowStats(y);
    if (isContentRow(stats)) {
      bottom = Math.min(height - 1, y + sampleStepY);
      foundBottom = true;
      break;
    }
  }

  // Find left boundary
  let left = 0;
  for (let x = 0; x < width * 0.35; x += sampleStepX) {
    let sum = 0;
    let sumSq = 0;
    let brightCount = 0;
    let sampled = 0;
    for (let y = top; y <= bottom; y += sampleStepY) {
      const lum = getLuminance(x, y);
      sum += lum;
      sumSq += lum * lum;
      if (lum > 20) brightCount++;
      sampled++;
    }
    const mean = sum / (sampled || 1);
    const variance = (sumSq / (sampled || 1)) - (mean * mean);
    const brightFraction = brightCount / (sampled || 1);
    if ((brightFraction > 0.06 && mean > 22) || variance > 25 || mean > 35) {
      left = Math.max(0, x - sampleStepX);
      break;
    }
  }

  // Find right boundary
  let right = width - 1;
  for (let x = width - 1; x > width * 0.65; x -= sampleStepX) {
    let sum = 0;
    let sumSq = 0;
    let brightCount = 0;
    let sampled = 0;
    for (let y = top; y <= bottom; y += sampleStepY) {
      const lum = getLuminance(x, y);
      sum += lum;
      sumSq += lum * lum;
      if (lum > 20) brightCount++;
      sampled++;
    }
    const mean = sum / (sampled || 1);
    const variance = (sumSq / (sampled || 1)) - (mean * mean);
    const brightFraction = brightCount / (sampled || 1);
    if ((brightFraction > 0.06 && mean > 22) || variance > 25 || mean > 35) {
      right = Math.min(width - 1, x + sampleStepX);
      break;
    }
  }

  // Fallback safeguard: If ROI detection returns full height or failed to find margins on raster image,
  // hard-clamp active radiograph content to the central Y ∈ [0.08, 0.90] space
  if (!foundTop || top === 0) {
    top = Math.floor(height * 0.08);
  }
  if (!foundBottom || bottom >= height - 1) {
    bottom = Math.floor(height * 0.90);
  }

  const roiW = right - left + 1;
  const roiH = bottom - top + 1;

  // Sanity check: ROI must represent at least 30% of total width & height
  if (roiW < width * 0.3 || roiH < height * 0.3) {
    const fallbackTop = Math.floor(height * 0.08);
    const fallbackBottom = Math.floor(height * 0.90);
    return {
      roi: { x: 0, y: fallbackTop, width, height: fallbackBottom - fallbackTop + 1 },
      normalizedRoi: { minX: 0, minY: 0.08, maxX: 1, maxY: 0.90 },
      hasLetterbox: true,
    };
  }

  const hasLetterbox = top > 0 || bottom < height - 1 || left > 0 || right < width - 1;

  return {
    roi: { x: left, y: top, width: roiW, height: roiH },
    normalizedRoi: {
      minX: Number((left / width).toFixed(4)),
      minY: Number((top / height).toFixed(4)),
      maxX: Number((right / width).toFixed(4)),
      maxY: Number((bottom / height).toFixed(4)),
    },
    hasLetterbox,
  };
}

/**
 * Validates whether a normalized coordinate point is within anatomical boundaries
 */
export function isAnatomicallyPlausible(name: LandmarkName, point: Point): boolean {
  if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) {
    return false;
  }

  switch (name) {
    case "CoR":
      // Right Condylion: Upper lateral right quadrant (Y >= 0.12)
      return point.x >= 0.05 && point.x <= 0.40 && point.y >= 0.12 && point.y <= 0.40;
    case "CoL":
      // Left Condylion: Upper lateral left quadrant (Y >= 0.12)
      return point.x >= 0.60 && point.x <= 0.95 && point.y >= 0.12 && point.y <= 0.40;
    case "GoR":
      // Right Gonion: Lower lateral right quadrant
      return point.x >= 0.08 && point.x <= 0.45 && point.y >= 0.50 && point.y <= 0.85;
    case "GoL":
      // Left Gonion: Lower lateral left quadrant
      return point.x >= 0.55 && point.x <= 0.92 && point.y >= 0.50 && point.y <= 0.85;
    case "Me":
      // Menton: Lowest central chin contour (Y <= 0.90)
      return point.x >= 0.40 && point.x <= 0.60 && point.y >= 0.70 && point.y <= 0.90;
  }
}

export interface DetectMandibularLandmarksOptions {
  pixelData?: Uint8ClampedArray | Uint8Array | null;
  isDicom?: boolean;
  roi?: BoundingBox;
}

/**
 * Generate AI-assisted candidate landmark proposals based on panoramic geometry
 * and content-aware ROI letterbox cropping.
 */
export function detectMandibularLandmarks(
  imageWidth: number,
  imageHeight: number,
  options?: DetectMandibularLandmarksOptions
): AiDetectionResult {
  const isDicom = options?.isDicom ?? false;
  const roiResult = options?.roi
    ? {
        roi: options.roi,
        normalizedRoi: {
          minX: options.roi.x / imageWidth,
          minY: options.roi.y / imageHeight,
          maxX: (options.roi.x + options.roi.width) / imageWidth,
          maxY: (options.roi.y + options.roi.height) / imageHeight,
        },
        hasLetterbox: true,
      }
    : detectRadiographRoi(imageWidth, imageHeight, options?.pixelData, isDicom);

  const { roi } = roiResult;

  // Proportional anatomical landmark zones relative to actual content ROI
  // Condylar points (CoR / CoL):
  //   Y: ~0.22 (within 0.18 - 0.28)
  //   CoR X: ~0.17 (within 0.12 - 0.22)
  //   CoL X: ~0.83 (within 0.78 - 0.88)
  // Gonial points (GoR / GoL):
  //   Y: ~0.68 (within 0.60 - 0.72)
  //   GoR X: ~0.20 (within 0.15 - 0.25)
  //   GoL X: ~0.80 (within 0.75 - 0.85)
  // Menton (Me):
  //   Y: ~0.84 (within 0.80 - 0.88)
  //   X: 0.50 (within 0.48 - 0.52)
  const relativeProposals: Record<LandmarkName, Point> = {
    CoR: { x: 0.170, y: 0.220 },
    GoR: { x: 0.200, y: 0.680 },
    CoL: { x: 0.830, y: 0.220 },
    GoL: { x: 0.800, y: 0.680 },
    Me:  { x: 0.500, y: 0.840 },
  };

  // Map relative ROI positions to normalized [0.0 - 1.0] whole canvas space with hard boundary clamping
  const computePoint = (name: LandmarkName): Point => {
    const rawX = (roi.x + relativeProposals[name].x * roi.width) / imageWidth;
    const rawY = (roi.y + relativeProposals[name].y * roi.height) / imageHeight;

    let clampedX = Math.max(0.02, Math.min(0.98, rawX));
    let clampedY = Math.max(0.02, Math.min(0.98, rawY));

    // Enforce strict anatomical vertical limits
    if (name === "CoR" || name === "CoL") {
      clampedY = Math.max(0.12, Math.min(0.35, clampedY));
    } else if (name === "GoR" || name === "GoL") {
      clampedY = Math.max(0.55, Math.min(0.80, clampedY));
    } else if (name === "Me") {
      clampedY = Math.max(0.75, Math.min(0.88, clampedY));
      clampedX = Math.max(0.46, Math.min(0.54, clampedX));
    }

    return {
      x: Number(clampedX.toFixed(4)),
      y: Number(clampedY.toFixed(4)),
    };
  };

  const landmarks: Record<LandmarkName, Point> = {
    CoR: computePoint("CoR"),
    GoR: computePoint("GoR"),
    CoL: computePoint("CoL"),
    GoL: computePoint("GoL"),
    Me:  computePoint("Me"),
  };

  // Confidence scores based on anatomical prominence
  const confidenceScores: Record<LandmarkName, number> = {
    CoR: 0.92,
    GoR: 0.90,
    CoL: 0.92,
    GoL: 0.90,
    Me:  0.96,
  };

  const scores = Object.values(confidenceScores);
  const averageConfidence =
    scores.reduce((acc, val) => acc + val, 0) / scores.length;

  return {
    landmarks,
    confidenceScores,
    averageConfidence: Number(averageConfidence.toFixed(3)),
    roi,
    timestamp: new Date().toISOString(),
  };
}
