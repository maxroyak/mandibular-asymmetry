// ── Analysis Page ───────────────────────────────────────────
// Canonical application shell:
//   - Top Navigation Bar (Single source of truth for Study Actions & Status)
//   - Maximized Radiograph Viewport
//   - 4-Step Structured Workflow Sidebar (Calibration, Landmarks, Results, History)
//   - 1-Page Clinical PDF Export Modal

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
import { LANDMARK_DEFINITIONS } from "../domain/types";
import { getTranslations } from "../locales";

type WorkflowStep = 1 | 2 | 3 | 4;

export function AnalysisPage() {
  const language = useStudyStore((s) => s.language);
  const studyId = useStudyStore((s) => s.studyId);
  const isSaved = useStudyStore((s) => s.isSaved);
  const patientId = useStudyStore((s) => s.patientId);
  const imageDataUrl = useStudyStore((s) => s.imageDataUrl);
  const calibration = useStudyStore((s) => s.calibration);
  const landmarks = useStudyStore((s) => s.landmarks);
  const measurements = useStudyStore((s) => s.measurements);

  const saveStudy = useStudyStore((s) => s.saveStudy);
  const newStudy = useStudyStore((s) => s.newStudy);

  const [activeStep, setActiveStep] = useState<WorkflowStep>(2);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [showPatientPopover, setShowPatientPopover] = useState(false);
  const [localPatientId, setLocalPatientId] = useState(patientId);

  const t = getTranslations(language);

  const isCalibrated = calibration !== null;
  const placedLandmarkCount = LANDMARK_DEFINITIONS.filter(
    (l) => landmarks[l.name]
  ).length;
  const hasResults = !!measurements?.ramusHeight || !!measurements?.bodyLength;

  const handleSaveStudy = async () => {
    if (!imageDataUrl) return;
    await saveStudy();
  };

  const handleNewStudy = () => {
    if (!isSaved && studyId) {
      if (!confirm(t.studyManager.discardStudyConfirm)) {
        return;
      }
    }
    newStudy();
    setActiveStep(2);
  };

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100 select-none overflow-hidden font-sans">
      {/* ── Top Navigation Bar ── */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0 z-20 no-print">
        {/* Brand Header & Medical Badge */}
        <div className="flex items-center gap-2.5 min-w-[200px]">
          <span className="text-xl">🩻</span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-slate-100">
                {t.common.appName}
              </h1>
              <span className="hidden sm:inline-block rounded-md bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 text-[10px] font-bold text-cyan-400 tracking-wide">
                {t.common.editionBadge}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden md:block">
              {t.common.appSubtitle}
            </p>
          </div>
        </div>

        {/* Center Study Metadata & Status Chips (Visible when radiograph is loaded) */}
        {imageDataUrl && (
          <div className="hidden md:flex items-center gap-2.5">
            {/* Patient ID Chip / Inline Edit */}
            {showPatientPopover ? (
              <div className="flex items-center gap-1 bg-slate-800 border border-cyan-500/60 rounded-lg px-2 py-0.5">
                <input
                  type="text"
                  value={localPatientId}
                  onChange={(e) => setLocalPatientId(e.target.value)}
                  placeholder={t.studyManager.patientIdPlaceholder}
                  className="bg-transparent text-xs font-mono text-slate-100 outline-none w-28"
                  autoFocus
                />
                <button
                  onClick={() => {
                    useStudyStore.setState({ patientId: localPatientId, isSaved: false });
                    setShowPatientPopover(false);
                  }}
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 px-1"
                >
                  ✓
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setLocalPatientId(patientId);
                  setShowPatientPopover(true);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300 hover:border-slate-600 hover:text-slate-100 transition-colors"
                title="Edit Patient ID"
              >
                <span className="text-slate-400">{t.topBar.patient}:</span>
                <span className="font-mono font-semibold text-slate-200">
                  {patientId || t.studyManager.unassigned}
                </span>
                <span className="text-slate-400 text-[10px]">✎</span>
              </button>
            )}

            {/* Calibration Status Chip */}
            <button
              onClick={() => setActiveStep(1)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border transition-colors cursor-pointer ${
                isCalibrated
                  ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/40"
                  : "bg-amber-950/40 border-amber-800/60 text-amber-300 hover:bg-amber-900/40"
              }`}
              title="Click to manage calibration"
            >
              <span>{isCalibrated ? "✓" : "⚠"}</span>
              <span>
                {isCalibrated
                  ? t.topBar.calibratedChip(calibration!.mmPerPixel.toFixed(4))
                  : t.topBar.uncalibratedChip}
              </span>
            </button>
          </div>
        )}

        {/* Primary Study Actions & Utilities */}
        <div className="flex items-center gap-2">
          {/* Primary Save Button */}
          <button
            onClick={handleSaveStudy}
            disabled={!imageDataUrl}
            type="button"
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition-all ${
              !imageDataUrl
                ? "bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed"
                : isSaved
                ? "bg-slate-800 text-emerald-400 border border-emerald-700/60 hover:bg-slate-700"
                : "bg-cyan-600 text-white hover:bg-cyan-500 active:scale-[0.98] ring-2 ring-cyan-400/40 ring-offset-1 ring-offset-slate-900"
            }`}
            title={t.topBar.save}
          >
            <span>{isSaved ? "✓" : "💾"}</span>
            <span>{isSaved ? t.topBar.saved : t.topBar.save}</span>
            {!isSaved && imageDataUrl && (
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse" />
            )}
          </button>

          {/* New Study Button */}
          <button
            onClick={handleNewStudy}
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 bg-slate-800/80 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition-colors"
            title={t.topBar.newStudy}
          >
            <span>➕</span>
            <span className="hidden sm:inline">{t.topBar.newStudy}</span>
          </button>

          {/* Export Report Action Button */}
          {imageDataUrl && (
            <button
              onClick={() => setIsReportOpen(true)}
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-600/40 bg-cyan-950/40 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/50 hover:border-cyan-500/60 transition-colors"
              title={t.topBar.exportReport}
            >
              <span>📄</span>
              <span className="hidden sm:inline">{t.topBar.exportReport}</span>
            </button>
          )}

          {/* Language Switcher Pill */}
          <LanguageSwitcher />
        </div>
      </header>

      {/* ── Main Workspace Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Radiograph Viewport Area */}
        <main className="flex-1 overflow-hidden relative flex flex-col bg-slate-950 radiograph-grid-bg">
          {imageDataUrl ? <ImageViewer /> : <ImageUploadZone />}
        </main>

        {/* Structured 4-Step Workflow Sidebar */}
        <aside className="w-96 lg:w-[420px] bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 no-print select-none">
          {imageDataUrl ? (
            <>
              {/* 4-Step Horizontal Navigation Bar */}
              <div className="bg-slate-950/80 border-b border-slate-800 p-1.5 flex gap-1 shrink-0">
                {/* Step 1: Calibration */}
                <button
                  onClick={() => setActiveStep(1)}
                  type="button"
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    activeStep === 1
                      ? "bg-slate-800 text-cyan-300 border border-slate-700 shadow-xs"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isCalibrated ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                  />
                  <span>{t.steps.calibration}</span>
                </button>

                {/* Step 2: Landmarks */}
                <button
                  onClick={() => setActiveStep(2)}
                  type="button"
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    activeStep === 2
                      ? "bg-slate-800 text-cyan-300 border border-slate-700 shadow-xs"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      placedLandmarkCount === 5 ? "bg-emerald-400" : "bg-cyan-400"
                    }`}
                  />
                  <span>{t.steps.landmarks}</span>
                  <span className="font-mono text-[10px] text-slate-500">
                    ({placedLandmarkCount}/5)
                  </span>
                </button>

                {/* Step 3: Analysis */}
                <button
                  onClick={() => setActiveStep(3)}
                  type="button"
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    activeStep === 3
                      ? "bg-slate-800 text-cyan-300 border border-slate-700 shadow-xs"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      hasResults ? "bg-emerald-400" : "bg-slate-600"
                    }`}
                  />
                  <span>{t.steps.results}</span>
                </button>

                {/* Step 4: History */}
                <button
                  onClick={() => setActiveStep(4)}
                  type="button"
                  className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                    activeStep === 4
                      ? "bg-slate-800 text-cyan-300 border border-slate-700 shadow-xs"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                  title={t.steps.history}
                >
                  <span>📁</span>
                </button>
              </div>

              {/* Step Content Viewport */}
              <div className="flex-1 overflow-y-auto">
                {activeStep === 1 && <CalibrationPanel />}
                {activeStep === 2 && <LandmarkPalette />}
                {activeStep === 3 && (
                  <ResultsPanel
                    onOpenReport={() => setIsReportOpen(true)}
                    onJumpToCalibration={() => setActiveStep(1)}
                  />
                )}
                {activeStep === 4 && <StudyManager />}
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <StudyManager />
            </div>
          )}
        </aside>
      </div>

      {/* ── 1-Page Clinical PDF Export Preview Modal ── */}
      <ClinicalReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />
    </div>
  );
}