// ── AI Landmark Detection Domain Types ───────────────────────

import type { LandmarkName, Point } from "../types";

export interface BoundingBox {
  x: number;      // top-left x in pixels
  y: number;      // top-left y in pixels
  width: number;  // roi width in pixels
  height: number; // roi height in pixels
}

export interface RoiDetectionResult {
  roi: BoundingBox;
  normalizedRoi: {
    minX: number; // 0.0 - 1.0
    minY: number; // 0.0 - 1.0
    maxX: number; // 0.0 - 1.0
    maxY: number; // 0.0 - 1.0
  };
  hasLetterbox: boolean;
}

export interface LandmarkProposal {
  name: LandmarkName;
  point: Point;
  confidence: number; // 0.0 to 1.0
}

export interface AiDetectionResult {
  landmarks: Record<LandmarkName, Point>;
  confidenceScores: Record<LandmarkName, number>;
  averageConfidence: number;
  roi: BoundingBox;
  timestamp: string;
}
