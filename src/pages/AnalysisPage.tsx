// ── Analysis Page ───────────────────────────────────────────
// Main single-page view: upload → analyze → results.
// Two-column layout: radiograph viewer (left) + workflow panel (right).

import { useStudyStore } from "../store/studyStore";
import { ImageUploadZone } from "../components/ImageUploadZone";
import { ImageViewer } from "../components/ImageViewer";
import { LandmarkPalette } from "../components/LandmarkPalette";
import { CalibrationPanel } from "../components/CalibrationPanel";
import { ResultsPanel } from "../components/ResultsPanel";
import { StudyManager } from "../components/StudyManager";

export function AnalysisPage() {
  const imageDataUrl = useStudyStore((s) => s.imageDataUrl);
  const imageNaturalWidth = useStudyStore((s) => s.imageNaturalWidth);
  const imageNaturalHeight = useStudyStore((s) => s.imageNaturalHeight);

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-3">
        <h1 className="text-lg font-bold text-gray-800">
          Mandibular Asymmetry Analysis
        </h1>
        <p className="text-xs text-gray-500">
          2D measurement and comparative analysis — not a diagnostic system
        </p>
      </header>

      {/* Main content: two-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left / Center — Radiograph Viewer */}
        <div className="flex-1 overflow-hidden">
          {imageDataUrl ? (
            <ImageViewer />
          ) : (
            <ImageUploadZone />
          )}
        </div>

        {/* Right Panel — Workflow */}
        <aside className="w-96 overflow-y-auto border-l border-gray-200 bg-white flex flex-col">
          {imageDataUrl ? (
            <>
              {/* Image Quality status */}
              <div className="border-b border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-1">
                  Image Quality
                </h3>
                <div className="text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <span className="text-green-500">✓</span>
                    <span>
                      Image loaded — {imageNaturalWidth} × {imageNaturalHeight} px
                    </span>
                  </div>
                  {(imageNaturalWidth < 800 || imageNaturalWidth > 10000) && (
                    <div className="mt-1 text-amber-600">
                      ⚠ {" "}
                      {imageNaturalWidth < 800
                        ? "Low resolution image — measurement precision may be affected."
                        : "Very high resolution image — may affect performance."}
                    </div>
                  )}
                </div>
              </div>

              {/* Landmark Placement */}
              <LandmarkPalette />

              {/* Calibration */}
              <CalibrationPanel />

              {/* Results (shown when landmarks placed) */}
              <div className="flex-1">
                <ResultsPanel />
              </div>

              {/* Study Management */}
              <StudyManager />
            </>
          ) : (
            <div className="p-4 text-sm text-gray-400">
              Upload a radiograph to begin analysis.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}