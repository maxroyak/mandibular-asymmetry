// ── Analysis Page ───────────────────────────────────────────
// Main single-page view: upload → analyze → results.
// Two-column layout: radiograph viewer (left) + workflow panel (right).

import { useState } from "react";
import { useStudyStore } from "../store/studyStore";
import { ImageUploadZone } from "../components/ImageUploadZone";
import { ImageViewer } from "../components/ImageViewer";
import { LandmarkPalette } from "../components/LandmarkPalette";
import { CalibrationPanel } from "../components/CalibrationPanel";
import { ResultsPanel } from "../components/ResultsPanel";
import { StudyManager } from "../components/StudyManager";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { ClinicalReportModal } from "../components/ClinicalReportModal";
import { getTranslations } from "../locales";

export function AnalysisPage() {
  const language = useStudyStore((s) => s.language);
  const studyId = useStudyStore((s) => s.studyId);
  const isSaved = useStudyStore((s) => s.isSaved);
  const imageDataUrl = useStudyStore((s) => s.imageDataUrl);
  const imageNaturalWidth = useStudyStore((s) => s.imageNaturalWidth);
  const imageNaturalHeight = useStudyStore((s) => s.imageNaturalHeight);

  const saveStudy = useStudyStore((s) => s.saveStudy);
  const newStudy = useStudyStore((s) => s.newStudy);

  const [isReportOpen, setIsReportOpen] = useState(false);
  const t = getTranslations(language);

  const handleSaveStudy = async () => {
    if (!studyId) return;
    await saveStudy();
  };

  const handleNewStudy = () => {
    if (!isSaved && studyId) {
      if (!confirm(t.studyManager.discardStudyConfirm)) {
        return;
      }
    }
    newStudy();
  };

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-6 py-3 no-print">
        {/* Title */}
        <div className="min-w-[200px]">
          <h1 className="text-lg font-bold text-gray-800">
            {t.common.appName}
          </h1>
          <p className="text-xs text-gray-500">
            {t.common.appSubtitle}
          </p>
        </div>

        {/* Central Study Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveStudy}
            disabled={!studyId}
            type="button"
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-2xs transition-colors ${
              !studyId
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : isSaved
                ? "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
                : "bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-blue-300 ring-offset-1"
            }`}
            title={t.studyManager.saveStudy}
          >
            <span>💾</span>
            <span>{t.studyManager.saveStudy}</span>
            {!isSaved && studyId && (
              <span className="ml-1 h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse" />
            )}
          </button>

          <button
            onClick={handleNewStudy}
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 active:bg-gray-100 transition-colors"
            title={t.studyManager.newStudy}
          >
            <span>➕</span>
            <span>{t.studyManager.newStudy}</span>
          </button>
        </div>

        {/* Right-hand Utilities */}
        <div className="flex items-center gap-3">
          {imageDataUrl && (
            <button
              onClick={() => setIsReportOpen(true)}
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-2xs hover:bg-gray-50 active:bg-gray-100 transition-colors"
              title={t.report.exportButton}
            >
              <span>📄</span>
              <span>{t.report.exportButton}</span>
            </button>
          )}
          <LanguageSwitcher />
        </div>
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
        <aside className="w-96 overflow-y-auto border-l border-gray-200 bg-white flex flex-col no-print">
          {imageDataUrl ? (
            <>
              {/* Image Quality status */}
              <div className="border-b border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-1">
                  {t.imageQuality.title}
                </h3>
                <div className="text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <span className="text-green-500">✓</span>
                    <span>
                      {t.imageQuality.loadedText(imageNaturalWidth, imageNaturalHeight)}
                    </span>
                  </div>
                  {(imageNaturalWidth < 800 || imageNaturalWidth > 10000) && (
                    <div className="mt-1 text-amber-600">
                      ⚠ {" "}
                      {imageNaturalWidth < 800
                        ? t.imageQuality.lowResWarning
                        : t.imageQuality.highResWarning}
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
                <ResultsPanel onOpenReport={() => setIsReportOpen(true)} />
              </div>

              {/* Study Persistence Manager */}
              <StudyManager />
            </>
          ) : (
            <div className="p-4 text-xs text-gray-400">
              <StudyManager />
            </div>
          )}
        </aside>
      </div>

      {/* 1-Page Clinical Standard PDF Report Preview Modal */}
      <ClinicalReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />
    </div>
  );
}