// ── Landmark Palette ────────────────────────────────────────
// Sequential guided landmark placement with AI proposal integration.

import { useStudyStore } from "../store/studyStore";
import { LANDMARK_DEFINITIONS } from "../domain/types";
import type { LandmarkName } from "../domain/types";
import { getTranslations } from "../locales";

export function LandmarkPalette() {
  const language = useStudyStore((s) => s.language);
  const imageDataUrl = useStudyStore((s) => s.imageDataUrl);
  const landmarks = useStudyStore((s) => s.landmarks);
  const activeLandmark = useStudyStore((s) => s.activeLandmark);
  const isAiDetecting = useStudyStore((s) => s.isAiDetecting);
  const aiCandidateLandmarks = useStudyStore((s) => s.aiCandidateLandmarks);

  const setActiveLandmark = useStudyStore((s) => s.setActiveLandmark);
  const deleteLandmark = useStudyStore((s) => s.deleteLandmark);
  const detectLandmarksAi = useStudyStore((s) => s.detectLandmarksAi);
  const acceptAllAiProposals = useStudyStore((s) => s.acceptAllAiProposals);
  const clearAiProposals = useStudyStore((s) => s.clearAiProposals);

  const t = getTranslations(language);

  const placedCount = LANDMARK_DEFINITIONS.filter(
    (l) => landmarks[l.name]
  ).length;

  const candidateCount = LANDMARK_DEFINITIONS.filter(
    (l) => aiCandidateLandmarks[l.name]
  ).length;

  // Determine current step (first unplaced landmark)
  const nextUnplaced = LANDMARK_DEFINITIONS.find((l) => !landmarks[l.name]);
  const currentStep = nextUnplaced
    ? LANDMARK_DEFINITIONS.findIndex((l) => l.name === nextUnplaced.name)
    : LANDMARK_DEFINITIONS.length;

  const allPlaced = placedCount === LANDMARK_DEFINITIONS.length;

  return (
    <div className="border-b border-gray-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          {t.landmarks.title}
        </h3>
        <span className="text-xs font-medium text-gray-500">
          {t.landmarks.placedCount(placedCount)}
        </span>
      </div>

      {/* AI Auto-Detect Trigger Button */}
      {imageDataUrl && (
        <div className="mb-3">
          <button
            onClick={() => detectLandmarksAi()}
            disabled={isAiDetecting}
            type="button"
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 transition-colors"
          >
            {isAiDetecting ? (
              <>
                <span className="animate-spin text-sm">⏳</span>
                <span>{t.ai.detecting}</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>{t.ai.detectButton}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* AI Proposals Review Banner */}
      {candidateCount > 0 && (
        <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
          <div className="font-semibold flex items-center gap-1.5 mb-1">
            <span className="text-amber-600">✨</span>
            <span>{t.ai.proposalsActive(candidateCount)}</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-snug mb-2">
            {t.ai.disclaimer}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => acceptAllAiProposals()}
              type="button"
              className="flex-1 rounded bg-green-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-green-700 transition-colors"
            >
              {t.ai.acceptAll}
            </button>
            <button
              onClick={() => clearAiProposals()}
              type="button"
              className="rounded border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              {t.ai.clearProposals}
            </button>
          </div>
        </div>
      )}

      {/* Progress indicator */}
      <div className="mb-3 flex gap-1">
        {LANDMARK_DEFINITIONS.map((def, idx) => (
          <div
            key={def.name}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              landmarks[def.name]
                ? aiCandidateLandmarks[def.name]
                  ? "bg-amber-400"
                  : "bg-green-500"
                : idx === currentStep
                ? "bg-orange-400"
                : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {/* Compact summary when all placed */}
      {allPlaced && !activeLandmark && candidateCount === 0 && (
        <div className="mb-2 text-sm text-green-600 font-medium">
          {t.landmarks.allPlaced}
        </div>
      )}

      {/* Current step hint */}
      {!allPlaced && nextUnplaced && candidateCount === 0 && (
        <div className="mb-3 rounded-md bg-orange-50 border border-orange-200 p-2">
          <div className="text-xs font-medium text-orange-600">
            {t.landmarks.stepOf(currentStep + 1)}
          </div>
          <div className="text-sm font-semibold text-gray-800 mt-0.5">
            {t.landmarks.definitions[nextUnplaced.name].fullName} ({nextUnplaced.label})
          </div>
          <div className="text-xs text-gray-600 mt-0.5">
            {t.landmarks.definitions[nextUnplaced.name].hint}
          </div>
          <button
            onClick={() => setActiveLandmark(nextUnplaced.name)}
            className="mt-1.5 text-xs font-medium text-orange-600 hover:underline"
          >
            {t.landmarks.clickToPlace}
          </button>
        </div>
      )}

      {/* Active placement indicator */}
      {activeLandmark && (
        <div className="mb-3 rounded-md bg-blue-50 border border-blue-200 p-2">
          <div className="text-xs font-medium text-blue-600">
            {t.landmarks.placing(t.landmarks.definitions[activeLandmark].fullName)}
          </div>
          <div className="text-xs text-gray-600 mt-0.5">
            {t.landmarks.definitions[activeLandmark].hint}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {t.landmarks.clickOnRadiograph}
          </div>
          <button
            onClick={() => setActiveLandmark(null)}
            className="mt-1.5 text-xs font-medium text-gray-500 hover:underline"
          >
            {t.landmarks.cancelEsc}
          </button>
        </div>
      )}

      {/* Landmark list */}
      <div className="space-y-1">
        {LANDMARK_DEFINITIONS.map((def) => {
          const isPlaced = !!landmarks[def.name];
          const isCandidate = !!aiCandidateLandmarks[def.name];
          const isActive = activeLandmark === def.name;
          const meta = t.landmarks.definitions[def.name];
          return (
            <div
              key={def.name}
              className={`flex items-center gap-2 rounded px-2 py-1 text-xs ${
                isActive
                  ? "bg-orange-100 border border-orange-300"
                  : isCandidate
                  ? "bg-amber-50 border border-amber-200"
                  : isPlaced
                  ? "bg-green-50"
                  : "bg-gray-50"
              }`}
            >
              <span
                className={`inline-block h-3 w-3 rounded-full ${
                  def.side === "right"
                    ? "bg-blue-500"
                    : def.side === "left"
                    ? "bg-green-600"
                    : "bg-amber-500"
                }`}
              />
              <button
                onClick={() =>
                  setActiveLandmark(isActive ? null : def.name)
                }
                className="flex-1 text-left font-medium"
              >
                {def.label} — {meta.fullName}
              </button>
              {isPlaced ? (
                <>
                  {isCandidate ? (
                    <span className="rounded bg-amber-200 px-1.5 py-0.2 text-[10px] font-semibold text-amber-900">
                      AI
                    </span>
                  ) : (
                    <span className="text-green-600 text-xs">✓</span>
                  )}
                  <button
                    onClick={() => deleteLandmark(def.name as LandmarkName)}
                    className="text-red-400 hover:text-red-600 text-xs"
                    title={t.viewer.deleteLandmark}
                  >
                    ✕
                  </button>
                </>
              ) : (
                <span className="text-gray-400 text-xs">—</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}