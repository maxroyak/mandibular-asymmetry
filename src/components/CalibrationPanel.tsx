// ── Calibration Panel ────────────────────────────────────────
// State-machine-driven calibration UI.
//
// Stages:
//   idle             → "Calibration required" + [Calibrate image]
//   placing-point-1  → "Step 1 of 3" + [Cancel calibration]
//   reviewing-point-1 → "Point 1 placed" + [Confirm point 1] [Replace point 1] [Back] [Cancel calibration]
//   placing-point-2  → "Step 2 of 3" + [Back] [Cancel calibration]
//   reviewing-point-2 → "Point 2 placed" + [Confirm point 2] [Replace point 2] [Back] [Cancel calibration]
//   entering-distance → "Step 3 of 3" + preview + [Apply calibration] [Back] [Cancel calibration]
//   calibrated       → "Calibrated: X.XXXX mm/px" + [Recalibrate] [Remove]

import { useState, useMemo } from "react";
import { useStudyStore } from "../store/studyStore";
import { calculateDistance } from "../domain/mandibularAsymmetry";

// ── Step indicator component ────────────────────────────────
function StepIndicator({ currentStep }: { currentStep: number }) {
  const stepCount = 3;
  return (
    <div className="mb-3 flex items-center gap-1">
      {Array.from({ length: stepCount }).map((_, idx) => (
        <div key={idx} className="flex items-center">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
              idx < currentStep
                ? "bg-green-500 text-white"
                : idx === currentStep
                ? "bg-blue-600 text-white ring-2 ring-blue-300 ring-offset-1"
                : "bg-gray-200 text-gray-400"
            }`}
          >
            {idx < currentStep ? "✓" : idx + 1}
          </div>
          {idx < stepCount - 1 && (
            <div
              className={`h-0.5 w-6 ${
                idx < currentStep ? "bg-green-500" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function CalibrationPanel() {
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

  // ── Back button support ──
  // Go back one step in the calibration state machine without discarding progress.
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
      setError("Distance must be a positive number.");
      return;
    }
    // Check minimum pixel distance (Item 4i)
    if (pixelDistancePreview !== null && pixelDistancePreview < MIN_PIXEL_DISTANCE) {
      setError(
        `Calibration points are too close (${pixelDistancePreview.toFixed(0)} px). ` +
        `Minimum distance is ${MIN_PIXEL_DISTANCE} px. Please move the points further apart.`
      );
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

  // ── Step number for indicator ──
  const stepNumber =
    calibrationStage === "placing-point-1" || calibrationStage === "reviewing-point-1"
      ? 0
      : calibrationStage === "placing-point-2" || calibrationStage === "reviewing-point-2"
      ? 1
      : calibrationStage === "entering-distance"
      ? 2
      : -1;

  return (
    <div className="border-b border-gray-200 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Calibration</h3>
        {calibration && (
          <span className="text-xs font-medium text-green-600">
            {calibration.mmPerPixel.toFixed(4)} mm/px
          </span>
        )}
      </div>

      {/* ── IDLE / UNCALIBRATED ── */}
      {calibrationStage === "idle" && !calibration && (
        <div className="text-xs text-gray-500">
          <p className="mb-2 font-medium text-amber-700">
            Calibration required to display millimeters
          </p>
          <p className="text-xs text-gray-500 mb-1">
            Currently showing relative percentages only.
          </p>
          <button
            onClick={handleStart}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            Calibrate image
          </button>
        </div>
      )}

      {/* ── PLACING POINT 1 ── */}
      {calibrationStage === "placing-point-1" && (
        <div className="rounded border border-blue-200 bg-blue-50 p-3 text-xs">
          <p className="font-medium text-blue-700 mb-2">
            Image Calibration
          </p>
          <StepIndicator currentStep={stepNumber} />
          <p className="text-gray-600 mb-2 font-medium">
            Step 1 of 3 — Click the first endpoint of the known reference distance.
          </p>
          <p className="text-gray-500 mb-2 italic">
            Click directly on the radiograph to place Point 1.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleBack}
              className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleCancel}
              className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Cancel calibration
            </button>
          </div>
        </div>
      )}

      {/* ── REVIEWING POINT 1 ── */}
      {calibrationStage === "reviewing-point-1" && (
        <div className="rounded border border-blue-200 bg-blue-50 p-3 text-xs">
          <p className="font-medium text-blue-700 mb-2">
            Image Calibration
          </p>
          <StepIndicator currentStep={stepNumber} />
          <p className="text-gray-600 mb-2">
            <span className="font-medium">Point 1 placed.</span> Drag the point to
            adjust its position if necessary, then confirm to proceed.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={confirmPoint1}
              className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
            >
              Confirm point 1
            </button>
            <button
              onClick={resetPoint1}
              className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Replace point 1
            </button>
            <button
              onClick={handleBack}
              className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleCancel}
              className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Cancel calibration
            </button>
          </div>
        </div>
      )}

      {/* ── PLACING POINT 2 ── */}
      {calibrationStage === "placing-point-2" && (
        <div className="rounded border border-blue-200 bg-blue-50 p-3 text-xs">
          <p className="font-medium text-blue-700 mb-2">
            Image Calibration
          </p>
          <StepIndicator currentStep={stepNumber} />
          <p className="text-gray-600 mb-2 font-medium">
            Step 2 of 3 — Click the second endpoint of the known reference distance.
          </p>
          <p className="text-gray-500 mb-2 italic">
            Click directly on the radiograph to place Point 2.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleBack}
              className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleCancel}
              className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Cancel calibration
            </button>
          </div>
        </div>
      )}

      {/* ── REVIEWING POINT 2 ── */}
      {calibrationStage === "reviewing-point-2" && (
        <div className="rounded border border-blue-200 bg-blue-50 p-3 text-xs">
          <p className="font-medium text-blue-700 mb-2">
            Image Calibration
          </p>
          <StepIndicator currentStep={stepNumber} />
          <p className="text-gray-600 mb-2">
            <span className="font-medium">Point 2 placed.</span> Drag the point to
            adjust its position if necessary, then confirm to proceed.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={confirmPoint2}
              className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
            >
              Confirm point 2
            </button>
            <button
              onClick={resetPoint2}
              className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Replace point 2
            </button>
            <button
              onClick={handleBack}
              className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleCancel}
              className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Cancel calibration
            </button>
          </div>
        </div>
      )}

      {/* ── ENTERING DISTANCE ── */}
      {calibrationStage === "entering-distance" && (
        <div className="rounded border border-blue-200 bg-blue-50 p-3 text-xs">
          <p className="font-medium text-blue-700 mb-2">
            Image Calibration
          </p>
          <StepIndicator currentStep={stepNumber} />
          <p className="text-gray-600 mb-2">
            Step 3 of 3 — Enter the known distance between Point 1 and Point 2 in millimeters.
          </p>
          <label className="block mb-2">
            <span className="text-gray-600">Known distance:</span>
            <input
              type="number"
              min={0}
              step={0.1}
              value={distanceInput}
              onChange={(e) => setDistanceInput(e.target.value)}
              placeholder="mm"
              className="ml-2 w-20 rounded border border-gray-300 px-2 py-0.5 text-xs"
              autoFocus
            />
            <span className="ml-1 text-gray-500">mm</span>
          </label>

          {/* Preview before applying (Item 5) */}
          {pixelDistancePreview !== null && (
            <div className="mb-3 rounded bg-gray-100 p-2 text-xs text-gray-700">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-gray-500">Reference distance</div>
                  <div className="font-mono font-bold">
                    {parseFloat(distanceInput) && !isNaN(parseFloat(distanceInput))
                      ? parseFloat(distanceInput).toFixed(1)
                      : "—"}{" "}
                    mm
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Pixel distance</div>
                  <div className="font-mono font-bold">
                    {pixelDistancePreview.toFixed(0)} px
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Calculated scale</div>
                  <div className="font-mono font-bold">
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
            <p className="mb-2 text-xs text-red-600 font-medium">{error}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleConfirmCalibration}
              className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
            >
              Apply calibration
            </button>
            <button
              onClick={handleBack}
              className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleCancel}
              className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Cancel calibration
            </button>
          </div>
        </div>
      )}

      {/* ── CALIBRATED ── */}
      {isCalibrated && (
        <div className="text-xs text-gray-600">
          <p className="mb-1">
            Calibrated: {calibration!.mmPerPixel.toFixed(4)} mm/pixel
            <span className="ml-1 text-gray-500">
              (user-marked reference distance)
            </span>
          </p>
          <p className="text-xs text-gray-500 italic mb-2">
            Approximate calibrated value. Panoramic radiographs may contain
            non-uniform magnification and projection distortion. Calibration
            improves scaling but does not eliminate these limitations.
          </p>
          {/* Persistent limitation notice (Item 7b) */}
          <div className="mb-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
            Millimeter values are approximate. Panoramic radiographs may contain
            non-uniform magnification and projection distortion. Calibration
            improves scaling but does not eliminate these limitations.
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleStart}
              className="rounded border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-50"
            >
              Recalibrate
            </button>
            <button
              onClick={handleClearCalibration}
              className="rounded border border-gray-300 px-2 py-0.5 text-xs text-red-500 hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}