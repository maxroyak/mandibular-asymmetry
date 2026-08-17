// ── Results Panel ────────────────────────────────────────────
// Displays quantitative mandibular asymmetry results with dark clinical tokens.
// Features:
//   - Habets Asymmetry Index card with 6% baseline bar & dominant verdict chip
//   - 3-column comparative cards for Ramus and Body measurements
//   - Bi-directional hover highlighting to viewer canvas
//   - Clinical conclusion card
//   - Consolidated collapsible "Clinical Methodology & 2D Notice" disclosure

import { useState } from "react";
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

// ── Calibrated mm Section ───────────────────────────────────
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
    <div className="mb-3.5 rounded-xl border border-slate-800 bg-slate-800/50 p-3.5">
      {/* Header */}
      <div className="mb-2.5 flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">{title}</h4>
        <span className="text-[11px] text-slate-400 font-mono">
          {isBody ? "Go → Me" : "Co → Go"}
        </span>
      </div>

      {/* PRIMARY: 3-column mm values */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        {/* Right */}
        <div
          className="rounded-lg border border-blue-900/60 bg-blue-950/40 p-2 text-center cursor-pointer transition-all hover:border-blue-700/80 hover:bg-blue-950/60 select-none"
          onMouseEnter={() => setHoveredLine(`${measurementId}R`)}
          onMouseLeave={() => setHoveredLine(null)}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400">{t.common.right}</div>
          <div className="font-mono text-lg font-bold text-blue-100 mt-0.5">
            {bilateral.rightMm.toFixed(1)}
          </div>
          <div className="text-[10px] text-blue-300/70">{t.common.mm}</div>
        </div>

        {/* Left */}
        <div
          className="rounded-lg border border-emerald-900/60 bg-emerald-950/40 p-2 text-center cursor-pointer transition-all hover:border-emerald-700/80 hover:bg-emerald-950/60 select-none"
          onMouseEnter={() => setHoveredLine(`${measurementId}L`)}
          onMouseLeave={() => setHoveredLine(null)}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">{t.common.left}</div>
          <div className="font-mono text-lg font-bold text-emerald-100 mt-0.5">
            {bilateral.leftMm.toFixed(1)}
          </div>
          <div className="text-[10px] text-emerald-300/70">{t.common.mm}</div>
        </div>

        {/* Abs Diff */}
        <div className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-2 text-center select-none">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t.common.absDiff}</div>
          <div className="font-mono text-lg font-bold text-slate-100 mt-0.5">
            {bilateral.absoluteDifferenceMm.toFixed(1)}
          </div>
          <div className="text-[10px] text-slate-400">{t.common.mm}</div>
        </div>
      </div>

      {/* Comparison sentence */}
      <p className="mb-2.5 text-xs text-slate-300 leading-relaxed font-medium">{comparisonSentence}</p>

      {/* SECONDARY: relative %, Habets index */}
      <div className="border-t border-slate-700/60 pt-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-slate-900/60 border border-slate-800/80 p-2">
            <div className="text-[10px] text-slate-400 font-medium">{t.common.relativeDifference}</div>
            <div className="font-mono text-xs font-bold text-slate-200 mt-0.5">
              {result.relativeDifferencePercent.toFixed(1)}%
            </div>
          </div>
          <div className="rounded-lg bg-slate-900/60 border border-slate-800/80 p-2">
            <div className="text-[10px] text-slate-400 font-medium">{t.common.habetsIndex}</div>
            <div className="font-mono text-xs font-bold text-slate-200 mt-0.5">
              {result.asymmetryIndexPercent.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Larger measured side */}
        <div className="mt-2 text-[11px] text-slate-400">
          <span className="font-medium">{t.common.largerSide}</span>{" "}
          <span className="font-semibold text-slate-200">{largerSideLabel(result.largerSide, t)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Uncalibrated Section ────────────────────────────────────
function UncalibratedSection({
  title,
  result,
  measurementId,
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
    <div className="mb-3.5 rounded-xl border border-slate-800 bg-slate-800/50 p-3.5">
      {/* Header */}
      <div className="mb-2.5 flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">{title}</h4>
        <span className="text-[11px] text-amber-400 font-medium">{t.common.uncalibratedUnit}</span>
      </div>

      {/* Uncalibrated placeholder */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        <div
          className="rounded-lg border border-blue-900/40 bg-blue-950/20 p-2 text-center cursor-pointer select-none"
          onMouseEnter={() => setHoveredLine(`${measurementId}R`)}
          onMouseLeave={() => setHoveredLine(null)}
        >
          <div className="text-[10px] font-bold text-blue-400">{t.common.right}</div>
          <div className="font-mono text-lg font-bold text-slate-600">—</div>
          <div className="text-[10px] text-slate-500">{t.common.mm}</div>
        </div>
        <div
          className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-2 text-center cursor-pointer select-none"
          onMouseEnter={() => setHoveredLine(`${measurementId}L`)}
          onMouseLeave={() => setHoveredLine(null)}
        >
          <div className="text-[10px] font-bold text-emerald-400">{t.common.left}</div>
          <div className="font-mono text-lg font-bold text-slate-600">—</div>
          <div className="text-[10px] text-slate-500">{t.common.mm}</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-2 text-center select-none">
          <div className="text-[10px] font-bold text-slate-400">{t.common.absDiff}</div>
          <div className="font-mono text-lg font-bold text-slate-600">—</div>
          <div className="text-[10px] text-slate-500">{t.common.mm}</div>
        </div>
      </div>

      {/* Relative % and Habets Index */}
      <div className="border-t border-slate-700/60 pt-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-slate-900/60 border border-slate-800/80 p-2">
            <div className="text-[10px] text-slate-400 font-medium">{t.common.relativeDifference}</div>
            <div className="font-mono text-xs font-bold text-slate-200 mt-0.5">
              {result.relativeDifferencePercent.toFixed(1)}%
            </div>
          </div>
          <div className="rounded-lg bg-slate-900/60 border border-slate-800/80 p-2">
            <div className="text-[10px] text-slate-400 font-medium">{t.common.habetsIndex}</div>
            <div className="font-mono text-xs font-bold text-slate-200 mt-0.5">
              {result.asymmetryIndexPercent.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Larger measured side */}
        <div className="mt-2 text-[11px] text-slate-400">
          <span className="font-medium">{t.common.largerSide}</span>{" "}
          <span className="font-semibold text-slate-200">{largerSideLabel(result.largerSide, t)}</span>
        </div>
      </div>
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

  if (CoR && GoR && CoR.y > GoR.y) {
    warnings.push(t.warnings.coBelowGoR);
  }
  if (CoL && GoL && CoL.y > GoL.y) {
    warnings.push(t.warnings.coBelowGoL);
  }

  if (Me && GoR && GoL) {
    const minX = Math.min(GoR.x, GoL.x);
    const maxX = Math.max(GoR.x, GoL.x);
    const span = maxX - minX;
    const tolerance = Math.max(span * 0.1, 0.05);
    if (Me.x < minX - tolerance || Me.x > maxX + tolerance) {
      warnings.push(t.warnings.mentonOutside);
    }
  }

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

  if (CoR && CoL && CoR.x > CoL.x) {
    warnings.push(t.warnings.lrReversed);
  }

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
    <div className="mb-3.5 rounded-xl border border-amber-500/50 bg-amber-950/30 p-3">
      <h4 className="mb-1.5 text-xs font-bold text-amber-300">
        {t.warnings.title}
      </h4>
      <ul className="space-y-1 text-xs text-amber-200/90 leading-relaxed">
        {warnings.map((w, idx) => (
          <li key={idx} className="flex items-start gap-1.5">
            <span className="text-amber-400 shrink-0">•</span>
            <span>{w}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] text-amber-400/80 italic">
        {t.warnings.disclaimer}
      </p>
    </div>
  );
}

// ── Main Results Panel Component ─────────────────────────────
interface ResultsPanelProps {
  onOpenReport?: () => void;
  onJumpToCalibration?: () => void;
}

export function ResultsPanel({ onJumpToCalibration }: ResultsPanelProps = {}) {
  const language = useStudyStore((s) => s.language);
  const measurements = useStudyStore((s) => s.measurements);
  const interpretation = useStudyStore((s) => s.interpretation);
  const calibration = useStudyStore((s) => s.calibration);
  const mandibularResult = useStudyStore((s) => s.mandibularResult);
  const landmarks = useStudyStore((s) => s.landmarks);

  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);

  const t = getTranslations(language);

  if (
    !measurements ||
    (!measurements.ramusHeight && !measurements.bodyLength)
  ) {
    return (
      <div className="p-4 text-xs text-slate-500">
        {t.results.placeAllToSee}
      </div>
    );
  }

  const isCalibrated = calibration !== null;
  const hasAnyLandmarks = Object.keys(landmarks).length > 0;

  // Habets Index & Dominant Asymmetry Calculation
  const habetsIndex = measurements.ramusHeight?.asymmetryIndexPercent ?? 0;
  const ramusAbsDiffMm = mandibularResult?.ramus.absoluteDifferenceMm ?? 0;
  const longerSide = mandibularResult?.ramus.longerSide;

  return (
    <div className="p-4 select-none">
      {/* ── High-Impact Quantitative Habets Overview Card ── */}
      <div className="mb-4 rounded-xl border border-cyan-900/60 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-800/80 p-4 shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
              {t.common.habetsIndex}
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-extrabold text-slate-50 tracking-tight">
                {habetsIndex.toFixed(1)}%
              </span>
              {habetsIndex > 6.0 && (
                <span className="rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 text-[10px] font-bold">
                  &gt; 6%
                </span>
              )}
            </div>
          </div>

          {/* Dominant Asymmetry Chip */}
          {isCalibrated && longerSide && (
            <div className="text-right">
              <span
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold shadow-xs ${
                  longerSide === "right"
                    ? "bg-blue-600/30 text-blue-200 border border-blue-500/50"
                    : longerSide === "left"
                    ? "bg-emerald-600/30 text-emerald-200 border border-emerald-500/50"
                    : "bg-slate-800 text-slate-300 border border-slate-700"
                }`}
              >
                <span>{longerSide === "right" ? "🔵" : longerSide === "left" ? "🟢" : "⚪"}</span>
                <span>
                  {longerSide === "right"
                    ? t.results.dominantRightRamus(ramusAbsDiffMm.toFixed(1))
                    : longerSide === "left"
                    ? t.results.dominantLeftRamus(ramusAbsDiffMm.toFixed(1))
                    : t.results.dominantSymmetrical}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* 6% Habets Baseline Reference Bar */}
        <div className="mt-3.5">
          <div className="flex justify-between text-[10px] font-medium text-slate-400 mb-1">
            <span>{t.results.habetsBaseline6Title}</span>
            <span className="font-mono">6.0% Baseline</span>
          </div>

          <div className="relative h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            {/* 6% marker line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10"
              style={{ left: "40%" }} // 6% of a 15% range is 40%
              title="6% Habets baseline"
            />
            {/* Progress fill */}
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                habetsIndex > 6.0
                  ? "bg-gradient-to-r from-cyan-500 to-amber-400 shadow-sm"
                  : "bg-gradient-to-r from-cyan-600 to-cyan-400"
              }`}
              style={{
                width: `${Math.min(100, (habetsIndex / 15) * 100)}%`,
              }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[9px] text-slate-500 font-mono">
            <span>0%</span>
            <span>6% Baseline</span>
            <span>15%+</span>
          </div>
        </div>

        {/* Uncalibrated Notice / Link to Step 1 */}
        {!isCalibrated && (
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-amber-300">
            <span className="flex items-center gap-1 text-[11px]">
              <span>⚠</span>
              <span>{t.calibration.calReqTitle}</span>
            </span>
            {onJumpToCalibration && (
              <button
                onClick={onJumpToCalibration}
                type="button"
                className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 underline"
              >
                {t.results.jumpToCalibration}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Landmark validation warnings */}
      {hasAnyLandmarks && <LandmarkWarnings t={t} />}

      {/* ── Ramus length proxy ── */}
      {measurements.ramusHeight && isCalibrated && mandibularResult && (
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
      {measurements.bodyLength && isCalibrated && mandibularResult && (
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
        <div className="mb-4 rounded-xl border border-cyan-800/40 bg-slate-800/60 p-3.5">
          <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-cyan-400">
            {t.results.conclusion}
          </h4>
          <p className="text-xs text-slate-200 leading-relaxed font-medium">
            {mandibularResult.conclusion}
          </p>
        </div>
      )}

      {/* ── Consolidated "Clinical Methodology & 2D Notice" Accordion ── */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <button
          onClick={() => setIsMethodologyOpen(!isMethodologyOpen)}
          type="button"
          className="w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs font-semibold text-slate-300 hover:bg-slate-800/60 transition-colors"
          aria-expanded={isMethodologyOpen}
        >
          <div className="flex items-center gap-2">
            <span>🛡</span>
            <span>{t.results.methodologyTitle}</span>
          </div>
          <span className="text-slate-500 font-mono text-xs">
            {isMethodologyOpen ? "▲" : "▼"}
          </span>
        </button>

        {isMethodologyOpen && (
          <div className="border-t border-slate-800 p-3.5 space-y-3 text-[11px] text-slate-400 leading-relaxed">
            {/* Habets Notice */}
            <div>
              <span className="font-semibold text-slate-300">{t.results.habetsNoticeTitle}</span>{" "}
              <span>{t.results.habetsNoticeText}</span>
            </div>

            {/* Approximate Values */}
            <div>
              <span className="font-semibold text-slate-300">{t.results.approximateValuesTitle}</span>{" "}
              <span>{t.results.approximateValuesText}</span>
            </div>

            {/* 6% Reference Note */}
            <div>
              <span className="font-semibold text-slate-300">{t.results.reference6Title}</span> —{" "}
              <span>{t.results.reference6Text}</span>
            </div>

            {/* Threshold Caveat */}
            <div>
              <span className="font-semibold text-slate-300">{t.results.thresholdDisclaimerTitle}</span>{" "}
              <span>{t.results.thresholdDisclaimerText}</span>
            </div>

            {/* Body Reliability Warning */}
            <div className="text-amber-400/90 font-medium">
              {t.results.bodyReliabilityWarning}
            </div>

            {/* Medical Disclaimer */}
            <div className="border-t border-slate-800/80 pt-2.5 text-slate-400">
              <span className="font-bold text-slate-300">{t.results.medicalDisclaimerTitle}</span>{" "}
              <span>{t.results.medicalDisclaimerText}</span>
            </div>
          </div>
        )}
      </div>

      {/* Clinical Interpretation text if present */}
      {interpretation && (
        <div className="mt-4">
          <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
            {t.results.clinicalInterpretation}
          </h4>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-300">
              {interpretation}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}