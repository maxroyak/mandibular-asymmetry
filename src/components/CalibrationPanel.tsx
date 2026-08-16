// ── Calibration Panel ────────────────────────────────────────
// Uncalibrated (default): relative % only, shows "Calibration required"
//   with a [Calibrate image] button to start the calibration workflow.
// Calibrated: shows mm values, states calibration source briefly.
// The isCalibrating flag lives in the store so other components (e.g.
// ResultsPanel) can trigger calibration start.

import { useState } from "react";
import { useStudyStore } from "../store/studyStore";

export function CalibrationPanel() {
  const calibration = useStudyStore((s) => s.calibration);
  const calibrationPoints = useStudyStore((s) => s.calibrationPoints);
  const calibrationRealDistanceMm = useStudyStore(
    (s) => s.calibrationRealDistanceMm
  );
  const setCalibrationRealDistance = useStudyStore(
    (s) => s.setCalibrationRealDistance
  );
  const computeCalibration = useStudyStore((s) => s.computeCalibration);
  const clearCalibration = useStudyStore((s) => s.clearCalibration);

  // Shared calibration-start flag from the store
  const isCalibrating = useStudyStore((s) => s.isCalibrating);
  const storeStartCalibration = useStudyStore((s) => s.startCalibration);
  const storeCancelCalibration = useStudyStore((s) => s.cancelCalibration);

  const [error, setError] = useState<string | null>(null);

  const startCalibration = () => {
    setError(null);
    storeStartCalibration();
  };

  const confirmCalibration = () => {
    if (calibrationRealDistanceMm <= 0) {
      setError("Distance must be a positive number.");
      return;
    }
    if (
      !calibrationPoints ||
      !calibrationPoints.point1 ||
      !calibrationPoints.point2
    ) {
      setError("Mark two points on the radiograph first.");
      return;
    }
    // Check points are different
    const p0 = calibrationPoints.point1;
    const p1 = calibrationPoints.point2;
    if (p0.x === p1.x && p0.y === p1.y) {
      setError("Calibration points must be different.");
      return;
    }
    computeCalibration();
    setError(null);
  };

  const cancelCalibration = () => {
    setError(null);
    storeCancelCalibration();
  };

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

      {!calibration && !isCalibrating && (
        <div className="text-xs text-gray-500">
          <p className="mb-2 font-medium text-amber-700">
            Calibration required to display millimeters
          </p>
          <p className="text-xs text-gray-500 mb-1">
            Currently showing relative percentages only.
          </p>
          <button
            onClick={startCalibration}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            Calibrate image
          </button>
        </div>
      )}

      {isCalibrating && (
        <div className="rounded border border-blue-200 bg-blue-50 p-3 text-xs">
          <p className="font-medium text-blue-700 mb-2">
            Image Calibration
          </p>
          <p className="text-gray-600 mb-2">
            Mark two points on the radiograph with a known real-world distance
            (e.g., implant length, known anatomical distance).
          </p>
          {/* Bug 6: Text status indicators for active calibration step */}
          <div className="mb-3 rounded bg-white border border-blue-100 px-3 py-2">
            {!calibrationPoints?.point1 && (
              <p className="font-medium text-blue-700">
                Place Point 1
              </p>
            )}
            {calibrationPoints?.point1 && !calibrationPoints?.point2 && (
              <p className="font-medium text-blue-700">
                Point 1 ✓ — Now place Point 2
              </p>
            )}
            {calibrationPoints?.point1 && calibrationPoints?.point2 && (
              <p className="font-medium text-blue-700">
                Point 1 ✓ — Point 2 ✓ — Enter known distance
              </p>
            )}
          </div>
          <div className="mb-2 flex gap-2">
            <span className="flex items-center gap-1">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  calibrationPoints?.point1 ? "bg-green-500" : "bg-gray-300"
                }`}
              />
              Point 1 {calibrationPoints?.point1 ? "✓" : "(click image)"}
            </span>
            <span className="flex items-center gap-1">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  calibrationPoints?.point2 ? "bg-green-500" : "bg-gray-300"
                }`}
              />
              Point 2 {calibrationPoints?.point2 ? "✓" : "(click image)"}
            </span>
          </div>
          <label className="block mb-2">
            <span className="text-gray-600">Known distance:</span>
            <input
              type="number"
              min={0}
              step={0.1}
              value={calibrationRealDistanceMm || ""}
              onChange={(e) =>
                setCalibrationRealDistance(parseFloat(e.target.value) || 0)
              }
              placeholder="mm"
              className="ml-2 w-20 rounded border border-gray-300 px-2 py-0.5 text-xs"
            />
            <span className="ml-1 text-gray-500">mm</span>
          </label>
          {error && (
            <p className="mb-2 text-xs text-red-600 font-medium">{error}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={confirmCalibration}
              className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
            >
              Confirm
            </button>
            <button
              onClick={cancelCalibration}
              className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {calibration && !isCalibrating && (
        <div className="text-xs text-gray-600">
          <p className="mb-1">
            Calibrated: {calibration.mmPerPixel.toFixed(4)} mm/pixel
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
              onClick={startCalibration}
              className="rounded border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-50"
            >
              Recalibrate
            </button>
            <button
              onClick={clearCalibration}
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