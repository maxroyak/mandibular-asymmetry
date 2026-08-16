// ── Results Panel ────────────────────────────────────────────
// Displays measurement results with mm as PRIMARY when calibrated.
// Hierarchy:
//   PRIMARY: Right mm, Left mm, Difference mm, comparison sentence
//   SECONDARY: Relative difference %, Habets index %, classification
// When uncalibrated: shows relative % as primary with calibration prompt.

import { useStudyStore } from "../store/studyStore";
import {
  TIER_LABELS,
  TIER_GUIDANCE,
  generateRamusComparison,
  generateBodyComparison,
} from "../domain/mandibularAsymmetry";
import type {
  MeasurementResult,
  AsymmetryTier,
  BilateralMeasurement,
} from "../domain/types";

// ── Threshold Badge ──────────────────────────────────────────
function tierColor(tier: AsymmetryTier): string {
  switch (tier) {
    case "within_typical_range":
      return "bg-green-100 text-green-800 border-green-300";
    case "borderline":
      return "bg-amber-100 text-amber-800 border-amber-300";
    case "above_technical_error_margin":
      return "bg-red-100 text-red-800 border-red-300";
  }
}

function ThresholdBadge({ tier }: { tier: AsymmetryTier }) {
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${tierColor(tier)}`}
    >
      {TIER_LABELS[tier]}
    </span>
  );
}

// ── Calibrated mm Section (PRIMARY) ──────────────────────────
// mm values front and center: Right mm, Left mm, Difference mm,
// then comparison sentence, then secondary metrics (%, classification).
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
        <ThresholdBadge tier={result.classification} />
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
          <div className="text-xs font-medium text-gray-500">Difference</div>
          <div className="font-mono text-lg font-bold text-gray-800">
            {bilateral.absoluteDifferenceMm.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500">mm</div>
        </div>
      </div>

      {/* Comparison sentence */}
      <p className="mb-2 text-sm text-gray-700">{comparisonSentence}</p>

      {/* SECONDARY: relative %, Habets index, classification */}
      <div className="border-t border-gray-100 pt-2">
        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          <span>
            <span className="font-medium">Rel. Diff:</span>{" "}
            {result.relativeDifferencePercent.toFixed(1)}%
          </span>
          <span>
            <span className="font-medium">Habets Index:</span>{" "}
            {result.asymmetryIndexPercent > 0 ? "+" : ""}
            {result.asymmetryIndexPercent.toFixed(1)}%
          </span>
          <span>
            <span className="font-medium">Greater side:</span>{" "}
            {result.dominantSide === "right"
              ? "Right"
              : result.dominantSide === "left"
                ? "Left"
                : "Approximately equal"}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-600 italic">
          {TIER_GUIDANCE[result.classification]}
        </p>
      </div>

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
        <ThresholdBadge tier={result.classification} />
      </div>

      {/* PRIMARY (uncalibrated): relative difference % is the key metric */}
      <div className="mb-2 grid grid-cols-3 gap-3">
        <div
          className="rounded border border-blue-200 bg-blue-50 p-2 text-center"
          onMouseEnter={() => setHoveredLine(`${measurementId}R`)}
          onMouseLeave={() => setHoveredLine(null)}
        >
          <div className="text-xs font-medium text-blue-600">Right</div>
          <div className="font-mono text-sm font-bold text-gray-800">
            {result.right.toFixed(4)}
          </div>
          <div className="text-xs text-gray-500">normalized</div>
        </div>
        <div
          className="rounded border border-green-200 bg-green-50 p-2 text-center"
          onMouseEnter={() => setHoveredLine(`${measurementId}L`)}
          onMouseLeave={() => setHoveredLine(null)}
        >
          <div className="text-xs font-medium text-green-600">Left</div>
          <div className="font-mono text-sm font-bold text-gray-800">
            {result.left.toFixed(4)}
          </div>
          <div className="text-xs text-gray-500">normalized</div>
        </div>
        <div className="rounded border border-gray-300 bg-gray-50 p-2 text-center">
          <div className="text-xs font-medium text-gray-500">Rel. Diff.</div>
          <div className="font-mono text-sm font-bold text-gray-800">
            {result.relativeDifferencePercent.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">side-to-side</div>
        </div>
      </div>

      {/* Secondary: Habets, dominant side, guidance */}
      <div className="border-t border-gray-100 pt-2">
        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          <span>
            <span className="font-medium">Habets Index:</span>{" "}
            {result.asymmetryIndexPercent > 0 ? "+" : ""}
            {result.asymmetryIndexPercent.toFixed(1)}%
          </span>
          <span>
            <span className="font-medium">Greater side:</span>{" "}
            {result.dominantSide === "right"
              ? "Right"
              : result.dominantSide === "left"
                ? "Left"
                : "Approximately equal"}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-600 italic">
          {TIER_GUIDANCE[result.classification]}
        </p>
      </div>

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

// ── Main Results Panel ──────────────────────────────────────
export function ResultsPanel() {
  const measurements = useStudyStore((s) => s.measurements);
  const interpretation = useStudyStore((s) => s.interpretation);
  const calibration = useStudyStore((s) => s.calibration);
  const mandibularResult = useStudyStore((s) => s.mandibularResult);
  const startCalibration = useStudyStore((s) => s.startCalibration);

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

  return (
    <div className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">Results</h3>

      {/* Calibration status banner */}
      <div className="mb-3">
        {isCalibrated ? (
          <div className="rounded border border-green-200 bg-green-50 p-2 text-xs text-green-700">
            ✓ Calibrated: {calibration!.mmPerPixel.toFixed(4)} mm/pixel
            <span className="text-green-600">
              {" "}(user-marked reference distance) — Measurements in mm.
            </span>
          </div>
        ) : (
          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <p className="font-medium mb-1">
              Calibration required to display millimeters
            </p>
            <p className="mb-2">
              Showing relative percentages only. Calibrate the image to enable
              millimeter measurements.
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

      {/* ── Ramus Height ── */}
      {measurements.ramusHeight &&
        isCalibrated &&
        mandibularResult && (
          <CalibratedMmSection
            title="Ramus Height (Co–Go)"
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
          title="Ramus Height (Co–Go)"
          result={measurements.ramusHeight}
          measurementId="ramus"
        />
      )}

      {/* ── Body Length ── */}
      {measurements.bodyLength &&
        isCalibrated &&
        mandibularResult && (
          <CalibratedMmSection
            title="Mandibular Body Length (Go–Me)"
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
          title="Mandibular Body Length (Go–Me)"
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

      {/* Relationship footnote */}
      <div className="mt-2 mb-4 rounded bg-gray-50 p-2 text-xs text-gray-500">
        The Relative Difference is exactly twice the absolute value of the
        Habets Asymmetry Index. For example, a Habets index of 3% corresponds
        to a Relative Difference of 6%.
      </div>

      {/* 2D Projection Warning */}
      <div className="mt-2 mb-4 rounded border border-gray-300 bg-gray-50 p-2 text-xs text-gray-600">
        <span className="font-medium">⚠ 2D Projection Limitation:</span>{" "}
        Measurements are derived from a 2D projection of 3D anatomy. Panoramic
        radiographs have inherent magnification and distortion that may affect
        measurement accuracy. Results must be interpreted in the context of
        clinical examination and adjunct imaging.
      </div>

      {/* Threshold caveat */}
      <div className="mt-2 mb-4 text-xs text-gray-500 italic">
        Threshold values are based on published literature and the known
        technical error margin of panoramic radiography (Habets et al. 1987),
        not on validated clinical outcomes. They are guidelines for
        interpretation, not diagnostic criteria.
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