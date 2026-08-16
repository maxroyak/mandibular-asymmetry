// ── AI Landmark Detection Domain Types ───────────────────────

import type { LandmarkName, Point } from "../types";

export interface LandmarkProposal {
  name: LandmarkName;
  point: Point;
  confidence: number; // 0.0 to 1.0
}

export interface AiDetectionResult {
  landmarks: Record<LandmarkName, Point>;
  confidenceScores: Record<LandmarkName, number>;
  averageConfidence: number;
  timestamp: string;
}
