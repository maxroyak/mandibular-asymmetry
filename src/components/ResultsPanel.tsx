// ── Results Panel ────────────────────────────────────────────
// Displays measurement results with mm as PRIMARY when calibrated.
// Hierarchy:
//   PRIMARY: Right mm, Left mm, Difference mm, comparison sentence
//   SECONDARY: Relative difference %, Habets index %, classification
// When uncalibrated: shows relative % as primary with calibration prompt.

import { useStudyStore } from "../store/studyStore";
import {
  generateRamusComparison,
  generateBodyComparison,
} from "../domain/mandibularAsymmetry";
import type {
  MeasurementResult,
  BilateralMeasurement,
  LandmarkSet,
  Point,
} from "../domain/types";

// ── 6% Reference Annotation (PIBot threshold validation) ────
// The 3-tier classification system has been removed. Instead, show an
// informational reference annotation for the 6% vertical magnification
// error margin and a mandatory disclaimer.
const REFERENCE_ANNOTATION = (
  <div className="mt-2 rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-800">
    <strong>Reference value: 6%</strong> — The 6% represents the vertical
    magnification error margin for panoramic radiography (Habets et al. 1987).
    Values below this may include positioning/magnification effects; values
    above are more likely to include a true anatomical component. This is an
    informational reference, not a validated diagnostic threshold.
  </div>
);

const THRESHOLD_DISCLAIMER = (
  <div className="mt-2 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
    <strong>No validated classification thresholds exist for this measurement.</strong>{" "}
    The 3% and 6% thresholds commonly cited were derived from the original
    Habets tracing method using vertical height measurements with segmental
    decomposition. This tool uses a simplified Co-Go Euclidean distance.
    Numerical values are for comparative screening only.
  </div>
);

// ── Larger side label helper ────────────────────────────────
function largerSideLabel(side: string): string {
  if (side === "right") return "Right";
  if (side === "left") return "Left";
  return "Neither — measurements are equal";
}

// ── Calibrated mm Section (PRIMARY) ──────────────────────────
// mm values front and center: Right mm, Left mm, Difference mm,
// then secondary metrics (%, classification).
function CalibratedMmSection({
  title,
  bilateral,
  result,
  comparisonSentence,
  measurementId,
  isBody,
}: {
  title: string;
  bilateral: BilateralMeasurement;
  result: MeasurementResult;
  comparisonSentence: string;
  measurementId: string;
  isBody?: boolean;
}) {
  const setHoveredLine = useStudyStore((s) => s.setHoveredLine);

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800">{title}</h4>
        <span className="text-xs text-gray-400 italic">Not classified</span>
      </div>

      {/* PRIMARY: mm values */}
      <div className="mb-2 grid grid-cols-3 gap-3">
        <div
          className="rounded border border-blue-200 bg-blue-50 p-2 text-center"
          onMouseEnter={() => setHoveredLine(`${measurementId}R`)}
          onMouseLeave={() => setHoveredLine(null)}
        >
          <div className="text-xs font-medium text-blue-600">Right</div>
          <div className="font-mono text-lg font-bold text-gray-800">
            {bilateral.rightMm.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500">mm</div>
        </div>
        <div
          className="rounded border border-green-200 bg-green-50 p-2 text-center"
          onMouseEnter={() => setHoveredLine(`${measurementId}L`)}
          onMouseLeave={() => setHoveredLine(null)}
        >
          <div className="text-xs font-medium text-green-600">Left</div>
          <div className="font-mono text-lg font-bold text-gray-800">
            {bilateral.leftMm.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500">mm</div>
        </div>
        <div className="rounded border border-gray-300 bg-gray-50 p-2 text-center">
          <div className="text-xs font-medium text-gray-500">Abs. Diff.</div>
          <div className="font-mono text-lg font-bold text-gray-800">
            {bilateral.absoluteDifferenceMm.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500">mm</div>
        </div>
      </div>

      {/* Comparison sentence */}
      <p className="mb-2 text-sm text-gray-700">{comparisonSentence}</p>

      {/* SECONDARY: relative %, Habets index (clearly separated) */}
      <div className="border-t border-gray-100 pt-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Relative Difference */}
          <div className="rounded bg-gray-50 p-2">
            <div className="font-medium text-gray-600">Relative Difference</div>
            <div className="font-mono text-sm font-bold text-gray-800">
              {result.relativeDifferencePercent.toFixed(1)}%
            </div>
          </div>
          {/* Habets Asymmetry Index */}
          <div className="rounded bg-gray-50 p-2">
            <div className="font-medium text-gray-600">Habets Asymmetry Index</div>
            <div className="font-mono text-sm font-bold text-gray-800">
              {result.asymmetryIndexPercent.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Larger measured side */}
        <div className="mt-2 text-xs text-gray-600">
          <span className="font-medium">Larger measured side:</span>{" "}
          {largerSideLabel(result.largerSide)}
        </div>
      </div>

      {/* 6% reference annotation — ramus only (not body length) */}
      {!isBody && REFERENCE_ANNOTATION}

      {/* Threshold disclaimer — ramus only (not body length) */}
      {!isBody && THRESHOLD_DISCLAIMER}

      {/* Body length reliability warning */}
      {isBody && (
        <div className="mt-2 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
          ⚠ Horizontal measurements on panoramic radiographs are less reliable
          than vertical measurements due to variable horizontal magnification.
          Interpret with caution.
        </div>
      )}
    </div>
  );
}

// ── Uncalibrated Section (relative % as primary) ─────────────
// When uncalibrated, show relative % as primary since mm is unavailable.
// A "Calibration required" banner with a Calibrate button is shown
// by the parent ResultsPanel — this section shows the available % data.
function UncalibratedSection({
  title,
  result,
  measurementId,
  isBody,
}: {
  title: string;
  result: MeasurementResult;
  measurementId: string;
  isBody?: boolean;
}) {
  const setHoveredLine = useStudyStore((s) => s.setHoveredLine);

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800">{title}</h4>
        <span className="text-xs text-gray-400 italic">Not classified</span>
      </div>

      {/* Uncalibrated: show "—" for mm, show % values */}
      <div className="mb-2 grid grid-cols-3 gap-3">
        <div
          className="rounded border border-blue-200 bg-blue-50 p-2 text-center"
          onMouseEnter={() => setHoveredLine(`${measurementId}R`)}
          onMouseLeave={() => setHoveredLine(null)}
        >
          <div className="text-xs font-medium text-blue-600">Right</div>
          <div className="font-mono text-lg font-bold text-gray-400">
            —
          </div>
          <div className="text-xs text-gray-500">mm (uncalibrated)</div>
        </div>
        <div
          className="rounded border border-green-200 bg-green-50 p-2 text-center"
          onMouseEnter={() => setHoveredLine(`${measurementId}L`)}
          onMouseLeave={() => setHoveredLine(null)}
        >
          <div className="text-xs font-medium text-green-600">Left</div>
          <div className="font-mono text-lg font-bold text-gray-400">
            —
          </div>
          <div className="text-xs text-gray-500">mm (uncalibrated)</div>
        </div>
        <div className="rounded border border-gray-300 bg-gray-50 p-2 text-center">
          <div className="text-xs font-medium text-gray-500">Abs. Diff.</div>
          <div className="font-mono text-lg font-bold text-gray-400">
            —
          </div>
          <div className="text-xs text-gray-500">mm (uncalibrated)</div>
        </div>
      </div>

      {/* Relative % and Habets Index (clearly separated) */}
      <div className="border-t border-gray-100 pt-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Relative Difference */}
          <div className="rounded bg-gray-50 p-2">
            <div className="font-medium text-gray-600">Relative Difference</div>
            <div className="font-mono text-sm font-bold text-gray-800">
              {result.relativeDifferencePercent.toFixed(1)}%
            </div>
          </div>
          {/* Habets Asymmetry Index */}
          <div className="rounded bg-gray-50 p-2">
            <div className="font-medium text-gray-600">Habets Asymmetry Index</div>
            <div className="font-mono text-sm font-bold text-gray-800">
              {result.asymmetryIndexPercent.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Larger measured side */}
        <div className="mt-2 text-xs text-gray-600">
          <span className="font-medium">Larger measured side:</span>{" "}
          {largerSideLabel(result.largerSide)}
        </div>
      </div>

      {/* 6% reference annotation — ramus only (not body length) */}
      {!isBody && REFERENCE_ANNOTATION}

      {/* Threshold disclaimer — ramus only (not body length) */}
      {!isBody && THRESHOLD_DISCLAIMER}

      {/* Body length reliability warning */}
      {isBody && (
        <div className="mt-2 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
          ⚠ Horizontal measurements on panoramic radiographs are less reliable
          than vertical measurements due to variable horizontal magnification.
          Interpret with caution.
        </div>
      )}
    </div>
  );
}

// ── Landmark Validation Warnings (Item 10) ───────────────────
// Non-destructive advisory warnings about potential landmark placement issues.
// These warnings NEVER move or replace user landmarks — they are advisory text only.

function pointsEqual(a: Point, b: Point, tolerance = 0.0001): boolean {
  return Math.abs(a.x - b.x) < tolerance && Math.abs(a.y - b.y) < tolerance;
}

function generateLandmarkWarnings(landmarks: LandmarkSet): string[] {
  const warnings: string[] = [];
  const { CoR, GoR, CoL, GoL, Me } = landmarks;

  // a) Co located below its corresponding Go (in image coords, higher y = lower)
  if (CoR && GoR && CoR.y > GoR.y) {
    warnings.push(
      "CoR appears to be located below GoR. Condylion (Co) is typically superior to Gonion (Go). Verify landmark placement."
    );
  }
  if (CoL && GoL && CoL.y > GoL.y) {
    warnings.push(
      "CoL appears to be located below GoL. Condylion (Co) is typically superior to Gonion (Go). Verify landmark placement."
    );
  }

  // b) Menton outside expected horizontal span of mandibular landmarks
  if (Me && GoR && GoL) {
    const minX = Math.min(GoR.x, GoL.x);
    const maxX = Math.max(GoR.x, GoL.x);
    // Add some tolerance (10% of span on each side)
    const span = maxX - minX;
    const tolerance = Math.max(span * 0.1, 0.05);
    if (Me.x < minX - tolerance || Me.x > maxX + tolerance) {
      warnings.push(
        "Menton appears to be outside the expected horizontal span of the gonial landmarks. Verify placement."
      );
    }
  }

  // c) Coincident landmarks (same point for two different landmarks)
  const allPlaced: { name: string; point: Point }[] = [];
  if (CoR) allPlaced.push({ name: "CoR", point: CoR });
  if (GoR) allPlaced.push({ name: "GoR", point: GoR });
  if (CoL) allPlaced.push({ name: "CoL", point: CoL });
  if (GoL) allPlaced.push({ name: "GoL", point: GoL });
  if (Me) allPlaced.push({ name: "Me", point: Me });

  for (let i = 0; i < allPlaced.length; i++) {
    for (let j = i + 1; j < allPlaced.length; j++) {
      if (pointsEqual(allPlaced[i].point, allPlaced[j].point)) {
        warnings.push(
          `${allPlaced[i].name} and ${allPlaced[j].name} appear to be at the same location. These should be distinct anatomical points.`
        );
      }
    }
  }

  // d) Zero-length measurement (distance = 0 between landmarks that should be different)
  if (CoR && GoR && pointsEqual(CoR, GoR)) {
    warnings.push("Ramus height (CoR–GoR) has zero length. Check that CoR and GoR are at different positions.");
  }
  if (CoL && GoL && pointsEqual(CoL, GoL)) {
    warnings.push("Ramus height (CoL–GoL) has zero length. Check that CoL and GoL are at different positions.");
  }
  if (GoR && Me && pointsEqual(GoR, Me)) {
    warnings.push("Body length (GoR–Me) has zero length. Check that GoR and Me are at different positions.");
  }
  if (GoL && Me && pointsEqual(GoL, Me)) {
    warnings.push("Body length (GoL–Me) has zero length. Check that GoL and Me are at different positions.");
  }

  // f) Right and left labels potentially reversed
  // In radiological convention, the right side is on the left of the image (lower x).
  // CoR.x should be < CoL.x. If CoR.x > CoL.x, labels may be reversed.
  if (CoR && CoL && CoR.x > CoL.x) {
    warnings.push(
      "CoR is to the right of CoL on the image. In standard radiological convention, right-side landmarks appear on the left of the image. Labels may be reversed — verify orientation."
    );
  }

  // g) Points outside image bounds (shouldn't happen with clamping, but check)
  const allPoints: { name: string; point: Point }[] = allPlaced;
  for (const { name, point } of allPoints) {
    if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) {
      warnings.push(`${name} is outside the image bounds (coordinates should be 0–1).`);
    }
  }

  return warnings;
}

function LandmarkWarnings() {
  const landmarks = useStudyStore((s) => s.landmarks);
  const warnings = generateLandmarkWarnings(landmarks);

  if (warnings.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
      <h4 className="mb-2 text-sm font-semibold text-amber-800">
        ⚠ Landmark Placement Warnings
      </h4>
      <ul className="space-y-1 text-xs text-amber-700">
        {warnings.map((w, idx) => (
          <li key={idx} className="flex items-start gap-1">
            <span className="text-amber-500 mt-0.5">•</span>
            <span>{w}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-amber-600 italic">
        These are advisory warnings only. Landmarks are not modified automatically.
      </p>
    </div>
  );
}

// ── Main Results Panel ──────────────────────────────────────
export function ResultsPanel() {
  const measurements = useStudyStore((s) => s.measurements);
  const interpretation = useStudyStore((s) => s.interpretation);
  const calibration = useStudyStore((s) => s.calibration);
  const mandibularResult = useStudyStore((s) => s.mandibularResult);
  const startCalibration = useStudyStore((s) => s.startCalibration);
  const landmarks = useStudyStore((s) => s.landmarks);

  if (
    !measurements ||
    (!measurements.ramusHeight && !measurements.bodyLength)
  ) {
    return (
      <div className="p-4 text-sm text-gray-400">
        Place all landmarks to see results.
      </div>
    );
  }

  const isCalibrated = calibration !== null;
  const hasAnyLandmarks = Object.keys(landmarks).length > 0;

  return (
    <div className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">Results</h3>

      {/* Calibration status banner */}
      <div className="mb-3">
        {isCalibrated ? (
          <div className="rounded border border-green-200 bg-green-50 p-2 text-xs text-green-700">
            ✓ Calibrated: {calibration!.mmPerPixel.toFixed(4)} mm/pixel
            <span className="text-green-600">
              {" "}(user-marked reference distance) — Calibrated estimate in millimeters.
            </span>
          </div>
        ) : (
          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <p className="font-medium mb-1">
              Calibration required to display millimeters
            </p>
            <p className="mb-2">
              Showing relative percentages only. Calibrate the image to enable
              approximate millimeter measurements.
            </p>
            <button
              onClick={() => startCalibration()}
              className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              Calibrate image
            </button>
          </div>
        )}
      </div>

      {/* Habets protocol disclaimer banner (Item 11 / PIBot §2.4) */}
      <div className="mb-3 rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-700">
        <strong>Habets Protocol Notice:</strong> This MVP performs a simplified
        landmark-based mandibular asymmetry analysis and uses the Habets
        normalization formula. It does not reproduce the complete original
        Habets tracing protocol.
      </div>

      {/* Persistent limitation notice (Item 7b) */}
      <div className="mb-3 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
        <strong>Approximate values:</strong> Millimeter values are approximate.
        Panoramic radiographs may contain non-uniform magnification and
        projection distortion. Calibration improves scaling but does not
        eliminate these limitations.
      </div>

      {/* Landmark validation warnings (Item 10) */}
      {hasAnyLandmarks && <LandmarkWarnings />}

      {/* ── Ramus length proxy ── */}
      {measurements.ramusHeight &&
        isCalibrated &&
        mandibularResult && (
          <CalibratedMmSection
            title="Ramus length proxy"
            bilateral={mandibularResult.ramus}
            result={measurements.ramusHeight}
            comparisonSentence={generateRamusComparison(
              mandibularResult.ramus.rightMm,
              mandibularResult.ramus.leftMm,
            )}
            measurementId="ramus"
          />
        )}

      {measurements.ramusHeight && !isCalibrated && (
        <UncalibratedSection
          title="Ramus length proxy"
          result={measurements.ramusHeight}
          measurementId="ramus"
        />
      )}

      {/* ── Mandibular body length proxy ── */}
      {measurements.bodyLength &&
        isCalibrated &&
        mandibularResult && (
          <CalibratedMmSection
            title="Mandibular body length proxy"
            bilateral={mandibularResult.body}
            result={measurements.bodyLength}
            comparisonSentence={generateBodyComparison(
              mandibularResult.body.rightMm,
              mandibularResult.body.leftMm,
            )}
            measurementId="body"
            isBody
          />
        )}

      {measurements.bodyLength && !isCalibrated && (
        <UncalibratedSection
          title="Mandibular body length proxy"
          result={measurements.bodyLength}
          measurementId="body"
          isBody
        />
      )}

      {/* ── Clinical Conclusion (calibrated only) ── */}
      {isCalibrated && mandibularResult && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <h4 className="mb-2 text-sm font-semibold text-gray-700">
            Conclusion
          </h4>
          <p className="text-sm text-gray-800 leading-relaxed">
            {mandibularResult.conclusion}
          </p>
        </div>
      )}

      {/* Medical disclaimer (Item 12) */}
      <div className="mt-2 mb-4 rounded border border-gray-300 bg-gray-50 p-3 text-xs text-gray-600">
        <span className="font-medium">⚠ Medical Disclaimer:</span>{" "}
        This application provides comparative measurements and does not produce a
        diagnosis. Results are derived from a two-dimensional panoramic projection
        of three-dimensional anatomy and may be affected by magnification,
        distortion, and patient positioning. Interpret results together with
        clinical examination and additional imaging when indicated.
      </div>

      {/* Threshold caveat (updated per PIBot threshold validation) */}
      <div className="mt-2 mb-4 text-xs text-gray-500 italic">
        No validated classification thresholds exist for these measurements.
        The 3% and 6% thresholds commonly cited were derived from the original
        Habets tracing method using vertical height measurements with segmental
        decomposition. This tool uses a simplified Co-Go Euclidean distance.
        Numerical values are for comparative screening only.
      </div>

      {/* Clinical Interpretation */}
      {interpretation && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">
            Clinical Interpretation
          </h3>
          <div className="rounded border border-gray-200 bg-gray-50 p-3">
            <pre className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700">
              {interpretation}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}