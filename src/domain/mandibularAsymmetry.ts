// ── Mandibular Asymmetry Domain Module ───────────────────────
// Pure calculation functions ONLY. No React imports. No side effects.
// All clinical formulas per docs/clinical-protocol.md (OrthoBot, APPROVED).
// Evidence base: docs/clinical-evidence.md (ResearchBot, 40 references).

import type {
  Point,
  SideDifference,
  LargerSide,
  AsymmetryTier,
  FullResults,
} from "./types";

// ── Helper ──────────────────────────────────────────────────

/**
 * Round a number to specified decimal places.
 * Exported for testability.
 */
export function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// ── 7 Pure Domain Functions ─────────────────────────────────

/**
 * Euclidean distance between two normalized points.
 * @returns distance in normalized units (0.0–1.414, the diagonal of a unit square)
 */
export function calculateDistance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Signed and absolute difference between right and left measurements.
 * @param right - right-side measurement value
 * @param left  - left-side measurement value
 * @returns { difference: R−L, absoluteDifference: |R−L| }
 */
export function calculateSideDifference(
  right: number,
  left: number
): SideDifference {
  return {
    difference: right - left,
    absoluteDifference: Math.abs(right - left),
  };
}

/**
 * Relative difference: |R−L| / max(R,L) × 100
 * Always positive. Rounded to 1 decimal place.
 * Represents the percentage by which the smaller side differs from the larger side.
 * @returns percentage (0% to 100%)
 */
export function calculateRelativeDifference(right: number, left: number): number {
  if (!Number.isFinite(right) || !Number.isFinite(left)) return 0;
  const maxVal = Math.max(right, left);
  if (maxVal === 0) return 0;
  const result = (Math.abs(right - left) / maxVal) * 100;
  return round(result, 1);
}

/**
 * Habets Asymmetry Index: |R−L| / (R+L) × 100
 * Absolute (unsigned) asymmetry percentage. Range: 0% to +100%.
 * Rounded to 1 decimal place.
 * @returns percentage (0% to +100%)
 */
export function calculateAsymmetryIndex(right: number, left: number): number {
  if (!Number.isFinite(right) || !Number.isFinite(left)) return 0;
  const sum = right + left;
  if (sum === 0) return 0;
  const result = (Math.abs(right - left) / sum) * 100;
  return round(result, 1);
}

/**
 * Determine which side is larger.
 * "equal" if relative difference ≤ 0.5%.
 * @returns "right" | "left" | "equal"
 */
export function determineLargerSide(right: number, left: number): LargerSide {
  const relDiff = calculateRelativeDifference(right, left);
  if (relDiff <= 0.5) return "equal";
  return right > left ? "right" : "left";
}

/**
 * Classify asymmetry by tier using absolute Habets index.
 * [0, 3) → within_typical_range
 * [3, 6] → borderline
 * (6, ∞) → above_technical_error_margin
 * @param habetsAbsValue - absolute value of Habets index (|AI|)
 * @returns tier classification
 */
export function classifyAsymmetry(habetsAbsValue: number): AsymmetryTier {
  if (habetsAbsValue < 3) return "within_typical_range";
  if (habetsAbsValue <= 6) return "borderline";
  return "above_technical_error_margin";
}

// ── Calibration Pure Functions ──────────────────────────────

/**
 * Compute mm_per_pixel calibration factor.
 * mmPerPixel = realDistanceMm / pixelDistance
 * @param pixelDistance - distance between calibration points in image pixels
 * @param realDistanceMm - known real-world distance in mm
 * @returns mm per pixel factor
 */
export function computeMmPerPixel(
  pixelDistance: number,
  realDistanceMm: number
): number {
  if (pixelDistance === 0) return 0;
  return realDistanceMm / pixelDistance;
}

/**
 * Convert a normalized distance (0.0–1.0) to millimeters using calibration.
 * normalizedDistance → image pixels → mm
 * pixelDistance = normalizedDistance × max(imageWidth, imageHeight)
 * mmDistance = pixelDistance × mmPerPixel
 * @param normalizedDistance - distance in normalized units (0.0–1.0)
 * @param imageWidth - image width in pixels
 * @param imageHeight - image height in pixels
 * @param mmPerPixel - calibration factor
 * @returns distance in mm, rounded to 1 decimal place
 */
export function convertDistanceToMm(
  normalizedDistance: number,
  imageWidth: number,
  imageHeight: number,
  mmPerPixel: number
): number {
  const pixelDistance = normalizedDistance * Math.max(imageWidth, imageHeight);
  const mm = pixelDistance * mmPerPixel;
  // Store full floating-point precision — display layer uses toFixed(1)
  return mm;
}

// ── Bilateral mm Measurement Functions (Part 2) ────────────

/**
 * Signed difference between right and left measurements in mm.
 * Positive = right longer, negative = left longer.
 */
export function calculateDifferenceMm(rightMm: number, leftMm: number): number {
  return rightMm - leftMm;
}

/**
 * Determine which side is longer based on mm values.
 * Threshold: >0.5 mm difference → "right" or "left"; ≤0.5 mm → "equal".
 */
export function determineLongerSide(
  rightMm: number,
  leftMm: number
): "right" | "left" | "equal" {
  const diff = rightMm - leftMm;
  if (Math.abs(diff) <= 0.5) return "equal";
  return diff > 0 ? "right" : "left";
}

/**
 * Determine which side is shorter based on mm values.
 * Threshold: >0.5 mm difference → "right" or "left"; ≤0.5 mm → "equal".
 */
export function determineShorterSide(
  rightMm: number,
  leftMm: number
): "right" | "left" | "equal" {
  const diff = rightMm - leftMm;
  if (Math.abs(diff) <= 0.5) return "equal";
  return diff > 0 ? "left" : "right";
}

/**
 * Generate a side-to-side comparison sentence for the ramus.
 * Examples:
 *   "The right mandibular ramus is 2.0 mm longer than the left."
 *   "The left mandibular ramus is 3.0 mm shorter than the right."
 *   "Mandibular ramus lengths are approximately equal."
 */
export function generateRamusComparison(
  rightMm: number,
  leftMm: number
): string {
  const longer = determineLongerSide(rightMm, leftMm);
  if (longer === "equal") {
    return "Mandibular ramus lengths are approximately equal.";
  }
  const absDiff = round(Math.abs(rightMm - leftMm), 1);
  if (longer === "right") {
    return `The right mandibular ramus is ${absDiff.toFixed(1)} mm longer than the left.`;
  }
  return `The left mandibular ramus is ${absDiff.toFixed(1)} mm longer than the right.`;
}

/**
 * Generate a side-to-side comparison sentence for the mandibular body.
 * Same pattern as ramus.
 */
export function generateBodyComparison(
  rightMm: number,
  leftMm: number
): string {
  const longer = determineLongerSide(rightMm, leftMm);
  if (longer === "equal") {
    return "Mandibular body lengths are approximately equal.";
  }
  const absDiff = round(Math.abs(rightMm - leftMm), 1);
  if (longer === "right") {
    return `The right mandibular body is ${absDiff.toFixed(1)} mm longer than the left.`;
  }
  return `The left mandibular body is ${absDiff.toFixed(1)} mm longer than the right.`;
}

/**
 * Generate a structured clinical conclusion evaluating ramus and body independently.
 * Threshold for "differs": >0.5 mm.
 * CRITICAL: Evaluates each measurement independently — does NOT assume the same
 * side is larger in both. Never reverses right and left in the text.
 */
export function generateMandibularAsymmetryConclusion(
  ramusRightMm: number,
  ramusLeftMm: number,
  bodyRightMm: number,
  bodyLeftMm: number
): string {
  const ramusDiffers = Math.abs(ramusRightMm - ramusLeftMm) > 0.5;
  const bodyDiffers = Math.abs(bodyRightMm - bodyLeftMm) > 0.5;

  // Build comparison sentences that include actual measured mm values.
  // Example: "The right ramus measures 60.0 mm and is 2.0 mm longer than the
  // left ramus, which measures 58.0 mm."
  function buildRamusSentence(): string {
    const longer = determineLongerSide(ramusRightMm, ramusLeftMm);
    if (longer === "equal") {
      return (
        `The right ramus measures ${ramusRightMm.toFixed(1)} mm and the left ramus ` +
        `measures ${ramusLeftMm.toFixed(1)} mm; ramus lengths are approximately equal.`
      );
    }
    const absDiff = Math.abs(ramusRightMm - ramusLeftMm).toFixed(1);
    if (longer === "right") {
      return (
        `The right ramus measures ${ramusRightMm.toFixed(1)} mm and is ${absDiff} mm ` +
        `longer than the left ramus, which measures ${ramusLeftMm.toFixed(1)} mm.`
      );
    }
    return (
      `The left ramus measures ${ramusLeftMm.toFixed(1)} mm and is ${absDiff} mm ` +
      `longer than the right ramus, which measures ${ramusRightMm.toFixed(1)} mm.`
    );
  }

  function buildBodySentence(): string {
    const longer = determineLongerSide(bodyRightMm, bodyLeftMm);
    if (longer === "equal") {
      return (
        `The left mandibular body measures ${bodyLeftMm.toFixed(1)} mm and the right ` +
        `mandibular body measures ${bodyRightMm.toFixed(1)} mm; mandibular body lengths ` +
        `are approximately equal.`
      );
    }
    const absDiff = Math.abs(bodyRightMm - bodyLeftMm).toFixed(1);
    if (longer === "right") {
      return (
        `The right mandibular body measures ${bodyRightMm.toFixed(1)} mm and is ${absDiff} mm ` +
        `longer than the left mandibular body, which measures ${bodyLeftMm.toFixed(1)} mm.`
      );
    }
    return (
      `The left mandibular body measures ${bodyLeftMm.toFixed(1)} mm and is ${absDiff} mm ` +
      `longer than the right mandibular body, which measures ${bodyRightMm.toFixed(1)} mm.`
    );
  }

  const ramusSentence = buildRamusSentence();
  const bodySentence = buildBodySentence();

  if (ramusDiffers && bodyDiffers) {
    return (
      "The current 2D measurements demonstrate mandibular skeletal asymmetry " +
      "involving both the ramus and mandibular body. " +
      ramusSentence +
      " " +
      bodySentence
    );
  }

  if (ramusDiffers && !bodyDiffers) {
    return (
      "The current 2D measurements demonstrate predominantly ramus asymmetry. " +
      ramusSentence +
      " " +
      bodySentence.replace(/; mandibular body lengths\s+are approximately equal\.$/, ".") +
      " Mandibular body lengths are approximately equal in the current projection."
    );
  }

  if (!ramusDiffers && bodyDiffers) {
    return (
      "The current 2D measurements demonstrate predominantly mandibular body asymmetry. " +
      bodySentence +
      " " +
      ramusSentence.replace(/; ramus lengths are approximately equal\.$/, ".") +
      " Ramus lengths are approximately equal in the current projection."
    );
  }

  return (
    "The current 2D measurements do not demonstrate significant mandibular " +
    "skeletal asymmetry. " +
    ramusSentence.replace(/; ramus lengths are approximately equal\.$/, ".") +
    " " +
    bodySentence.replace(/; mandibular body lengths are approximately equal\.$/, ".") +
    " Ramus and mandibular body lengths are approximately equal in the current projection."
  );
}

// ── Tier Labels and Guidance ────────────────────────────────

export const TIER_LABELS: Record<AsymmetryTier, string> = {
  within_typical_range: "Within typical range",
  borderline: "Borderline",
  above_technical_error_margin: "Above technical error margin",
};

/** Label for unclassified (horizontal) measurements — shown instead of a tier badge */
export const UNCLASSIFIED_LABEL = "Not classified — horizontal measurement";

export const TIER_GUIDANCE: Record<AsymmetryTier, string> = {
  within_typical_range:
    "The measured difference is within the range commonly observed in asymptomatic individuals.",
  borderline:
    "The measured difference is in a borderline range that may include technical/positioning effects. Clinical correlation is recommended.",
  above_technical_error_margin:
    "The measured difference exceeds the 6% technical error margin reported for panoramic radiography. Clinical correlation and 3D imaging (CBCT) are recommended when clinically indicated.",
};

// ── Mandatory Limitation Statements ─────────────────────────

export const LIMITATION_HEADER =
  "CLINICAL MEASUREMENT REPORT — MANDIBULAR ASYMMETRY ANALYSIS\n\n" +
  "⚠ This is a measurement and comparative analysis tool, not a diagnostic system.\n" +
  "Results are derived from a 2D projection of 3D anatomy and must be interpreted\n" +
  "in the context of clinical examination and adjunct imaging.\n\n" +
  "This MVP performs a simplified landmark-based mandibular asymmetry analysis and\n" +
  "uses the Habets normalization formula. It does not reproduce the complete\n" +
  "original Habets tracing protocol.";

export const LIMITATION_FOOTER =
  "LIMITATIONS\n\n" +
  "1. 2D PROJECTION: Measurements are derived from a 2D projection of 3D anatomy.\n" +
  "   Panoramic radiographs have inherent magnification and distortion that may\n" +
  "   affect measurement accuracy.\n\n" +
  "2. POSITIONING SENSITIVITY: Measurements are sensitive to patient head positioning\n" +
  "   during image acquisition. Head rotation may create apparent asymmetry that does\n" +
  "   not reflect true anatomy.\n\n" +
  "3. LANDMARK IDENTIFICATION: Measurements depend on manual landmark placement and\n" +
  "   are subject to inter-observer variability, particularly for condylion (Co)\n" +
  "   identification.\n\n" +
  "4. NOT DIAGNOSTIC: This is a measurement and comparative analysis tool, not a\n" +
  "   diagnostic system. Results must be interpreted in the context of clinical\n" +
  "   examination and adjunct imaging.\n\n" +
  "5. THRESHOLD CAVEAT: Threshold values are based on published literature and the\n" +
  "   known technical error margin of panoramic radiography (Habets et al. 1987),\n" +
  "   not on validated clinical outcomes. Apparent asymmetry may reflect technical\n" +
  "   factors rather than true anatomical asymmetry.\n\n" +
  "6. HORIZONTAL MEASUREMENT CAVEAT: Mandibular body length measurements use horizontal\n" +
  "   distances, which are less reliable on panoramic radiographs than vertical\n" +
  "   measurements. Body length results should be interpreted with particular caution.";

// ── Clinical Summary Generation ─────────────────────────────

/**
 * Generate the full structured clinical summary text.
 * Includes: limitation header, ramus analysis, body analysis,
 * absolute measurements (if calibrated), mandatory limitations footer.
 * Per protocol §8.1 template.
 * @param results - full results object
 * @returns structured clinical text per protocol §8.1
 */
export function generateClinicalSummary(results: FullResults): string {
  const { ramusHeight, bodyLength, calibration, calibrationMode } = results;

  const lines: string[] = [];
  lines.push(LIMITATION_HEADER);
  lines.push("");

  // ── Ramus Length Proxy Analysis ──
  lines.push("RAMUS LENGTH PROXY ANALYSIS (Primary Measurement)");
  lines.push("");

  if (ramusHeight) {
    const rh = ramusHeight;
    const relDiffStr = rh.relativeDifferencePercent.toFixed(1);
    const habetsStr = rh.asymmetryIndexPercent.toFixed(1);

    if (rh.largerSide === "equal") {
      lines.push("On this panoramic radiograph, the right and left ramus heights are approximately equal.");
    } else if (rh.largerSide === "right") {
      lines.push(`On this panoramic radiograph, the right ramus height is ${relDiffStr}% greater than the left.`);
    } else {
      lines.push(`On this panoramic radiograph, the left ramus height is ${relDiffStr}% greater than the right.`);
    }

    lines.push("");
    lines.push(`Habets Asymmetry Index: ${habetsStr}% (${rh.largerSide === "equal" ? "equal" : rh.largerSide + " larger"})`);
    lines.push(`Relative Difference: ${relDiffStr}%`);
    if (rh.classification !== null) {
      lines.push(`Classification: ${TIER_LABELS[rh.classification]}`);
      lines.push("");
      lines.push(TIER_GUIDANCE[rh.classification]);
    } else {
      lines.push(`Classification: ${UNCLASSIFIED_LABEL}`);
    }
  } else {
    lines.push("Landmarks incomplete — measurement not available.");
  }

  lines.push("");

  // ── Body Length Proxy Analysis ──
  lines.push("MANDIBULAR BODY LENGTH PROXY ANALYSIS (Secondary Measurement — Lower Reliability)");
  lines.push("⚠ Horizontal measurements on panoramic radiographs are less reliable than vertical");
  lines.push("measurements due to variable horizontal magnification. Interpret with caution.");
  lines.push("");

  if (bodyLength) {
    const bl = bodyLength;
    const relDiffStr = bl.relativeDifferencePercent.toFixed(1);
    const habetsStr = bl.asymmetryIndexPercent.toFixed(1);

    if (bl.largerSide === "equal") {
      lines.push("The right and left mandibular body lengths are approximately equal.");
    } else if (bl.largerSide === "right") {
      lines.push(`The right mandibular body length is ${relDiffStr}% greater than the left.`);
    } else {
      lines.push(`The left mandibular body length is ${relDiffStr}% greater than the right.`);
    }

    lines.push("");
    lines.push(`Habets Asymmetry Index: ${habetsStr}% (${bl.largerSide === "equal" ? "equal" : bl.largerSide + " larger"})`);
    lines.push(`Relative Difference: ${relDiffStr}%`);
    lines.push("Classification: Not classified — thresholds are based on vertical measurement data");
    lines.push("and are not applied to horizontal (body length) measurements.");
  } else {
    lines.push("Landmarks incomplete — measurement not available.");
  }

  lines.push("");

  // ── Calibration Display ──
  if (calibrationMode === "B" && calibration) {
    lines.push("Absolute measurements (estimated):");
    if (ramusHeight && ramusHeight.rightMm !== null && ramusHeight.leftMm !== null) {
      lines.push(`  Right ramus height: ${ramusHeight.rightMm.toFixed(1)} mm`);
      lines.push(`  Left ramus height: ${ramusHeight.leftMm.toFixed(1)} mm`);
    }
    if (bodyLength && bodyLength.rightMm !== null && bodyLength.leftMm !== null) {
      lines.push(`  Right body length: ${bodyLength.rightMm.toFixed(1)} mm`);
      lines.push(`  Left body length: ${bodyLength.leftMm.toFixed(1)} mm`);
    }
    lines.push(`  Calibration factor: ${calibration.mmPerPixel.toFixed(4)} mm/pixel`);
    lines.push("");
    lines.push("Measurements in mm are estimated based on user-provided calibration and are subject to panoramic magnification effects.");
  } else {
    lines.push("Calibration not performed — absolute measurements in mm are not displayed.");
    lines.push("Relative asymmetry percentages are available.");
  }

  lines.push("");
  lines.push(LIMITATION_FOOTER);

  return lines.join("\n");
}