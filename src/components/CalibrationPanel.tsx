// ── Calibration Panel ────────────────────────────────────────
// State-machine-driven calibration UI with dark clinical theme.

import { useState, useMemo } from "react";
import { useStudyStore } from "../store/studyStore";
import { calculateDistance } from "../domain/mandibularAsymmetry";
import { getTranslations } from "../locales";

// ── Step indicator component ────────────────────────────────
function StepIndicator({ currentStep }: { currentStep: number }) {
  const stepCount = 3;
  return (
    <div className="mb-3.5 flex items-center gap-1.5">
      {Array.from({ length: stepCount }).map((_, idx) => (
        <div key={idx} className="flex items-center">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              idx < currentStep
                ? "bg-emerald-600 text-white shadow-xs"
                : idx === currentStep
                ? "bg-cyan-600 text-white ring-2 ring-cyan-400/50 ring-offset-1 ring-offset-slate-900 shadow-xs"
                : "bg-slate-800 text-slate-500 border border-slate-700/60"
            }`}
          >
            {idx < currentStep ? "✓" : idx + 1}
          </div>
          {idx < stepCount - 1 && (
            <div
              className={`h-0.5 w-6 ml-1.5 transition-colors ${
                idx < currentStep ? "bg-emerald-600" : "bg-slate-800"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function CalibrationPanel() {
  const language = useStudyStore((s) => s.language);
  const calibration = useStudyStore((s) => s.calibration);
  const calibrationStage = useStudyStore((s) => s.calibrationStage);
  const calibrationPoints = useStudyStore((s) => s.calibrationPoints);
  const imageNaturalWidth = useStudyStore((s) => s.imageNaturalWidth);
  const imageNaturalHeight = useStudyStore((s) => s.imageNaturalHeight);

  const startCalibration = useStudyStore((s) => s.startCalibration);
  const cancelCalibration = useStudyStore((s) => s.cancelCalibration);
  const confirmPoint1 = useStudyStore((s) => s.confirmPoint1);
  const confirmPoint2 = useStudyStore((s) => s.confirmPoint2);
  const resetPoint1 = useStudyStore((s) => s.resetPoint1);
  const resetPoint2 = useStudyStore((s) => s.resetPoint2);
  const confirmCalibration = useStudyStore((s) => s.confirmCalibration);
  const clearCalibration = useStudyStore((s) => s.clearCalibration);
  const goBackCalibration = useStudyStore((s) => s.goBackCalibration);

  const t = getTranslations(language);

  const handleBack = () => {
    goBackCalibration();
  };

  const [distanceInput, setDistanceInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  // ── Pixel distance for preview (entering-distance stage) ──
  const pixelDistancePreview = useMemo(() => {
    if (calibrationStage !== "entering-distance") return null;
    if (!calibrationPoints?.point1 || !calibrationPoints?.point2) return null;
    const normDist = calculateDistance(
      calibrationPoints.point1,
      calibrationPoints.point2
    );
    const px = normDist * Math.max(imageNaturalWidth, imageNaturalHeight);
    return px;
  }, [
    calibrationStage,
    calibrationPoints,
    imageNaturalWidth,
    imageNaturalHeight,
  ]);

  // ── Scale preview ──
  const scalePreview = useMemo(() => {
    if (pixelDistancePreview === null || pixelDistancePreview === 0) return null;
    const mm = parseFloat(distanceInput);
    if (isNaN(mm) || mm <= 0) return null;
    return mm / pixelDistancePreview;
  }, [pixelDistancePreview, distanceInput]);

  const MIN_PIXEL_DISTANCE = 5;

  const handleConfirmCalibration = () => {
    const mm = parseFloat(distanceInput);
    if (isNaN(mm) || !Number.isFinite(mm) || mm <= 0) {
      setError(t.calibration.invalidDistanceError);
      return;
    }
    if (pixelDistancePreview !== null && pixelDistancePreview < MIN_PIXEL_DISTANCE) {
      setError(t.calibration.pointsTooCloseError(pixelDistancePreview, MIN_PIXEL_DISTANCE));
      return;
    }
    setError(null);
    confirmCalibration(mm);
  };

  const handleCancel = () => {
    setError(null);
    setDistanceInput("");
    cancelCalibration();
  };

  const handleStart = () => {
    setError(null);
    setDistanceInput("");
    startCalibration();
  };

  const handleClearCalibration = () => {
    setError(null);
    setDistanceInput("");
    clearCalibration();
  };

  const isCalibrated = calibrationStage === "calibrated" && calibration !== null;

  const stepNumber =
    calibrationStage === "placing-point-1" || calibrationStage === "reviewing-point-1"
      ? 0
      : calibrationStage === "placing-point-2" || calibrationStage === "reviewing-point-2"
      ? 1
      : calibrationStage === "entering-distance"
      ? 2
      : -1;

  return (
    <div className="border-b border-slate-800/80 p-4 select-none">
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {t.calibration.title}
        </h3>
        {calibration && (
          <span className="font-mono text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-md">
            {calibration.mmPerPixel.toFixed(4)} {t.common.mm}/px
          </span>
        )}
      </div>

      {/* ── IDLE / UNCALIBRATED ── */}
      {calibrationStage === "idle" && !calibration && (
        <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3.5 text-xs text-slate-300">
          <p className="mb-1.5 font-semibold text-amber-400 flex items-center gap-1.5">
            <span>⚠</span>
            <span>{t.calibration.calReqTitle}</span>
          </p>
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            {t.calibration.calReqDesc}
          </p>
          <button
            onClick={handleStart}
            type="button"
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-cyan-950/40 hover:bg-cyan-500 active:scale-[0.98] transition-all"
          >
            <span>🎯</span>
            <span>{t.calibration.calibrateImage}</span>
          </button>
        </div>
      )}

      {/* ── PLACING POINT 1 ── */}
      {calibrationStage === "placing-point-1" && (
        <div className="rounded-xl border border-cyan-900/60 bg-slate-800/60 p-3.5 text-xs">
          <StepIndicator currentStep={stepNumber} />
          <p className="text-slate-100 mb-1 font-semibold">
            {t.calibration.step1Title}
          </p>
          <p className="text-slate-400 mb-3 leading-relaxed">
            {t.calibration.step1Desc}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleBack}
              type="button"
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            >
              {t.calibration.back}
            </button>
            <button
              onClick={handleCancel}
              type="button"
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            >
              {t.calibration.cancelCalibration}
            </button>
          </div>
        </div>
      )}

      {/* ── REVIEWING POINT 1 ── */}
      {calibrationStage === "reviewing-point-1" && (
        <div className="rounded-xl border border-cyan-900/60 bg-slate-800/60 p-3.5 text-xs">
          <StepIndicator currentStep={stepNumber} />
          <p className="text-slate-100 mb-1 font-semibold">
            {t.calibration.step1Review}
          </p>
          <p className="text-slate-400 mb-3 leading-relaxed">
            {t.calibration.step1ReviewDesc}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={confirmPoint1}
              type="button"
              className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-cyan-500 transition-colors"
            >
              {t.calibration.confirmPoint1}
            </button>
            <button
              onClick={resetPoint1}
              type="button"
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            >
              {t.calibration.replacePoint1}
            </button>
            <button
              onClick={handleBack}
              type="button"
              className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            >
              {t.calibration.back}
            </button>
            <button
              onClick={handleCancel}
              type="button"
              className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            >
              {t.calibration.cancelCalibration}
            </button>
          </div>
        </div>
      )}

      {/* ── PLACING POINT 2 ── */}
      {calibrationStage === "placing-point-2" && (
        <div className="rounded-xl border border-cyan-900/60 bg-slate-800/60 p-3.5 text-xs">
          <StepIndicator currentStep={stepNumber} />
          <p className="text-slate-100 mb-1 font-semibold">
            {t.calibration.step2Title}
          </p>
          <p className="text-slate-400 mb-3 leading-relaxed">
            {t.calibration.step2Desc}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleBack}
              type="button"
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            >
              {t.calibration.back}
            </button>
            <button
              onClick={handleCancel}
              type="button"
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            >
              {t.calibration.cancelCalibration}
            </button>
          </div>
        </div>
      )}

      {/* ── REVIEWING POINT 2 ── */}
      {calibrationStage === "reviewing-point-2" && (
        <div className="rounded-xl border border-cyan-900/60 bg-slate-800/60 p-3.5 text-xs">
          <StepIndicator currentStep={stepNumber} />
          <p className="text-slate-100 mb-1 font-semibold">
            {t.calibration.step2Review}
          </p>
          <p className="text-slate-400 mb-3 leading-relaxed">
            {t.calibration.step2ReviewDesc}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={confirmPoint2}
              type="button"
              className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-cyan-500 transition-colors"
            >
              {t.calibration.confirmPoint2}
            </button>
            <button
              onClick={resetPoint2}
              type="button"
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            >
              {t.calibration.replacePoint2}
            </button>
            <button
              onClick={handleBack}
              type="button"
              className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            >
              {t.calibration.back}
            </button>
            <button
              onClick={handleCancel}
              type="button"
              className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            >
              {t.calibration.cancelCalibration}
            </button>
          </div>
        </div>
      )}

      {/* ── ENTERING DISTANCE ── */}
      {calibrationStage === "entering-distance" && (
        <div className="rounded-xl border border-cyan-900/60 bg-slate-800/60 p-3.5 text-xs">
          <StepIndicator currentStep={stepNumber} />
          <p className="text-slate-100 mb-1 font-semibold">
            {t.calibration.step3Title}
          </p>
          <p className="text-slate-400 mb-3 leading-relaxed">
            {t.calibration.step3Desc}
          </p>

          <label className="block mb-3">
            <span className="text-slate-300 font-medium">{t.calibration.knownDistanceMm}</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={0.1}
                value={distanceInput}
                onChange={(e) => setDistanceInput(e.target.value)}
                placeholder="e.g. 10.0"
                className="w-28 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:border-cyan-500 focus:outline-none"
                autoFocus
              />
              <span className="text-slate-400 font-medium">{t.common.mm}</span>
            </div>
          </label>

          {/* Scale Preview */}
          {pixelDistancePreview !== null && (
            <div className="mb-3 rounded-lg bg-slate-900/90 border border-slate-700/70 p-2.5 text-xs text-slate-300">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Points</div>
                  <div className="font-mono font-bold text-slate-200">
                    {parseFloat(distanceInput) && !isNaN(parseFloat(distanceInput))
                      ? parseFloat(distanceInput).toFixed(1)
                      : "—"}{" "}
                    mm
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Pixels</div>
                  <div className="font-mono font-bold text-slate-200">
                    {pixelDistancePreview.toFixed(0)} px
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Scale</div>
                  <div className="font-mono font-bold text-cyan-400">
                    {scalePreview !== null
                      ? scalePreview.toFixed(4)
                      : "—"}{" "}
                    mm/px
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="mb-3 text-xs text-rose-400 font-medium">⚠ {error}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleConfirmCalibration}
              type="button"
              className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-cyan-500 transition-colors"
            >
              {t.calibration.applyCalibration}
            </button>
            <button
              onClick={handleBack}
              type="button"
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            >
              {t.calibration.back}
            </button>
            <button
              onClick={handleCancel}
              type="button"
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            >
              {t.calibration.cancelCalibration}
            </button>
          </div>
        </div>
      )}

      {/* ── CALIBRATED ── */}
      {isCalibrated && (
        <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/30 p-3 text-xs text-slate-300">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-400 mb-1">
            <span>✓</span>
            <span>{t.calibration.calibratedBanner(calibration!.mmPerPixel.toFixed(4))}</span>
          </div>
          <p className="text-[11px] text-emerald-300/80 mb-3 leading-relaxed">
            {t.calibration.calibratedDesc}
          </p>

          <div className="flex gap-2">
            <button
              onClick={handleStart}
              type="button"
              className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
            >
              {t.calibration.recalibrate}
            </button>
            <button
              onClick={handleClearCalibration}
              type="button"
              className="rounded-lg border border-rose-900/60 bg-rose-950/30 px-2.5 py-1 text-xs font-medium text-rose-300 hover:bg-rose-900/40 transition-colors"
            >
              {t.common.delete}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}