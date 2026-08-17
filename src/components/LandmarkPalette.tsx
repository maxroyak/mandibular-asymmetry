// ── Landmark Palette ────────────────────────────────────────
// Sequential guided landmark placement with AI proposal integration.

import { useStudyStore } from "../store/studyStore";
import { LANDMARK_DEFINITIONS } from "../domain/types";
import type { LandmarkName } from "../domain/types";
import { getTranslations } from "../locales";

export function LandmarkPalette() {
  const language = useStudyStore((s) => s.language);
  const landmarks = useStudyStore((s) => s.landmarks);
  const activeLandmark = useStudyStore((s) => s.activeLandmark);
  const aiCandidateLandmarks = useStudyStore((s) => s.aiCandidateLandmarks);

  const setActiveLandmark = useStudyStore((s) => s.setActiveLandmark);
  const deleteLandmark = useStudyStore((s) => s.deleteLandmark);
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
    <div className="border-b border-slate-800/80 p-4 select-none">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {t.landmarks.title}
        </h3>
        <span
          className={`font-mono text-xs font-semibold px-2 py-0.5 rounded-md border ${
            allPlaced
              ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/60"
              : "bg-slate-800 text-slate-300 border-slate-700"
          }`}
        >
          {t.landmarks.placedCount(placedCount)}
        </span>
      </div>

      {/* AI Proposals Review Banner */}
      {candidateCount > 0 && (
        <div className="mb-3.5 rounded-xl border border-amber-500/50 bg-amber-950/30 p-3 text-xs text-amber-200">
          <div className="font-semibold flex items-center gap-1.5 mb-1 text-amber-300">
            <span>✨</span>
            <span>{t.ai.proposalsActive(candidateCount)}</span>
          </div>
          <p className="text-[11px] text-amber-300/80 leading-relaxed mb-2.5">
            {t.ai.disclaimer}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => acceptAllAiProposals()}
              type="button"
              className="flex-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 active:scale-[0.98] transition-all"
            >
              {t.ai.acceptAll}
            </button>
            <button
              onClick={() => clearAiProposals()}
              type="button"
              className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            >
              {t.ai.clearProposals}
            </button>
          </div>
        </div>
      )}

      {/* Progress indicator */}
      <div className="mb-3.5 flex gap-1.5">
        {LANDMARK_DEFINITIONS.map((def, idx) => (
          <div
            key={def.name}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              landmarks[def.name]
                ? aiCandidateLandmarks[def.name]
                  ? "bg-amber-400 shadow-xs shadow-amber-500/50"
                  : "bg-emerald-500 shadow-xs shadow-emerald-500/50"
                : idx === currentStep
                ? "bg-cyan-500 ring-1 ring-cyan-400"
                : "bg-slate-800"
            }`}
          />
        ))}
      </div>

      {/* Compact summary when all placed */}
      {allPlaced && !activeLandmark && candidateCount === 0 && (
        <div className="mb-3 rounded-lg border border-emerald-900/60 bg-emerald-950/30 p-2 text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
          <span>✓</span>
          <span>{t.landmarks.allPlaced}</span>
        </div>
      )}

      {/* Current step hint */}
      {!allPlaced && nextUnplaced && candidateCount === 0 && (
        <div className="mb-3.5 rounded-xl border border-cyan-900/60 bg-slate-800/60 p-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
            {t.landmarks.stepOf(currentStep + 1)}
          </div>
          <div className="text-xs font-bold text-slate-100 mt-0.5">
            {t.landmarks.definitions[nextUnplaced.name].fullName} ({nextUnplaced.label})
          </div>
          <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            {t.landmarks.definitions[nextUnplaced.name].hint}
          </div>
          <button
            onClick={() => setActiveLandmark(nextUnplaced.name)}
            type="button"
            className="mt-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:underline inline-flex items-center gap-1"
          >
            {t.landmarks.clickToPlace}
          </button>
        </div>
      )}

      {/* Active placement indicator */}
      {activeLandmark && (
        <div className="mb-3.5 rounded-xl border border-orange-500/70 bg-orange-950/40 p-3">
          <div className="text-xs font-bold text-orange-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
            <span>{t.landmarks.placing(t.landmarks.definitions[activeLandmark].fullName)}</span>
          </div>
          <div className="text-[11px] text-orange-200/80 mt-1">
            {t.landmarks.definitions[activeLandmark].hint}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 italic">
            {t.landmarks.clickOnRadiograph}
          </div>
          <button
            onClick={() => setActiveLandmark(null)}
            type="button"
            className="mt-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:underline"
          >
            {t.landmarks.cancelEsc}
          </button>
        </div>
      )}

      {/* Landmark list */}
      <div className="space-y-1.5">
        {LANDMARK_DEFINITIONS.map((def) => {
          const isPlaced = !!landmarks[def.name];
          const isCandidate = !!aiCandidateLandmarks[def.name];
          const isActive = activeLandmark === def.name;
          const meta = t.landmarks.definitions[def.name];

          return (
            <div
              key={def.name}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-all ${
                isActive
                  ? "border border-orange-500/70 bg-orange-950/40 text-orange-100"
                  : isCandidate
                  ? "border border-amber-500/40 bg-amber-950/30 text-amber-200"
                  : isPlaced
                  ? "border border-slate-700/60 bg-slate-800/60 text-slate-200"
                  : "border border-slate-800/40 bg-slate-900/40 text-slate-400"
              }`}
            >
              <span
                className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
                  def.side === "right"
                    ? "bg-blue-400 shadow-xs shadow-blue-500/50"
                    : def.side === "left"
                    ? "bg-emerald-400 shadow-xs shadow-emerald-500/50"
                    : "bg-amber-400 shadow-xs shadow-amber-500/50"
                }`}
              />
              <button
                onClick={() => setActiveLandmark(isActive ? null : def.name)}
                type="button"
                className="flex-1 text-left font-medium hover:text-slate-100 truncate"
              >
                <span className="font-bold text-slate-200 mr-1">{def.label}</span>
                <span className="text-slate-400">— {meta.fullName}</span>
              </button>

              {isPlaced ? (
                <div className="flex items-center gap-1.5">
                  {isCandidate ? (
                    <span className="rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 text-[10px] font-bold">
                      AI
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-bold text-xs">✓</span>
                  )}
                  <button
                    onClick={() => deleteLandmark(def.name as LandmarkName)}
                    type="button"
                    className="text-slate-500 hover:text-rose-400 text-xs px-1 transition-colors"
                    title={t.viewer.deleteLandmark}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <span className="text-slate-600 text-xs font-mono">—</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}