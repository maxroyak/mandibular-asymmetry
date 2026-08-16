// ── Calibration Panel ────────────────────────────────────────
// State-machine-driven calibration UI.
//
// Stages:
//   idle             → "Calibration required" + [Calibrate image]
//   placing-point-1  → "Step 1 of 3" + [Cancel]
//   reviewing-point-1 → "Point 1 placed" + [Confirm Point 1] [Reset Point 1] [Cancel]
//   placing-point-2  → "Step 2 of 3" + [Cancel]
//   reviewing-point-2 → "Point 2 placed" + [Confirm Point 2] [Reset Point 2] [Cancel]
//   entering-distance → "Step 3 of 3" + input + [Confirm calibration] [Cancel]
//   calibrated       → "Calibrated: X.XXXX mm/pixel" + [Recalibrate] [Remove]

import { useState } from "react";
import { useStudyStore } from "../store/studyStore";

export function CalibrationPanel() {
  const calibration = useStudyStore((s) => s.calibration);
  const calibrationStage = useStudyStore((s) => s.calibrationStage);

  const startCalibration = useStudyStore((s) => s.startCalibration);
  const cancelCalibration = useStudyStore((s) => s.cancelCalibration);
  const confirmPoint1 = useStudyStore((s) => s.confirmPoint1);
  const confirmPoint2 = useStudyStore((s) => s.confirmPoint2);
  const resetPoint1 = useStudyStore((s) => s.resetPoint1);
  const resetPoint2 = useStudyStore((s) => s.resetPoint2);
  const confirmCalibration = useStudyStore((s) => s.confirmCalibration);
  const clearCalibration = useStudyStore((s) => s.clearCalibration);

  const [distanceInput, setDistanceInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleConfirmCalibration = () => {
    const mm = parseFloat(distanceInput);
    if (isNaN(mm) || mm <= 0) {
      setError("Distance must be a positive number.");
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
          <p className="text-gray-600 mb-2">
            Step 1 of 3 — Click the first endpoint of the known reference distance.
          </p>
          <button
            onClick={handleCancel}
            className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── REVIEWING POINT 1 ── */}
      {calibrationStage === "reviewing-point-1" && (
        <div className="rounded border border-blue-200 bg-blue-50 p-3 text-xs">
          <p className="font-medium text-blue-700 mb-2">
            Image Calibration
          </p>
          <p className="text-gray-600 mb-2">
            Point 1 placed. Adjust the point if necessary, then click Confirm Point 1.
          </p>
          <div className="flex gap-2">
            <button
              onClick={confirmPoint1}
              className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
            >
              Confirm Point 1
            </button>
            <button
              onClick={resetPoint1}
              className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Reset Point 1
            </button>
            <button
              onClick={handleCancel}
              className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Cancel
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
          <p className="text-gray-600 mb-2">
            Step 2 of 3 — Click the second endpoint of the known reference distance.
          </p>
          <button
            onClick={handleCancel}
            className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── REVIEWING POINT 2 ── */}
      {calibrationStage === "reviewing-point-2" && (
        <div className="rounded border border-blue-200 bg-blue-50 p-3 text-xs">
          <p className="font-medium text-blue-700 mb-2">
            Image Calibration
          </p>
          <p className="text-gray-600 mb-2">
            Point 2 placed. Adjust the point if necessary, then click Confirm Point 2.
          </p>
          <div className="flex gap-2">
            <button
              onClick={confirmPoint2}
              className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
            >
              Confirm Point 2
            </button>
            <button
              onClick={resetPoint2}
              className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Reset Point 2
            </button>
            <button
              onClick={handleCancel}
              className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Cancel
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
          {error && (
            <p className="mb-2 text-xs text-red-600 font-medium">{error}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleConfirmCalibration}
              className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
            >
              Confirm calibration
            </button>
            <button
              onClick={handleCancel}
              className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Cancel
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
            Measurements in mm are estimated based on user-provided calibration and
            are subject to panoramic magnification effects.
          </p>
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