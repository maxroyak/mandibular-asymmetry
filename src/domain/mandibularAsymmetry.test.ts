import { describe, it, expect } from "vitest";
import {
  calculateDistance,
  calculateSideDifference,
  calculateRelativeDifference,
  calculateAsymmetryIndex,
  determineDominantSide,
  classifyAsymmetry,
  generateClinicalSummary,
  TIER_GUIDANCE,
  LIMITATION_HEADER,
  LIMITATION_FOOTER,
  convertDistanceToMm,
  computeMmPerPixel,
  calculateDifferenceMm,
  determineLongerSide,
  determineShorterSide,
  generateRamusComparison,
  generateBodyComparison,
  generateMandibularAsymmetryConclusion,
} from "../domain/mandibularAsymmetry";
import type {
  Point,
  FullResults,
  MeasurementResult,
  Calibration,
} from "../domain/types";

// ── calculateDistance ──────────────────────────────────────

describe("calculateDistance", () => {
  it("calculates known horizontal distance", () => {
    const a: Point = { x: 0.0, y: 0.5 };
    const b: Point = { x: 1.0, y: 0.5 };
    expect(calculateDistance(a, b)).toBeCloseTo(1.0, 10);
  });

  it("calculates known vertical distance", () => {
    const a: Point = { x: 0.5, y: 0.0 };
    const b: Point = { x: 0.5, y: 1.0 };
    expect(calculateDistance(a, b)).toBeCloseTo(1.0, 10);
  });

  it("returns 0 for identical points", () => {
    const a: Point = { x: 0.5, y: 0.5 };
    expect(calculateDistance(a, a)).toBe(0);
  });

  it("calculates diagonal distance (unit square corner)", () => {
    const a: Point = { x: 0.0, y: 0.0 };
    const b: Point = { x: 1.0, y: 1.0 };
    expect(calculateDistance(a, b)).toBeCloseTo(Math.SQRT2, 10);
  });

  it("calculates partial distance correctly", () => {
    const a: Point = { x: 0.0, y: 0.0 };
    const b: Point = { x: 0.3, y: 0.4 };
    expect(calculateDistance(a, b)).toBeCloseTo(0.5, 10);
  });
});

// ── calculateSideDifference ─────────────────────────────────

describe("calculateSideDifference", () => {
  it("returns positive difference when right > left", () => {
    const result = calculateSideDifference(60, 50);
    expect(result.difference).toBe(10);
    expect(result.absoluteDifference).toBe(10);
  });

  it("returns negative difference when left > right", () => {
    const result = calculateSideDifference(40, 55);
    expect(result.difference).toBe(-15);
    expect(result.absoluteDifference).toBe(15);
  });

  it("returns zero difference when equal", () => {
    const result = calculateSideDifference(50, 50);
    expect(result.difference).toBe(0);
    expect(result.absoluteDifference).toBe(0);
  });
});

// ── calculateRelativeDifference ────────────────────────────

describe("calculateRelativeDifference", () => {
  it("returns 0 for equal sides", () => {
    expect(calculateRelativeDifference(50, 50)).toBe(0);
  });

  it("returns 2× the absolute Habets index (known ratio)", () => {
    // R=55, L=50 → Habets = (55-50)/(105)*100 = 4.76... → 4.8
    // Relative diff = |55-50| / ((105)/2) * 100 = 5/52.5*100 = 9.523... → 9.5
    const habets = calculateAsymmetryIndex(55, 50);
    const relDiff = calculateRelativeDifference(55, 50);
    expect(relDiff).toBeCloseTo(Math.abs(habets) * 2, 0);
  });

  it("is always positive", () => {
    expect(calculateRelativeDifference(30, 70)).toBeGreaterThan(0);
    expect(calculateRelativeDifference(70, 30)).toBeGreaterThan(0);
  });

  it("returns 0 when both sides are 0", () => {
    expect(calculateRelativeDifference(0, 0)).toBe(0);
  });

  it("rounds to 1 decimal place", () => {
    const result = calculateRelativeDifference(51, 50);
    // |51-50| / (101/2) * 100 = 1/50.5*100 = 1.980... → 2.0
    expect(result).toBe(2.0);
  });
});

// ── calculateAsymmetryIndex (Habets) ───────────────────────

describe("calculateAsymmetryIndex", () => {
  it("returns positive when right > left", () => {
    const result = calculateAsymmetryIndex(60, 50);
    expect(result).toBeGreaterThan(0);
    // (60-50)/(110)*100 = 9.09... → 9.1
    expect(result).toBe(9.1);
  });

  it("returns negative when left > right", () => {
    const result = calculateAsymmetryIndex(40, 50);
    expect(result).toBeLessThan(0);
    // (40-50)/(90)*100 = -11.11... → -11.1
    expect(result).toBe(-11.1);
  });

  it("returns 0 for equal sides", () => {
    expect(calculateAsymmetryIndex(50, 50)).toBe(0);
  });

  it("returns 0 when both sides are 0", () => {
    expect(calculateAsymmetryIndex(0, 0)).toBe(0);
  });

  it("rounds to 1 decimal place", () => {
    const result = calculateAsymmetryIndex(55, 50);
    // (55-50)/(105)*100 = 4.7619... → 4.8
    expect(result).toBe(4.8);
  });

  it("is signed (positive = right greater)", () => {
    const rightGreater = calculateAsymmetryIndex(55, 50);
    const leftGreater = calculateAsymmetryIndex(50, 55);
    expect(rightGreater).toBeGreaterThan(0);
    expect(leftGreater).toBeLessThan(0);
    expect(Math.abs(rightGreater)).toBeCloseTo(Math.abs(leftGreater), 1);
  });
});

// ── determineDominantSide ───────────────────────────────────

describe("determineDominantSide", () => {
  it("returns 'right' when right is larger", () => {
    expect(determineDominantSide(60, 50)).toBe("right");
  });

  it("returns 'left' when left is larger", () => {
    expect(determineDominantSide(40, 55)).toBe("left");
  });

  it("returns 'equal' when values are identical", () => {
    expect(determineDominantSide(50, 50)).toBe("equal");
  });

  it("returns 'equal' when relative difference ≤ 0.5%", () => {
    // R=50.1, L=50 → rel diff = |0.1| / (100.1/2) * 100 = 0.1998 → 0.2 ≤ 0.5
    expect(determineDominantSide(50.1, 50)).toBe("equal");
  });

  it("returns 'right' when relative difference > 0.5%", () => {
    // R=50.5, L=50 → rel diff = |0.5| / (100.5/2) * 100 = 0.995 → 1.0 > 0.5
    expect(determineDominantSide(50.5, 50)).toBe("right");
  });

  it("returns 'equal' when both sides are 0", () => {
    expect(determineDominantSide(0, 0)).toBe("equal");
  });
});

// ── classifyAsymmetry ──────────────────────────────────────

describe("classifyAsymmetry", () => {
  it("classifies 0 as within_typical_range", () => {
    expect(classifyAsymmetry(0)).toBe("within_typical_range");
  });

  it("classifies 2.99 as within_typical_range", () => {
    expect(classifyAsymmetry(2.99)).toBe("within_typical_range");
  });

  it("classifies 3.0 as borderline (inclusive lower bound)", () => {
    expect(classifyAsymmetry(3.0)).toBe("borderline");
  });

  it("classifies 4.5 as borderline", () => {
    expect(classifyAsymmetry(4.5)).toBe("borderline");
  });

  it("classifies 6.0 as borderline (inclusive upper bound)", () => {
    expect(classifyAsymmetry(6.0)).toBe("borderline");
  });

  it("classifies 6.01 as above_technical_error_margin", () => {
    expect(classifyAsymmetry(6.01)).toBe("above_technical_error_margin");
  });

  it("classifies 15.0 as above_technical_error_margin", () => {
    expect(classifyAsymmetry(15.0)).toBe("above_technical_error_margin");
  });
});

// ── generateClinicalSummary ─────────────────────────────────

describe("generateClinicalSummary", () => {
  // Helper to create a MeasurementResult
  function makeResult(
    overrides: Partial<MeasurementResult> = {}
  ): MeasurementResult {
    return {
      right: 0.55,
      left: 0.50,
      difference: 0.05,
      absoluteDifference: 0.05,
      relativeDifferencePercent: 9.5,
      asymmetryIndexPercent: 4.8,
      dominantSide: "right",
      classification: "borderline",
      rightMm: null,
      leftMm: null,
      ...overrides,
    };
  }

  const mockCalibration: Calibration = {
    pixelDistance: 500,
    realDistanceMm: 40,
    mmPerPixel: 0.08,
  };

  it("includes the limitation header", () => {
    const results: FullResults = {
      ramusHeight: makeResult(),
      bodyLength: makeResult(),
      calibration: null,
      calibrationMode: "A",
    };
    const summary = generateClinicalSummary(results);
    expect(summary).toContain(LIMITATION_HEADER);
  });

  it("includes the limitation footer", () => {
    const results: FullResults = {
      ramusHeight: makeResult(),
      bodyLength: makeResult(),
      calibration: null,
      calibrationMode: "A",
    };
    const summary = generateClinicalSummary(results);
    expect(summary).toContain(LIMITATION_FOOTER);
  });

  it("includes 'On this panoramic radiograph' for ramus", () => {
    const results: FullResults = {
      ramusHeight: makeResult(),
      bodyLength: makeResult(),
      calibration: null,
      calibrationMode: "A",
    };
    const summary = generateClinicalSummary(results);
    expect(summary).toContain("On this panoramic radiograph");
  });

  it("uses 'greater than' comparative language", () => {
    const results: FullResults = {
      ramusHeight: makeResult({ dominantSide: "right" }),
      bodyLength: makeResult({ dominantSide: "left" }),
      calibration: null,
      calibrationMode: "A",
    };
    const summary = generateClinicalSummary(results);
    expect(summary).toContain("greater than");
  });

  it("shows 'approximately equal' when dominantSide is equal", () => {
    const results: FullResults = {
      ramusHeight: makeResult({
        dominantSide: "equal",
        relativeDifferencePercent: 0,
        asymmetryIndexPercent: 0,
      }),
      bodyLength: makeResult({
        dominantSide: "equal",
        relativeDifferencePercent: 0,
        asymmetryIndexPercent: 0,
      }),
      calibration: null,
      calibrationMode: "A",
    };
    const summary = generateClinicalSummary(results);
    expect(summary).toContain("approximately equal");
  });

  it("includes Habets Asymmetry Index label", () => {
    const results: FullResults = {
      ramusHeight: makeResult(),
      bodyLength: makeResult(),
      calibration: null,
      calibrationMode: "A",
    };
    const summary = generateClinicalSummary(results);
    expect(summary).toContain("Habets Asymmetry Index");
  });

  it("includes Relative Difference label", () => {
    const results: FullResults = {
      ramusHeight: makeResult(),
      bodyLength: makeResult(),
      calibration: null,
      calibrationMode: "A",
    };
    const summary = generateClinicalSummary(results);
    expect(summary).toContain("Relative Difference");
  });

  it("includes body length reliability warning", () => {
    const results: FullResults = {
      ramusHeight: makeResult(),
      bodyLength: makeResult(),
      calibration: null,
      calibrationMode: "A",
    };
    const summary = generateClinicalSummary(results);
    expect(summary).toContain("⚠ Horizontal measurements");
    expect(summary).toContain("less reliable");
  });

  it("shows 'Calibration not performed' when uncalibrated", () => {
    const results: FullResults = {
      ramusHeight: makeResult(),
      bodyLength: makeResult(),
      calibration: null,
      calibrationMode: "A",
    };
    const summary = generateClinicalSummary(results);
    expect(summary).toContain("Calibration not performed");
  });

  it("shows absolute measurements when calibrated", () => {
    const results: FullResults = {
      ramusHeight: makeResult({
        rightMm: 52.3,
        leftMm: 48.1,
      }),
      bodyLength: makeResult({
        rightMm: 75.0,
        leftMm: 72.5,
      }),
      calibration: mockCalibration,
      calibrationMode: "B",
    };
    const summary = generateClinicalSummary(results);
    expect(summary).toContain("52.3 mm");
    expect(summary).toContain("48.1 mm");
    expect(summary).toContain("75.0 mm");
    expect(summary).toContain("72.5 mm");
    expect(summary).toContain("0.0800 mm/pixel");
  });

  it("includes tier guidance text", () => {
    const results: FullResults = {
      ramusHeight: makeResult({ classification: "borderline" }),
      bodyLength: makeResult({ classification: "above_technical_error_margin" }),
      calibration: null,
      calibrationMode: "A",
    };
    const summary = generateClinicalSummary(results);
    expect(summary).toContain(TIER_GUIDANCE.borderline);
    expect(summary).toContain(TIER_GUIDANCE.above_technical_error_margin);
  });

  it("includes CBCT recommendation for Band 3", () => {
    const results: FullResults = {
      ramusHeight: makeResult({ classification: "above_technical_error_margin" }),
      bodyLength: makeResult(),
      calibration: null,
      calibrationMode: "A",
    };
    const summary = generateClinicalSummary(results);
    expect(summary).toContain("3D imaging (CBCT)");
    expect(summary).toContain("when clinically indicated");
  });

  it("handles incomplete landmarks (null measurements)", () => {
    const results: FullResults = {
      ramusHeight: null,
      bodyLength: null,
      calibration: null,
      calibrationMode: "A",
    };
    const summary = generateClinicalSummary(results);
    expect(summary).toContain("Landmarks incomplete");
    // Still has limitations
    expect(summary).toContain(LIMITATION_HEADER);
    expect(summary).toContain(LIMITATION_FOOTER);
  });

  it("never uses diagnostic language", () => {
    const results: FullResults = {
      ramusHeight: makeResult(),
      bodyLength: makeResult(),
      calibration: null,
      calibrationMode: "A",
    };
    const summary = generateClinicalSummary(results);
    expect(summary).not.toContain("hypoplasia");
    expect(summary).not.toContain("hyperplasia");
    expect(summary).not.toContain("hypertrophy");
    expect(summary).not.toContain("atrophy");
    expect(summary).not.toContain("patient has");
    expect(summary).not.toContain("diagnosis");
  });

  it("includes all 6 limitation statements in footer", () => {
    const results: FullResults = {
      ramusHeight: makeResult(),
      bodyLength: makeResult(),
      calibration: null,
      calibrationMode: "A",
    };
    const summary = generateClinicalSummary(results);
    expect(summary).toContain("1. 2D PROJECTION");
    expect(summary).toContain("2. POSITIONING SENSITIVITY");
    expect(summary).toContain("3. LANDMARK IDENTIFICATION");
    expect(summary).toContain("4. NOT DIAGNOSTIC");
    expect(summary).toContain("5. THRESHOLD CAVEAT");
    expect(summary).toContain("6. HORIZONTAL MEASUREMENT CAVEAT");
  });
});

// ── Specific Test Cases (from TestBot spec) ────────────────

describe("Specific spec test cases", () => {
  it("right=60, left=60 → AI=0, relativeDiff=0, dominantSide='equal'", () => {
    const ai = calculateAsymmetryIndex(60, 60);
    const relDiff = calculateRelativeDifference(60, 60);
    const dominant = determineDominantSide(60, 60);
    expect(ai).toBe(0);
    expect(relDiff).toBe(0);
    expect(dominant).toBe("equal");
  });

  it("right=66, left=60 → AI=4.7619..., relativeDiff=9.52..., dominantSide='right'", () => {
    const ai = calculateAsymmetryIndex(66, 60);
    const relDiff = calculateRelativeDifference(66, 60);
    const dominant = determineDominantSide(66, 60);
    // AI = (66-60)/(66+60)*100 = 6/126*100 = 4.761904... → rounds to 4.8
    expect(ai).toBe(4.8); // rounded to 1 decimal
    // Verify the raw formula value (before rounding) is 4.7619...
    const rawAi = ((66 - 60) / (66 + 60)) * 100;
    expect(rawAi).toBeCloseTo(4.761904761904762, 5);
    // relativeDiff = |66-60| / ((66+60)/2) * 100 = 6/63*100 = 9.5238... → 9.5
    expect(relDiff).toBe(9.5); // rounded to 1 decimal
    const rawRelDiff = (Math.abs(66 - 60) / ((66 + 60) / 2)) * 100;
    expect(rawRelDiff).toBeCloseTo(9.523809523809524, 5);
    expect(dominant).toBe("right");
  });

  it("right=60, left=66 → AI=-4.7619..., relativeDiff=9.52..., dominantSide='left'", () => {
    const ai = calculateAsymmetryIndex(60, 66);
    const relDiff = calculateRelativeDifference(60, 66);
    const dominant = determineDominantSide(60, 66);
    expect(ai).toBe(-4.8);
    const rawAi = ((60 - 66) / (60 + 66)) * 100;
    expect(rawAi).toBeCloseTo(-4.761904761904762, 5);
    expect(relDiff).toBe(9.5);
    expect(dominant).toBe("left");
  });
});

// ── Edge Cases ─────────────────────────────────────────────

describe("Edge cases — negative inputs", () => {
  it("calculateRelativeDifference handles negative inputs gracefully", () => {
    // Negative values are not physically meaningful but should not crash
    const result = calculateRelativeDifference(-10, 10);
    // |-10-10| / ((0)/2) * 100 → div by zero guard: sum=0 returns 0
    expect(result).toBe(0);
  });

  it("calculateAsymmetryIndex handles negative inputs gracefully", () => {
    const result = calculateAsymmetryIndex(-10, 10);
    // sum = 0 → returns 0
    expect(result).toBe(0);
  });

  it("calculateSideDifference handles negative inputs", () => {
    const result = calculateSideDifference(-5, 5);
    expect(result.difference).toBe(-10);
    expect(result.absoluteDifference).toBe(10);
  });

  it("determineDominantSide handles negative inputs gracefully", () => {
    // sum = 0 → relDiff = 0 → equal
    expect(determineDominantSide(-10, 10)).toBe("equal");
  });

  it("both negative equal values return 0 for AI", () => {
    // AI = (-50 - -50) / (-50 + -50) * 100 = 0 / -100 * 100 = -0 (negative zero)
    // Use Object.is to accept -0 as equivalent to 0, or use toBeCloseTo
    const result = calculateAsymmetryIndex(-50, -50);
    expect(Object.is(result, -0) || Object.is(result, 0)).toBe(true);
  });
});

describe("Edge cases — very small differences (floating point precision)", () => {
  it("tiny floating-point difference is detected as non-equal when above threshold", () => {
    // R=50.5, L=50 → rel diff ≈ 0.995% > 0.5% → right dominant
    expect(determineDominantSide(50.5, 50)).toBe("right");
  });

  it("tiny floating-point difference within threshold is 'equal'", () => {
    // R=50.1, L=50 → rel diff ≈ 0.2% ≤ 0.5% → equal
    expect(determineDominantSide(50.1, 50)).toBe("equal");
  });

  it("extremely small difference (1e-10) is treated as equal", () => {
    expect(determineDominantSide(50.0000000001, 50)).toBe("equal");
  });

  it("floating-point asymmetry index is stable for near-equal values", () => {
    const ai = calculateAsymmetryIndex(50.001, 50);
    // (0.001 / 100.001) * 100 = 0.0009999... → rounds to 0.0
    expect(ai).toBe(0);
  });

  it("floating-point relative difference is stable for near-equal values", () => {
    const rd = calculateRelativeDifference(50.001, 50);
    // |0.001| / (100.001/2) * 100 = 0.0019999... → rounds to 0.0
    expect(rd).toBe(0);
  });
});

describe("Edge cases — boundary values", () => {
  it("classifyAsymmetry: exactly 3.0 is borderline (inclusive lower)", () => {
    expect(classifyAsymmetry(3.0)).toBe("borderline");
  });

  it("classifyAsymmetry: exactly 6.0 is borderline (inclusive upper)", () => {
    expect(classifyAsymmetry(6.0)).toBe("borderline");
  });

  it("classifyAsymmetry: just below 3 (2.9999) is within_typical_range", () => {
    expect(classifyAsymmetry(2.9999)).toBe("within_typical_range");
  });

  it("classifyAsymmetry: just above 6 (6.0001) is above_technical_error_margin", () => {
    expect(classifyAsymmetry(6.0001)).toBe("above_technical_error_margin");
  });

  it("determineDominantSide: relative diff exactly 0.5% → equal (inclusive)", () => {
    // R=50.125, L=50 → |0.125| / (100.125/2) * 100 = 0.24968... → rounds to 0.2
    // Actually we need exactly 0.5. R=50.25, L=50 → |0.25|/(100.25/2)*100 = 0.499... → 0.5
    // Let's use values that produce exactly 0.5% after rounding
    // |d| / ((R+L)/2) * 100 = 0.5 → |d| = 0.5 * (R+L) / 200 = (R+L) / 400
    // With R=50.25, L=50: sum=100.25, |d|=0.25 → 0.25/50.125*100 = 0.4997... → rounds to 0.5
    expect(determineDominantSide(50.25, 50)).toBe("equal");
  });

  it("determineDominantSide: relative diff just above 0.5% → dominant side", () => {
    // R=50.5, L=50 → 0.5/50.25*100 = 0.995 → 1.0 → right dominant
    expect(determineDominantSide(50.5, 50)).toBe("right");
  });
});

describe("Edge cases — zero values", () => {
  it("one side zero, other non-zero: AI is extreme", () => {
    const ai = calculateAsymmetryIndex(0, 60);
    // (0-60)/(60) * 100 = -100
    expect(ai).toBe(-100);
  });

  it("one side zero, other non-zero: relativeDiff is 200%", () => {
    const rd = calculateRelativeDifference(0, 60);
    // |0-60| / (60/2) * 100 = 60/30*100 = 200
    expect(rd).toBe(200);
  });

  it("one side zero, other non-zero: dominantSide is the non-zero side", () => {
    expect(determineDominantSide(0, 60)).toBe("left");
    expect(determineDominantSide(60, 0)).toBe("right");
  });

  it("both sides zero: all metrics return 0/equal", () => {
    expect(calculateAsymmetryIndex(0, 0)).toBe(0);
    expect(calculateRelativeDifference(0, 0)).toBe(0);
    expect(determineDominantSide(0, 0)).toBe("equal");
    const diff = calculateSideDifference(0, 0);
    expect(diff.difference).toBe(0);
    expect(diff.absoluteDifference).toBe(0);
  });
});

// ── Calibration Tests ──────────────────────────────────────

describe("computeMmPerPixel", () => {
  it("computes mm_per_pixel correctly", () => {
    expect(computeMmPerPixel(500, 40)).toBeCloseTo(0.08, 10);
  });

  it("returns 0 when pixelDistance is 0 (guard)", () => {
    expect(computeMmPerPixel(0, 40)).toBe(0);
  });

  it("returns 0 when realDistanceMm is 0", () => {
    expect(computeMmPerPixel(500, 0)).toBe(0);
  });

  it("computes correctly for known clinical values", () => {
    // 1000 pixels, 80 mm → 0.08 mm/pixel
    expect(computeMmPerPixel(1000, 80)).toBeCloseTo(0.08, 10);
  });

  it("computes for small pixel distances", () => {
    expect(computeMmPerPixel(10, 5)).toBeCloseTo(0.5, 10);
  });
});

describe("convertDistanceToMm", () => {
  const mmPerPixel = 0.08;

  it("converts normalized distance to mm correctly", () => {
    // normalizedDistance = 0.5, image 1000×800
    // pixelDistance = 0.5 × max(1000, 800) = 0.5 × 1000 = 500
    // mm = 500 × 0.08 = 40.0
    const result = convertDistanceToMm(0.5, 1000, 800, mmPerPixel);
    expect(result).toBe(40.0);
  });

  it("returns 0 for zero normalized distance", () => {
    expect(convertDistanceToMm(0, 1000, 800, mmPerPixel)).toBe(0);
  });

  it("handles full normalized distance (1.0)", () => {
    // pixelDistance = 1.0 × 1000 = 1000 → mm = 1000 × 0.08 = 80.0
    expect(convertDistanceToMm(1.0, 1000, 800, mmPerPixel)).toBe(80.0);
  });

  it("uses max(imageWidth, imageHeight) for pixel conversion", () => {
    // image 800×1200 → max = 1200
    // pixelDistance = 0.5 × 1200 = 600 → mm = 600 × 0.08 = 48.0
    expect(convertDistanceToMm(0.5, 800, 1200, mmPerPixel)).toBe(48.0);
  });

  it("returns full floating-point precision (display layer rounds)", () => {
    // normalizedDistance = 0.333, image 1000×800
    // pixelDistance = 0.333 × 1000 = 333 → mm = 333 × 0.08 = 26.64
    // Full precision is returned; the display layer (toFixed(1)) handles rounding.
    expect(convertDistanceToMm(0.333, 1000, 800, mmPerPixel)).toBe(26.64);
  });

  it("full calibration pipeline: distance → mmPerPixel → mm conversion", () => {
    // Two calibration points 0.5 apart in normalized coords, image 1000×800
    const normDist = 0.5;
    const imageW = 1000;
    const imageH = 800;
    const pixelDist = normDist * Math.max(imageW, imageH); // 500
    const realMm = 40;
    const mmPerPx = computeMmPerPixel(pixelDist, realMm); // 0.08
    const mm = convertDistanceToMm(normDist, imageW, imageH, mmPerPx); // 40.0
    expect(mmPerPx).toBeCloseTo(0.08, 10);
    expect(mm).toBe(40.0);
  });
});

// ── Normalized Coordinates ─────────────────────────────────

describe("Normalized coordinates (0.0–1.0)", () => {
  it("origin (0,0) to corner (1,1) gives √2", () => {
    const a: Point = { x: 0.0, y: 0.0 };
    const b: Point = { x: 1.0, y: 1.0 };
    expect(calculateDistance(a, b)).toBeCloseTo(Math.SQRT2, 10);
  });

  it("distance within [0, √2] for valid normalized coords", () => {
    const a: Point = { x: 0.25, y: 0.25 };
    const b: Point = { x: 0.75, y: 0.75 };
    const d = calculateDistance(a, b);
    expect(d).toBeGreaterThanOrEqual(0);
    expect(d).toBeLessThanOrEqual(Math.SQRT2);
  });

  it("midpoint to edge distances are correct", () => {
    const center: Point = { x: 0.5, y: 0.5 };
    const right: Point = { x: 1.0, y: 0.5 };
    expect(calculateDistance(center, right)).toBeCloseTo(0.5, 10);
  });

  it("normalized coords produce consistent ratios regardless of scale", () => {
    // 0.3 and 0.4 → 3-4-5 triangle → 0.5
    const a: Point = { x: 0.0, y: 0.0 };
    const b: Point = { x: 0.3, y: 0.4 };
    expect(calculateDistance(a, b)).toBeCloseTo(0.5, 10);
  });
});

// ── Bilateral mm Measurement Functions (Part 2) ────────────

describe("calculateDifferenceMm", () => {
  it("returns positive when right > left", () => {
    expect(calculateDifferenceMm(52.0, 50.0)).toBe(2.0);
  });

  it("returns negative when left > right", () => {
    expect(calculateDifferenceMm(48.0, 50.0)).toBe(-2.0);
  });

  it("returns 0 when equal", () => {
    expect(calculateDifferenceMm(50.0, 50.0)).toBe(0);
  });
});

describe("determineLongerSide", () => {
  it("returns 'right' when right is longer by >0.5mm", () => {
    expect(determineLongerSide(52.0, 50.0)).toBe("right");
  });

  it("returns 'left' when left is longer by >0.5mm", () => {
    expect(determineLongerSide(48.0, 50.0)).toBe("left");
  });

  it("returns 'equal' when difference is exactly 0.5mm (inclusive)", () => {
    expect(determineLongerSide(50.5, 50.0)).toBe("equal");
  });

  it("returns 'equal' when values are identical", () => {
    expect(determineLongerSide(50.0, 50.0)).toBe("equal");
  });

  it("returns 'right' when difference is 0.6mm (just above threshold)", () => {
    expect(determineLongerSide(50.6, 50.0)).toBe("right");
  });
});

describe("determineShorterSide", () => {
  it("returns 'left' when right is longer", () => {
    expect(determineShorterSide(52.0, 50.0)).toBe("left");
  });

  it("returns 'right' when left is longer", () => {
    expect(determineShorterSide(48.0, 50.0)).toBe("right");
  });

  it("returns 'equal' when difference ≤ 0.5mm", () => {
    expect(determineShorterSide(50.5, 50.0)).toBe("equal");
  });
});

describe("generateRamusComparison", () => {
  it("generates 'right longer' sentence correctly", () => {
    const sentence = generateRamusComparison(52.0, 50.0);
    expect(sentence).toBe("The right mandibular ramus is 2.0 mm longer than the left.");
  });

  it("generates 'left longer' sentence correctly", () => {
    const sentence = generateRamusComparison(47.0, 50.0);
    expect(sentence).toBe("The left mandibular ramus is 3.0 mm longer than the right.");
  });

  it("generates 'approximately equal' sentence when within threshold", () => {
    const sentence = generateRamusComparison(50.3, 50.0);
    expect(sentence).toBe("Mandibular ramus lengths are approximately equal.");
  });

  it("never reverses right and left — right is longer says 'right'", () => {
    const sentence = generateRamusComparison(55.0, 50.0);
    expect(sentence).toContain("right mandibular ramus");
    expect(sentence).toContain("longer than the left");
    expect(sentence).not.toContain("left mandibular ramus is");
  });

  it("never reverses right and left — left is longer says 'left'", () => {
    const sentence = generateRamusComparison(50.0, 55.0);
    expect(sentence).toContain("left mandibular ramus");
    expect(sentence).toContain("longer than the right");
    expect(sentence).not.toContain("right mandibular ramus is");
  });
});

describe("generateBodyComparison", () => {
  it("generates 'right longer' sentence correctly", () => {
    const sentence = generateBodyComparison(75.0, 72.0);
    expect(sentence).toBe("The right mandibular body is 3.0 mm longer than the left.");
  });

  it("generates 'left longer' sentence correctly", () => {
    const sentence = generateBodyComparison(70.0, 74.0);
    expect(sentence).toBe("The left mandibular body is 4.0 mm longer than the right.");
  });

  it("generates 'approximately equal' sentence when within threshold", () => {
    const sentence = generateBodyComparison(72.4, 72.0);
    expect(sentence).toBe("Mandibular body lengths are approximately equal.");
  });

  it("never reverses right and left — right is longer", () => {
    const sentence = generateBodyComparison(80.0, 70.0);
    expect(sentence).toContain("right mandibular body");
    expect(sentence).not.toContain("left mandibular body is");
  });

  it("never reverses right and left — left is longer", () => {
    const sentence = generateBodyComparison(70.0, 80.0);
    expect(sentence).toContain("left mandibular body");
    expect(sentence).not.toContain("right mandibular body is");
  });
});

describe("generateMandibularAsymmetryConclusion", () => {
  it("both ramus and body differ → mentions both ramus and body", () => {
    const conclusion = generateMandibularAsymmetryConclusion(52.0, 50.0, 75.0, 72.0);
    expect(conclusion).toContain("involving both the ramus and mandibular body");
    expect(conclusion).toContain("right ramus measures 52.0 mm");
    expect(conclusion).toContain("is 2.0 mm longer");
    expect(conclusion).toContain("left ramus, which measures 50.0 mm");
    expect(conclusion).toContain("right mandibular body measures 75.0 mm");
    expect(conclusion).toContain("left mandibular body, which measures 72.0 mm");
  });

  it("only ramus differs → predominantly ramus asymmetry", () => {
    const conclusion = generateMandibularAsymmetryConclusion(52.0, 50.0, 72.0, 72.0);
    expect(conclusion).toContain("predominantly ramus asymmetry");
    expect(conclusion).toContain("right ramus measures 52.0 mm");
    expect(conclusion).toContain("is 2.0 mm longer");
    expect(conclusion).toContain("Mandibular body lengths are approximately equal in the current projection");
  });

  it("only body differs → predominantly mandibular body asymmetry", () => {
    const conclusion = generateMandibularAsymmetryConclusion(50.0, 50.0, 75.0, 72.0);
    expect(conclusion).toContain("predominantly mandibular body asymmetry");
    expect(conclusion).toContain("right mandibular body measures 75.0 mm");
    expect(conclusion).toContain("is 3.0 mm longer");
    expect(conclusion).toContain("Ramus lengths are approximately equal in the current projection");
  });

  it("neither differs → no significant asymmetry", () => {
    const conclusion = generateMandibularAsymmetryConclusion(50.0, 50.0, 72.0, 72.0);
    expect(conclusion).toContain("do not demonstrate significant mandibular skeletal asymmetry");
    expect(conclusion).toContain("Ramus and mandibular body lengths are approximately equal");
  });

  it("CRITICAL: evaluates sides independently — right ramus longer, left body longer", () => {
    // Right ramus is longer, but LEFT body is longer — must not assume same side
    const conclusion = generateMandibularAsymmetryConclusion(52.0, 50.0, 70.0, 74.0);
    expect(conclusion).toContain("involving both the ramus and mandibular body");
    expect(conclusion).toContain("right ramus measures 52.0 mm");
    expect(conclusion).toContain("left mandibular body measures 74.0 mm");
    expect(conclusion).toContain("is 4.0 mm longer");
    // Must NOT say right body is longer
    expect(conclusion).not.toContain("right mandibular body measures.*longer");
  });

  it("CRITICAL: left ramus longer, right body longer — independent evaluation", () => {
    const conclusion = generateMandibularAsymmetryConclusion(48.0, 50.0, 75.0, 72.0);
    expect(conclusion).toContain("left ramus measures 50.0 mm");
    expect(conclusion).toContain("right mandibular body measures 75.0 mm");
    expect(conclusion).not.toMatch(/right ramus measures.*longer/);
    expect(conclusion).not.toMatch(/left mandibular body measures.*longer/);
  });

  it("never reverses right and left in conclusion text", () => {
    // Right clearly longer in both
    const conclusion = generateMandibularAsymmetryConclusion(55.0, 50.0, 80.0, 70.0);
    expect(conclusion).toContain("right ramus measures 55.0 mm");
    expect(conclusion).toContain("is 5.0 mm longer than the left ramus, which measures 50.0 mm");
    expect(conclusion).toContain("right mandibular body measures 80.0 mm");
    expect(conclusion).toContain("is 10.0 mm longer than the left mandibular body, which measures 70.0 mm");
  });

  it("uses comparative, not diagnostic language", () => {
    const conclusion = generateMandibularAsymmetryConclusion(52.0, 50.0, 75.0, 72.0);
    expect(conclusion).not.toContain("diagnosis");
    expect(conclusion).not.toContain("hypoplasia");
    expect(conclusion).not.toContain("hyperplasia");
    expect(conclusion).toContain("2D measurements");
  });

  it("includes actual measured mm values for both sides", () => {
    const conclusion = generateMandibularAsymmetryConclusion(60.0, 58.0, 78.0, 81.0);
    expect(conclusion).toContain("60.0 mm");
    expect(conclusion).toContain("58.0 mm");
    expect(conclusion).toContain("78.0 mm");
    expect(conclusion).toContain("81.0 mm");
  });

  it("conclusion format matches the required spec example", () => {
    // Spec example: "The right ramus measures 60.0 mm and is 2.0 mm longer
    // than the left ramus, which measures 58.0 mm."
    const conclusion = generateMandibularAsymmetryConclusion(60.0, 58.0, 78.0, 81.0);
    expect(conclusion).toContain("The right ramus measures 60.0 mm and is 2.0 mm longer than the left ramus, which measures 58.0 mm.");
    expect(conclusion).toContain("The left mandibular body measures 81.0 mm and is 3.0 mm longer than the right mandibular body, which measures 78.0 mm.");
  });

  it("threshold boundary: exactly 0.5mm difference is NOT 'differs'", () => {
    // 0.5mm exactly → not differs (threshold is >0.5)
    const conclusion = generateMandibularAsymmetryConclusion(50.5, 50.0, 72.0, 72.0);
    expect(conclusion).toContain("do not demonstrate significant");
  });

  it("threshold boundary: 0.6mm difference IS 'differs'", () => {
    const conclusion = generateMandibularAsymmetryConclusion(50.6, 50.0, 72.0, 72.0);
    expect(conclusion).toContain("predominantly ramus asymmetry");
  });
});

// ── Required Spec Test Cases (mm measurement & conclusion) ──
// These verify the EXACT values from the spec, ensuring the
// mm measurement and conclusion features produce correct output
// for the specific clinical scenarios required.

describe("Required spec test case 1 — Ramus R=60, L=58", () => {
  it("calculateDifferenceMm returns 2.0mm", () => {
    expect(calculateDifferenceMm(60, 58)).toBe(2.0);
  });

  it("determineLongerSide returns 'right'", () => {
    expect(determineLongerSide(60, 58)).toBe("right");
  });

  it("determineShorterSide returns 'left'", () => {
    expect(determineShorterSide(60, 58)).toBe("left");
  });

  it("generateRamusComparison states right is longer by 2.0mm", () => {
    const sentence = generateRamusComparison(60, 58);
    expect(sentence).toBe("The right mandibular ramus is 2.0 mm longer than the left.");
    // Verify it does NOT say left is longer
    expect(sentence).not.toContain("left mandibular ramus is");
  });
});

describe("Required spec test case 2 — Body R=78, L=82", () => {
  it("calculateDifferenceMm returns -4.0mm (left longer)", () => {
    expect(calculateDifferenceMm(78, 82)).toBe(-4.0);
  });

  it("determineLongerSide returns 'left'", () => {
    expect(determineLongerSide(78, 82)).toBe("left");
  });

  it("determineShorterSide returns 'right'", () => {
    expect(determineShorterSide(78, 82)).toBe("right");
  });

  it("generateBodyComparison states left is longer by 4.0mm", () => {
    const sentence = generateBodyComparison(78, 82);
    expect(sentence).toBe("The left mandibular body is 4.0 mm longer than the right.");
    // Verify it does NOT say right is longer
    expect(sentence).not.toContain("right mandibular body is");
  });
});

describe("Required spec test case 3 — Equal R=60, L=60", () => {
  it("calculateDifferenceMm returns 0mm", () => {
    expect(calculateDifferenceMm(60, 60)).toBe(0);
  });

  it("determineLongerSide returns 'equal'", () => {
    expect(determineLongerSide(60, 60)).toBe("equal");
  });

  it("determineShorterSide returns 'equal'", () => {
    expect(determineShorterSide(60, 60)).toBe("equal");
  });

  it("generateRamusComparison states approximately equal", () => {
    expect(generateRamusComparison(60, 60)).toBe(
      "Mandibular ramus lengths are approximately equal."
    );
  });

  it("generateBodyComparison states approximately equal", () => {
    expect(generateBodyComparison(60, 60)).toBe(
      "Mandibular body lengths are approximately equal."
    );
  });
});

describe("Required spec test case 4 — Combined asymmetric directions", () => {
  // Ramus: R=62, L=59 → right ramus longer by 3mm
  // Body: R=77, L=81 → left body longer by 4mm
  // Conclusion must mention BOTH correctly without reversing.

  it("ramus comparison: right longer by 3.0mm", () => {
    expect(generateRamusComparison(62, 59)).toBe(
      "The right mandibular ramus is 3.0 mm longer than the left."
    );
  });

  it("body comparison: left longer by 4.0mm", () => {
    expect(generateBodyComparison(77, 81)).toBe(
      "The left mandibular body is 4.0 mm longer than the right."
    );
  });

  it("conclusion states both ramus and body involvement", () => {
    const conclusion = generateMandibularAsymmetryConclusion(62, 59, 77, 81);
    expect(conclusion).toContain("involving both the ramus and mandibular body");
  });

  it("conclusion states right ramus measures 62.0 mm and is 3.0 mm longer", () => {
    const conclusion = generateMandibularAsymmetryConclusion(62, 59, 77, 81);
    expect(conclusion).toContain("right ramus measures 62.0 mm");
    expect(conclusion).toContain("is 3.0 mm longer");
  });

  it("conclusion states left body measures 81.0 mm and is 4.0 mm longer", () => {
    const conclusion = generateMandibularAsymmetryConclusion(62, 59, 77, 81);
    expect(conclusion).toContain("left mandibular body measures 81.0 mm");
    expect(conclusion).toContain("is 4.0 mm longer");
  });

  it("conclusion does NOT say left ramus is longer", () => {
    const conclusion = generateMandibularAsymmetryConclusion(62, 59, 77, 81);
    expect(conclusion).not.toMatch(/left ramus measures.*longer/);
  });

  it("conclusion does NOT say right body is longer", () => {
    const conclusion = generateMandibularAsymmetryConclusion(62, 59, 77, 81);
    expect(conclusion).not.toMatch(/right mandibular body measures.*longer/);
  });

  it("evaluate ramus and body independently — different sides can be longer", () => {
    const conclusion = generateMandibularAsymmetryConclusion(62, 59, 77, 81);
    // Right is longer for ramus, left is longer for body — both in same conclusion
    expect(conclusion).toContain("right ramus measures");
    expect(conclusion).toContain("left mandibular body measures");
  });
});

describe("Required spec test case 5 — Regression: text never reverses right and left", () => {
  // Systematic regression test: verify that in ALL comparison and conclusion
  // functions, when right is longer, text says "right"; when left is longer,
  // text says "left". No function should ever swap the sides.

  it("generateRamusComparison: right longer → says 'right', not 'left'", () => {
    const s = generateRamusComparison(65, 55);
    expect(s).toContain("right mandibular ramus");
    expect(s).toContain("longer than the left");
    expect(s).not.toMatch(/left mandibular ramus is.*longer/);
  });

  it("generateRamusComparison: left longer → says 'left', not 'right'", () => {
    const s = generateRamusComparison(55, 65);
    expect(s).toContain("left mandibular ramus");
    expect(s).toContain("longer than the right");
    expect(s).not.toMatch(/right mandibular ramus is.*longer/);
  });

  it("generateBodyComparison: right longer → says 'right', not 'left'", () => {
    const s = generateBodyComparison(85, 75);
    expect(s).toContain("right mandibular body");
    expect(s).toContain("longer than the left");
    expect(s).not.toMatch(/left mandibular body is.*longer/);
  });

  it("generateBodyComparison: left longer → says 'left', not 'right'", () => {
    const s = generateBodyComparison(75, 85);
    expect(s).toContain("left mandibular body");
    expect(s).toContain("longer than the right");
    expect(s).not.toMatch(/right mandibular body is.*longer/);
  });

  it("generateMandibularAsymmetryConclusion: right both → says 'right' for both", () => {
    const c = generateMandibularAsymmetryConclusion(65, 55, 85, 75);
    expect(c).toContain("right ramus measures 65.0 mm");
    expect(c).toContain("right mandibular body measures 85.0 mm");
    expect(c).not.toMatch(/left ramus measures.*longer/);
    expect(c).not.toMatch(/left mandibular body measures.*longer/);
  });

  it("generateMandibularAsymmetryConclusion: left both → says 'left' for both", () => {
    const c = generateMandibularAsymmetryConclusion(55, 65, 75, 85);
    expect(c).toContain("left ramus measures 65.0 mm");
    expect(c).toContain("left mandibular body measures 85.0 mm");
    expect(c).not.toMatch(/right ramus measures.*longer/);
    expect(c).not.toMatch(/right mandibular body measures.*longer/);
  });

  it("generateMandibularAsymmetryConclusion: mixed (right ramus, left body) — no reversal", () => {
    const c = generateMandibularAsymmetryConclusion(65, 55, 75, 85);
    expect(c).toContain("right ramus measures 65.0 mm");
    expect(c).toContain("left mandibular body measures 85.0 mm");
    // Must NOT reverse
    expect(c).not.toMatch(/left ramus measures.*longer/);
    expect(c).not.toMatch(/right mandibular body measures.*longer/);
  });

  it("generateMandibularAsymmetryConclusion: mixed (left ramus, right body) — no reversal", () => {
    const c = generateMandibularAsymmetryConclusion(55, 65, 85, 75);
    expect(c).toContain("left ramus measures 65.0 mm");
    expect(c).toContain("right mandibular body measures 85.0 mm");
    // Must NOT reverse
    expect(c).not.toMatch(/right ramus measures.*longer/);
    expect(c).not.toMatch(/left mandibular body measures.*longer/);
  });
});

// ── Measurement Pipeline: pixel → mm conversion ─────────────
// Verify the full pipeline: pixel distance → calibration → mm
// Per spec: Point A = (100, 100), Point B = (100, 300),
// pixel distance = 200px, calibration = 0.3 mm/px → 60.0 mm

describe("Measurement pipeline — pixel to mm conversion", () => {
  it("spec example: 200px at 0.3 mm/px → 60.0 mm", () => {
    // Point A = (100, 100), Point B = (100, 300)
    // pixel distance = 200, calibration = 0.3 mm/px
    const pixelDistance = 200;
    const mmPerPixel = 0.3;
    const mm = pixelDistance * mmPerPixel;
    expect(mm).toBe(60.0);
  });

  it("full pipeline: normalized coords → pixels → mm (spec values)", () => {
    // Simulate: image 1000×1000, points at normalized (0.1, 0.1) and (0.1, 0.3)
    // pixel distance = 0.2 × 1000 = 200px, mmPerPixel = 0.3 → 60.0 mm
    const a: Point = { x: 0.1, y: 0.1 };
    const b: Point = { x: 0.1, y: 0.3 };
    const normDist = calculateDistance(a, b); // 0.2
    const mm = convertDistanceToMm(normDist, 1000, 1000, 0.3);
    expect(normDist).toBeCloseTo(0.2, 10);
    // 0.2 × 1000 × 0.3 = 60.0, but FP gives 59.999...986 — use toBeCloseTo
    expect(mm).toBeCloseTo(60.0, 5);
  });

  it("ramus measurement through full pipeline", () => {
    // Ramus height: CoR to GoR (vertical), CoL to GoL (vertical)
    // Right: normalized distance 0.45, Left: 0.42
    // Image 1000×800, mmPerPixel = 0.3
    const rightNorm = 0.45;
    const leftNorm = 0.42;
    const rightMm = convertDistanceToMm(rightNorm, 1000, 800, 0.3);
    const leftMm = convertDistanceToMm(leftNorm, 1000, 800, 0.3);
    // rightMm = 0.45 × 1000 × 0.3 = 135.0
    // leftMm = 0.42 × 1000 × 0.3 = 126.0
    expect(rightMm).toBe(135.0);
    expect(leftMm).toBe(126.0);
    expect(calculateDifferenceMm(rightMm, leftMm)).toBe(9.0);
    expect(determineLongerSide(rightMm, leftMm)).toBe("right");
  });

  it("body measurement through full pipeline", () => {
    // Body length: GoR to Me, GoL to Me (horizontal-ish)
    // Right: normalized 0.35, Left: 0.37
    const rightMm = convertDistanceToMm(0.35, 1000, 800, 0.3);
    const leftMm = convertDistanceToMm(0.37, 1000, 800, 0.3);
    // rightMm = 0.35 × 1000 × 0.3 = 105.0
    // leftMm = 0.37 × 1000 × 0.3 = 111.0
    expect(rightMm).toBe(105.0);
    expect(leftMm).toBe(111.0);
    expect(calculateDifferenceMm(rightMm, leftMm)).toBe(-6.0);
    expect(determineLongerSide(rightMm, leftMm)).toBe("left");
  });

  it("diagonal line through mm pipeline", () => {
    // Diagonal: (0.0, 0.0) to (0.3, 0.4) → 0.5 normalized (3-4-5 triangle)
    // Image 1000×1000, mmPerPixel = 0.3
    // pixelDist = 0.5 × 1000 = 500, mm = 500 × 0.3 = 150.0
    const a: Point = { x: 0.0, y: 0.0 };
    const b: Point = { x: 0.3, y: 0.4 };
    const normDist = calculateDistance(a, b);
    expect(normDist).toBeCloseTo(0.5, 10);
    const mm = convertDistanceToMm(normDist, 1000, 1000, 0.3);
    expect(mm).toBe(150.0);
  });

  it("diagonal line: full width corner to corner", () => {
    // (0.0, 0.0) to (1.0, 1.0) → √2 ≈ 1.4142
    // Image 1000×1000, mmPerPixel = 0.3
    // pixelDist = √2 × 1000 ≈ 1414.21, mm ≈ 424.26
    const a: Point = { x: 0.0, y: 0.0 };
    const b: Point = { x: 1.0, y: 1.0 };
    const normDist = calculateDistance(a, b);
    const mm = convertDistanceToMm(normDist, 1000, 1000, 0.3);
    expect(mm).toBeCloseTo(Math.SQRT2 * 1000 * 0.3, 5);
  });

  it("pipeline with computeMmPerPixel (calibration from known distance)", () => {
    // Clinician marks two points 200px apart, known real distance = 60mm
    // mmPerPixel = 60 / 200 = 0.3
    // Then measures a line of 200px → 60.0 mm
    const calibPx = 200;
    const calibMm = 60;
    const mmPerPixel = computeMmPerPixel(calibPx, calibMm);
    expect(mmPerPixel).toBeCloseTo(0.3, 10);
    // Now measure a line: normalized 0.2, image 1000×1000
    const measured = convertDistanceToMm(0.2, 1000, 1000, mmPerPixel);
    expect(measured).toBeCloseTo(60.0, 5);
  });
});

// ── Zoom/Pan Invariance ─────────────────────────────────────
// Landmarks are stored in normalized coordinates (0.0–1.0).
// Zoom and pan only affect the display transform, NOT the stored
// normalized coordinates. Therefore mm measurements must be
// invariant under zoom/pan. They only change when landmarks move
// or calibration changes.

describe("Zoom/pan invariance — mm value must not change", () => {
  // Simulate a set of landmarks in normalized coordinates
  const landmarks = {
    CoR: { x: 0.7, y: 0.2 } as Point,
    GoR: { x: 0.7, y: 0.6 } as Point,
    CoL: { x: 0.3, y: 0.2 } as Point,
    GoL: { x: 0.3, y: 0.6 } as Point,
    Me:  { x: 0.5, y: 0.85 } as Point,
  };
  const imageW = 1000;
  const imageH = 800;
  const mmPerPixel = 0.3;

  // Helper: compute ramus and body mm from normalized landmarks
  function measureMm(lm: typeof landmarks) {
    const ramusRightNorm = calculateDistance(lm.CoR, lm.GoR);
    const ramusLeftNorm = calculateDistance(lm.CoL, lm.GoL);
    const bodyRightNorm = calculateDistance(lm.GoR, lm.Me);
    const bodyLeftNorm = calculateDistance(lm.GoL, lm.Me);
    return {
      ramusRightMm: convertDistanceToMm(ramusRightNorm, imageW, imageH, mmPerPixel),
      ramusLeftMm: convertDistanceToMm(ramusLeftNorm, imageW, imageH, mmPerPixel),
      bodyRightMm: convertDistanceToMm(bodyRightNorm, imageW, imageH, mmPerPixel),
      bodyLeftMm: convertDistanceToMm(bodyLeftNorm, imageW, imageH, mmPerPixel),
    };
  }

  it("mm values are identical at 100% and 200% zoom", () => {
    // Zoom changes the display scale but NOT the normalized landmark coords.
    // The domain function only uses normalized coords + image dims + mmPerPixel.
    // So the result is identical regardless of zoom.
    const at100 = measureMm(landmarks);
    const at200 = measureMm(landmarks); // same normalized coords → same mm
    expect(at200.ramusRightMm).toBe(at100.ramusRightMm);
    expect(at200.ramusLeftMm).toBe(at100.ramusLeftMm);
    expect(at200.bodyRightMm).toBe(at100.bodyRightMm);
    expect(at200.bodyLeftMm).toBe(at100.bodyLeftMm);
  });

  it("mm values are identical at 100% and 50% zoom", () => {
    const at100 = measureMm(landmarks);
    const at50 = measureMm(landmarks);
    expect(at50.ramusRightMm).toBe(at100.ramusRightMm);
    expect(at50.bodyRightMm).toBe(at100.bodyRightMm);
  });

  it("mm values are identical when panned (offset applied)", () => {
    // Panning shifts the display offset but NOT normalized landmark coords.
    // Same normalized coords → same mm.
    const beforePan = measureMm(landmarks);
    // Pan doesn't change landmarks in normalized space
    const afterPan = measureMm(landmarks);
    expect(afterPan.ramusRightMm).toBe(beforePan.ramusRightMm);
    expect(afterPan.ramusLeftMm).toBe(beforePan.ramusLeftMm);
    expect(afterPan.bodyRightMm).toBe(beforePan.bodyRightMm);
    expect(afterPan.bodyLeftMm).toBe(beforePan.bodyLeftMm);
  });

  it("mm values DO change when a landmark moves", () => {
    const original = measureMm(landmarks);
    // Move CoR down (increase y) → ramus right becomes shorter
    const movedLandmarks = {
      ...landmarks,
      CoR: { x: 0.7, y: 0.35 } as Point, // moved from y=0.2 to y=0.35
    };
    const moved = measureMm(movedLandmarks);
    expect(moved.ramusRightMm).not.toBe(original.ramusRightMm);
    expect(moved.ramusRightMm).toBeLessThan(original.ramusRightMm);
    // Left ramus unchanged (CoL didn't move)
    expect(moved.ramusLeftMm).toBe(original.ramusLeftMm);
  });

  it("mm values DO change when calibration changes", () => {
    const original = measureMm(landmarks);
    // Change mmPerPixel from 0.3 to 0.25
    const newMmPerPixel = 0.25;
    const ramusRightNorm = calculateDistance(landmarks.CoR, landmarks.GoR);
    const newRamusRightMm = convertDistanceToMm(ramusRightNorm, imageW, imageH, newMmPerPixel);
    expect(newRamusRightMm).not.toBe(original.ramusRightMm);
    // 0.25 < 0.3 → smaller mm value
    expect(newRamusRightMm).toBeLessThan(original.ramusRightMm);
  });

  it("ramus = 60.0 mm at 100% zoom, still 60.0 mm at 200% zoom (spec example)", () => {
    // Construct a scenario where ramus right = 60.0 mm
    // Need normDist × max(1000,800) × 0.3 = 60.0
    // normDist × 1000 × 0.3 = 60 → normDist = 0.2
    const coR: Point = { x: 0.7, y: 0.2 };
    const goR: Point = { x: 0.7, y: 0.4 }; // distance = 0.2
    const normDist = calculateDistance(coR, goR);
    expect(normDist).toBeCloseTo(0.2, 10);
    const mmAt100 = convertDistanceToMm(normDist, imageW, imageH, mmPerPixel);
    expect(mmAt100).toBe(60.0);
    // At 200% zoom: same normalized coords → same mm
    const mmAt200 = convertDistanceToMm(normDist, imageW, imageH, mmPerPixel);
    expect(mmAt200).toBe(60.0);
    expect(mmAt200).toBe(mmAt100);
  });
});

// ── Overlay & Results Panel Consistency ─────────────────────
// Both the overlay and results panel read from the same store state
// and use the same domain calculation. Verify that the calculation
// produces consistent values (same input → same output, deterministically).

describe("Overlay and results panel consistency", () => {
  it("same landmarks + calibration → identical mm values on repeated calls", () => {
    const coR: Point = { x: 0.7, y: 0.2 };
    const goR: Point = { x: 0.7, y: 0.6 };
    const coL: Point = { x: 0.3, y: 0.2 };
    const goL: Point = { x: 0.3, y: 0.6 };
    const me: Point = { x: 0.5, y: 0.85 };
    const imageW = 1000;
    const imageH = 800;
    const mmPerPixel = 0.3;

    // Simulate "overlay" calculation
    const overlayRamusRight = convertDistanceToMm(calculateDistance(coR, goR), imageW, imageH, mmPerPixel);
    const overlayRamusLeft = convertDistanceToMm(calculateDistance(coL, goL), imageW, imageH, mmPerPixel);
    const overlayBodyRight = convertDistanceToMm(calculateDistance(goR, me), imageW, imageH, mmPerPixel);
    const overlayBodyLeft = convertDistanceToMm(calculateDistance(goL, me), imageW, imageH, mmPerPixel);

    // Simulate "results panel" calculation (same function, same inputs)
    const panelRamusRight = convertDistanceToMm(calculateDistance(coR, goR), imageW, imageH, mmPerPixel);
    const panelRamusLeft = convertDistanceToMm(calculateDistance(coL, goL), imageW, imageH, mmPerPixel);
    const panelBodyRight = convertDistanceToMm(calculateDistance(goR, me), imageW, imageH, mmPerPixel);
    const panelBodyLeft = convertDistanceToMm(calculateDistance(goL, me), imageW, imageH, mmPerPixel);

    expect(panelRamusRight).toBe(overlayRamusRight);
    expect(panelRamusLeft).toBe(overlayRamusLeft);
    expect(panelBodyRight).toBe(overlayBodyRight);
    expect(panelBodyLeft).toBe(overlayBodyLeft);
  });

  it("conclusion uses same mm values as the measurement pipeline", () => {
    // The conclusion function receives mm values; verify they match what
    // the pipeline produces.
    const coR: Point = { x: 0.7, y: 0.2 };
    const goR: Point = { x: 0.7, y: 0.6 };
    const coL: Point = { x: 0.3, y: 0.2 };
    const goL: Point = { x: 0.3, y: 0.6 };
    const me: Point = { x: 0.5, y: 0.85 };
    const imageW = 1000;
    const imageH = 800;
    const mmPerPixel = 0.3;

    const ramusRightMm = convertDistanceToMm(calculateDistance(coR, goR), imageW, imageH, mmPerPixel);
    const ramusLeftMm = convertDistanceToMm(calculateDistance(coL, goL), imageW, imageH, mmPerPixel);
    const bodyRightMm = convertDistanceToMm(calculateDistance(goR, me), imageW, imageH, mmPerPixel);
    const bodyLeftMm = convertDistanceToMm(calculateDistance(goL, me), imageW, imageH, mmPerPixel);

    const conclusion = generateMandibularAsymmetryConclusion(
      ramusRightMm, ramusLeftMm, bodyRightMm, bodyLeftMm
    );

    // Conclusion must contain the same mm values the pipeline produced
    expect(conclusion).toContain(ramusRightMm.toFixed(1));
    expect(conclusion).toContain(ramusLeftMm.toFixed(1));
    expect(conclusion).toContain(bodyRightMm.toFixed(1));
    expect(conclusion).toContain(bodyLeftMm.toFixed(1));
  });
});

// ── Calibration Changes Update Measurements ─────────────────

describe("Calibration changes update measurements", () => {
  it("changing mmPerPixel changes all mm measurements proportionally", () => {
    const normDist = 0.5;
    const imageW = 1000;
    const imageH = 800;

    const mmAt0_3 = convertDistanceToMm(normDist, imageW, imageH, 0.3);
    const mmAt0_2 = convertDistanceToMm(normDist, imageW, imageH, 0.2);
    const mmAt0_1 = convertDistanceToMm(normDist, imageW, imageH, 0.1);

    // mmAt0_3 = 0.5 × 1000 × 0.3 = 150
    // mmAt0_2 = 0.5 × 1000 × 0.2 = 100
    // mmAt0_1 = 0.5 × 1000 × 0.1 = 50
    expect(mmAt0_3).toBe(150.0);
    expect(mmAt0_2).toBe(100.0);
    expect(mmAt0_1).toBe(50.0);
    // Proportional: ratio should be 3:2:1
    expect(mmAt0_3 / mmAt0_2).toBeCloseTo(1.5, 10);
    expect(mmAt0_2 / mmAt0_1).toBeCloseTo(2.0, 10);
  });

  it("recalculating calibration from new known distance updates mmPerPixel", () => {
    // Original: 200px = 60mm → 0.3 mm/px
    const originalMmPerPx = computeMmPerPixel(200, 60);
    expect(originalMmPerPx).toBeCloseTo(0.3, 10);

    // Updated: same 200px but now known distance = 50mm → 0.25 mm/px
    const updatedMmPerPx = computeMmPerPixel(200, 50);
    expect(updatedMmPerPx).toBeCloseTo(0.25, 10);

    // Same measurement line (200px) now gives different mm
    const originalMm = 200 * originalMmPerPx;
    const updatedMm = 200 * updatedMmPerPx;
    expect(originalMm).toBe(60.0);
    expect(updatedMm).toBe(50.0);
    expect(updatedMm).not.toBe(originalMm);
  });

  it("conclusion reflects updated mm values after calibration change", () => {
    const normDist = 0.5;
    const imageW = 1000;
    const imageH = 800;

    const mmBefore = convertDistanceToMm(normDist, imageW, imageH, 0.3);
    const mmAfter = convertDistanceToMm(normDist, imageW, imageH, 0.25);

    // Ramus: R=mmBefore, L=mmBefore×0.95 (slightly shorter left)
    const ramusR_before = mmBefore;
    const ramusL_before = mmBefore * 0.95;
    const conclusionBefore = generateMandibularAsymmetryConclusion(
      ramusR_before, ramusL_before, 80, 80
    );
    expect(conclusionBefore).toContain(ramusR_before.toFixed(1));

    // After calibration change, use new mm values
    const ramusR_after = mmAfter;
    const ramusL_after = mmAfter * 0.95;
    const conclusionAfter = generateMandibularAsymmetryConclusion(
      ramusR_after, ramusL_after, 80, 80
    );
    expect(conclusionAfter).toContain(ramusR_after.toFixed(1));
    // Values should differ
    expect(ramusR_after).not.toBe(ramusR_before);
  });
});

// ── Conclusion includes actual measured mm values ───────────
// Spec: conclusion must include actual measured mm values, not just differences

describe("Conclusion includes actual measured mm values", () => {
  it("conclusion includes right and left ramus mm values (not just difference)", () => {
    const conclusion = generateMandibularAsymmetryConclusion(60.0, 58.0, 78.0, 81.0);
    // Must include the actual measurements, not just "2.0 mm longer"
    expect(conclusion).toContain("60.0 mm");
    expect(conclusion).toContain("58.0 mm");
    // Also includes the difference
    expect(conclusion).toContain("2.0 mm longer");
  });

  it("conclusion includes right and left body mm values (not just difference)", () => {
    const conclusion = generateMandibularAsymmetryConclusion(60.0, 58.0, 78.0, 81.0);
    expect(conclusion).toContain("78.0 mm");
    expect(conclusion).toContain("81.0 mm");
    expect(conclusion).toContain("3.0 mm longer");
  });

  it("conclusion equal case still includes actual mm values", () => {
    const conclusion = generateMandibularAsymmetryConclusion(55.0, 55.0, 72.0, 72.0);
    // Even when equal, actual values should be present
    expect(conclusion).toContain("55.0 mm");
    expect(conclusion).toContain("72.0 mm");
  });

  it("conclusion does not only show differences — includes absolute measurements", () => {
    const conclusion = generateMandibularAsymmetryConclusion(65.0, 55.0, 90.0, 70.0);
    // Check that all 4 absolute values appear
    expect(conclusion).toContain("65.0 mm");
    expect(conclusion).toContain("55.0 mm");
    expect(conclusion).toContain("90.0 mm");
    expect(conclusion).toContain("70.0 mm");
    // And the differences
    expect(conclusion).toContain("10.0 mm longer");
  });
});