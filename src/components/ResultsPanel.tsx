// ── Results Panel ────────────────────────────────────────────
// Displays measurement results with mm as PRIMARY when calibrated.
// Hierarchy:
//   PRIMARY: Right mm, Left mm, Difference mm, comparison sentence
//   SECONDARY: Relative difference %, Habets index %
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
import { getTranslations, type Translations } from "../locales";

// ── Larger side label helper ────────────────────────────────
function largerSideLabel(side: string, t: Translations): string {
  if (side === "right") return t.common.sideRight;
  if (side === "left") return t.common.sideLeft;
  return t.common.sideEqual;
}

// ── Calibrated mm Section (PRIMARY) ──────────────────────────
function CalibratedMmSection({
  title,
  bilateral,
  result,
  comparisonSentence,
  measurementId,
  isBody,
  t,
}: {
  title: string;
  bilateral: BilateralMeasurement;
  result: MeasurementResult;
  comparisonSentence: string;
  measurementId: string;
  isBody?: boolean;
  t: Translations;
}) {
  const setHoveredLine = useStudyStore((s) => s.setHoveredLine);

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800">{title}</h4>
        <span className="text-xs text-gray-400 italic">{t.common.notClassified}</span>
      </div>

      {/* PRIMARY: mm values */}
      <div className="mb-2 grid grid-cols-3 gap-3">
        <div
          className="rounded border border-blue-200 bg-blue-50 p-2 text-center cursor-pointer transition-colors hover:border-blue-300"
          onMouseEnter={() => setHoveredLine(`${measurementId}R`)}
          onMouseLeave={() => setHoveredLine(null)}
        >
          <div className="text-xs font-medium text-blue-600">{t.common.right}</div>
          <div className="font-mono text-lg font-bold text-gray-800">
            {bilateral.rightMm.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500">{t.common.mm}</div>
        </div>
        <div
          className="rounded border border-green-200 bg-green-50 p-2 text-center cursor-pointer transition-colors hover:border-green-300"
          onMouseEnter={() => setHoveredLine(`${measurementId}L`)}
          onMouseLeave={() => setHoveredLine(null)}
        >
          <div className="text-xs font-medium text-green-600">{t.common.left}</div>
          <div className="font-mono text-lg font-bold text-gray-800">
            {bilateral.leftMm.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500">{t.common.mm}</div>
        </div>
        <div className="rounded border border-gray-300 bg-gray-50 p-2 text-center">
          <div className="text-xs font-medium text-gray-500">{t.common.absDiff}</div>
          <div className="font-mono text-lg font-bold text-gray-800">
            {bilateral.absoluteDifferenceMm.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500">{t.common.mm}</div>
        </div>
      </div>

      {/* Comparison sentence */}
      <p className="mb-2 text-sm text-gray-700 leading-relaxed">{comparisonSentence}</p>

      {/* SECONDARY: relative %, Habets index */}
      <div className="border-t border-gray-100 pt-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Relative Difference */}
          <div className="rounded bg-gray-50 p-2">
            <div className="font-medium text-gray-600">{t.common.relativeDifference}</div>
            <div className="font-mono text-sm font-bold text-gray-800">
              {result.relativeDifferencePercent.toFixed(1)}%
            </div>
          </div>
          {/* Habets Asymmetry Index */}
          <div className="rounded bg-gray-50 p-2">
            <div className="font-medium text-gray-600">{t.common.habetsIndex}</div>
            <div className="font-mono text-sm font-bold text-gray-800">
              {result.asymmetryIndexPercent.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Larger measured side */}
        <div className="mt-2 text-xs text-gray-600">
          <span className="font-medium">{t.common.largerSide}</span>{" "}
          {largerSideLabel(result.largerSide, t)}
        </div>
      </div>

      {/* 6% reference annotation — ramus only */}
      {!isBody && (
        <div className="mt-2 rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-800">
          <strong>{t.results.reference6Title}</strong> — {t.results.reference6Text}
        </div>
      )}

      {/* Threshold disclaimer — ramus only */}
      {!isBody && (
        <div className="mt-2 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
          <strong>{t.results.thresholdDisclaimerTitle}</strong>{" "}
          {t.results.thresholdDisclaimerText}
        </div>
      )}

      {/* Body length reliability warning */}
      {isBody && (
        <div className="mt-2 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
          {t.results.bodyReliabilityWarning}
        </div>
      )}
    </div>
  );
}

// ── Uncalibrated Section (relative % as primary) ─────────────
function UncalibratedSection({
  title,
  result,
  measurementId,
  isBody,
  t,
}: {
  title: string;
  result: MeasurementResult;
  measurementId: string;
  isBody?: boolean;
  t: Translations;
}) {
  const setHoveredLine = useStudyStore((s) => s.setHoveredLine);

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800">{title}</h4>
        <span className="text-xs text-gray-400 italic">{t.common.notClassified}</span>
      </div>

      {/* Uncalibrated: show "—" for mm, show % values */}
      <div className="mb-2 grid grid-cols-3 gap-3">
        <div
          className="rounded border border-blue-200 bg-blue-50 p-2 text-center cursor-pointer"
          onMouseEnter={() => setHoveredLine(`${measurementId}R`)}
          onMouseLeave={() => setHoveredLine(null)}
        >
          <div className="text-xs font-medium text-blue-600">{t.common.right}</div>
          <div className="font-mono text-lg font-bold text-gray-400">—</div>
          <div className="text-xs text-gray-500">{t.common.uncalibratedUnit}</div>
        </div>
        <div
          className="rounded border border-green-200 bg-green-50 p-2 text-center cursor-pointer"
          onMouseEnter={() => setHoveredLine(`${measurementId}L`)}
          onMouseLeave={() => setHoveredLine(null)}
        >
          <div className="text-xs font-medium text-green-600">{t.common.left}</div>
          <div className="font-mono text-lg font-bold text-gray-400">—</div>
          <div className="text-xs text-gray-500">{t.common.uncalibratedUnit}</div>
        </div>
        <div className="rounded border border-gray-300 bg-gray-50 p-2 text-center">
          <div className="text-xs font-medium text-gray-500">{t.common.absDiff}</div>
          <div className="font-mono text-lg font-bold text-gray-400">—</div>
          <div className="text-xs text-gray-500">{t.common.uncalibratedUnit}</div>
        </div>
      </div>

      {/* Relative % and Habets Index */}
      <div className="border-t border-gray-100 pt-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Relative Difference */}
          <div className="rounded bg-gray-50 p-2">
            <div className="font-medium text-gray-600">{t.common.relativeDifference}</div>
            <div className="font-mono text-sm font-bold text-gray-800">
              {result.relativeDifferencePercent.toFixed(1)}%
            </div>
          </div>
          {/* Habets Asymmetry Index */}
          <div className="rounded bg-gray-50 p-2">
            <div className="font-medium text-gray-600">{t.common.habetsIndex}</div>
            <div className="font-mono text-sm font-bold text-gray-800">
              {result.asymmetryIndexPercent.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Larger measured side */}
        <div className="mt-2 text-xs text-gray-600">
          <span className="font-medium">{t.common.largerSide}</span>{" "}
          {largerSideLabel(result.largerSide, t)}
        </div>
      </div>

      {/* 6% reference annotation — ramus only */}
      {!isBody && (
        <div className="mt-2 rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-800">
          <strong>{t.results.reference6Title}</strong> — {t.results.reference6Text}
        </div>
      )}

      {/* Threshold disclaimer — ramus only */}
      {!isBody && (
        <div className="mt-2 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
          <strong>{t.results.thresholdDisclaimerTitle}</strong>{" "}
          {t.results.thresholdDisclaimerText}
        </div>
      )}

      {/* Body length reliability warning */}
      {isBody && (
        <div className="mt-2 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
          {t.results.bodyReliabilityWarning}
        </div>
      )}
    </div>
  );
}

// ── Landmark Validation Warnings ─────────────────────────────
function pointsEqual(a: Point, b: Point, tolerance = 0.0001): boolean {
  return Math.abs(a.x - b.x) < tolerance && Math.abs(a.y - b.y) < tolerance;
}

function generateLandmarkWarnings(landmarks: LandmarkSet, t: Translations): string[] {
  const warnings: string[] = [];
  const { CoR, GoR, CoL, GoL, Me } = landmarks;

  // a) Co located below its corresponding Go (in image coords, higher y = lower)
  if (CoR && GoR && CoR.y > GoR.y) {
    warnings.push(t.warnings.coBelowGoR);
  }
  if (CoL && GoL && CoL.y > GoL.y) {
    warnings.push(t.warnings.coBelowGoL);
  }

  // b) Menton outside expected horizontal span of mandibular landmarks
  if (Me && GoR && GoL) {
    const minX = Math.min(GoR.x, GoL.x);
    const maxX = Math.max(GoR.x, GoL.x);
    const span = maxX - minX;
    const tolerance = Math.max(span * 0.1, 0.05);
    if (Me.x < minX - tolerance || Me.x > maxX + tolerance) {
      warnings.push(t.warnings.mentonOutside);
    }
  }

  // c) Coincident landmarks
  const allPlaced: { name: string; point: Point }[] = [];
  if (CoR) allPlaced.push({ name: "CoR", point: CoR });
  if (GoR) allPlaced.push({ name: "GoR", point: GoR });
  if (CoL) allPlaced.push({ name: "CoL", point: CoL });
  if (GoL) allPlaced.push({ name: "GoL", point: GoL });
  if (Me) allPlaced.push({ name: "Me", point: Me });

  for (let i = 0; i < allPlaced.length; i++) {
    for (let j = i + 1; j < allPlaced.length; j++) {
      if (pointsEqual(allPlaced[i].point, allPlaced[j].point)) {
        warnings.push(t.warnings.sameLocation(allPlaced[i].name, allPlaced[j].name));
      }
    }
  }

  // d) Zero-length measurement
  if (CoR && GoR && pointsEqual(CoR, GoR)) {
    warnings.push(t.warnings.ramusZeroR);
  }
  if (CoL && GoL && pointsEqual(CoL, GoL)) {
    warnings.push(t.warnings.ramusZeroL);
  }
  if (GoR && Me && pointsEqual(GoR, Me)) {
    warnings.push(t.warnings.bodyZeroR);
  }
  if (GoL && Me && pointsEqual(GoL, Me)) {
    warnings.push(t.warnings.bodyZeroL);
  }

  // f) Right and left labels potentially reversed
  if (CoR && CoL && CoR.x > CoL.x) {
    warnings.push(t.warnings.lrReversed);
  }

  // g) Points outside image bounds
  for (const { name, point } of allPlaced) {
    if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) {
      warnings.push(t.warnings.outsideBounds(name));
    }
  }

  return warnings;
}

function LandmarkWarnings({ t }: { t: Translations }) {
  const landmarks = useStudyStore((s) => s.landmarks);
  const warnings = generateLandmarkWarnings(landmarks, t);

  if (warnings.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
      <h4 className="mb-2 text-sm font-semibold text-amber-800">
        {t.warnings.title}
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
        {t.warnings.disclaimer}
      </p>
    </div>
  );
}

// ── Main Results Panel ──────────────────────────────────────
export function ResultsPanel({ onOpenReport }: { onOpenReport?: () => void } = {}) {
  const language = useStudyStore((s) => s.language);
  const measurements = useStudyStore((s) => s.measurements);
  const interpretation = useStudyStore((s) => s.interpretation);
  const calibration = useStudyStore((s) => s.calibration);
  const mandibularResult = useStudyStore((s) => s.mandibularResult);
  const startCalibration = useStudyStore((s) => s.startCalibration);
  const landmarks = useStudyStore((s) => s.landmarks);

  const t = getTranslations(language);

  if (
    !measurements ||
    (!measurements.ramusHeight && !measurements.bodyLength)
  ) {
    return (
      <div className="p-4 text-sm text-gray-400">
        {t.results.placeAllToSee}
      </div>
    );
  }

  const isCalibrated = calibration !== null;
  const hasAnyLandmarks = Object.keys(landmarks).length > 0;

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">{t.results.title}</h3>
        {onOpenReport && (
          <button
            onClick={onOpenReport}
            type="button"
            className="inline-flex items-center gap-1 rounded bg-blue-50 border border-blue-200 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
          >
            <span>📄</span>
            <span>{t.report.exportButton}</span>
          </button>
        )}
      </div>

      {/* Calibration status banner */}
      <div className="mb-3">
        {isCalibrated ? (
          <div className="rounded border border-green-200 bg-green-50 p-2 text-xs text-green-700">
            {calibration?.source === "dicom"
              ? t.calibration.dicomAutoCalibratedBanner(calibration.mmPerPixel.toFixed(4))
              : t.calibration.calibratedBanner(calibration!.mmPerPixel.toFixed(4))}
            <span className="text-green-600 font-normal">
              {" "}
              {calibration?.source === "dicom"
                ? t.calibration.dicomAutoCalibratedDesc
                : t.calibration.calibratedDesc}
            </span>
          </div>
        ) : (
          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <p className="font-medium mb-1">
              {t.calibration.calReqTitle}
            </p>
            <p className="mb-2">
              {t.calibration.calReqDesc}
            </p>
            <button
              onClick={() => startCalibration()}
              className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              {t.calibration.calibrateImage}
            </button>
          </div>
        )}
      </div>

      {/* Habets protocol disclaimer banner */}
      <div className="mb-3 rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-700">
        <strong>{t.results.habetsNoticeTitle}</strong> {t.results.habetsNoticeText}
      </div>

      {/* Persistent limitation notice */}
      <div className="mb-3 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
        <strong>{t.results.approximateValuesTitle}</strong> {t.results.approximateValuesText}
      </div>

      {/* Landmark validation warnings */}
      {hasAnyLandmarks && <LandmarkWarnings t={t} />}

      {/* ── Ramus length proxy ── */}
      {measurements.ramusHeight &&
        isCalibrated &&
        mandibularResult && (
          <CalibratedMmSection
            title={t.results.ramusTitle}
            bilateral={mandibularResult.ramus}
            result={measurements.ramusHeight}
            comparisonSentence={generateRamusComparison(
              mandibularResult.ramus.rightMm,
              mandibularResult.ramus.leftMm,
              language
            )}
            measurementId="ramus"
            t={t}
          />
        )}

      {measurements.ramusHeight && !isCalibrated && (
        <UncalibratedSection
          title={t.results.ramusTitle}
          result={measurements.ramusHeight}
          measurementId="ramus"
          t={t}
        />
      )}

      {/* ── Mandibular body length proxy ── */}
      {measurements.bodyLength &&
        isCalibrated &&
        mandibularResult && (
          <CalibratedMmSection
            title={t.results.bodyTitle}
            bilateral={mandibularResult.body}
            result={measurements.bodyLength}
            comparisonSentence={generateBodyComparison(
              mandibularResult.body.rightMm,
              mandibularResult.body.leftMm,
              language
            )}
            measurementId="body"
            isBody
            t={t}
          />
        )}

      {measurements.bodyLength && !isCalibrated && (
        <UncalibratedSection
          title={t.results.bodyTitle}
          result={measurements.bodyLength}
          measurementId="body"
          isBody
          t={t}
        />
      )}

      {/* ── Clinical Conclusion (calibrated only) ── */}
      {isCalibrated && mandibularResult && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <h4 className="mb-2 text-sm font-semibold text-gray-700">
            {t.results.conclusion}
          </h4>
          <p className="text-sm text-gray-800 leading-relaxed">
            {mandibularResult.conclusion}
          </p>
        </div>
      )}

      {/* Medical disclaimer */}
      <div className="mt-2 mb-4 rounded border border-gray-300 bg-gray-50 p-3 text-xs text-gray-600">
        <span className="font-medium">{t.results.medicalDisclaimerTitle}</span>{" "}
        {t.results.medicalDisclaimerText}
      </div>

      {/* Threshold caveat */}
      <div className="mt-2 mb-4 text-xs text-gray-500 italic">
        {t.results.thresholdDisclaimerTitle} {t.results.thresholdDisclaimerText}
      </div>

      {/* Clinical Interpretation */}
      {interpretation && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">
            {t.results.clinicalInterpretation}
          </h3>
          <div className="rounded border border-gray-200 bg-gray-50 p-3">
            <pre className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700">
              {interpretation}
            </pre>
          </div>
        </div>
      )}

      {/* Export / Print Report Call-to-action */}
      {onOpenReport && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <button
            onClick={onOpenReport}
            type="button"
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            <span>📄</span>
            <span>{t.report.exportButton}</span>
          </button>
        </div>
      )}
    </div>
  );
}