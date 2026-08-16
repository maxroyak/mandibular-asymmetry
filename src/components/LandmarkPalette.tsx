// ── Landmark Palette ────────────────────────────────────────
// Sequential guided landmark placement with anatomical hints.

import { useStudyStore } from "../store/studyStore";
import { LANDMARK_DEFINITIONS } from "../domain/types";
import type { LandmarkName } from "../domain/types";
import { getTranslations } from "../locales";

export function LandmarkPalette() {
  const language = useStudyStore((s) => s.language);
  const landmarks = useStudyStore((s) => s.landmarks);
  const activeLandmark = useStudyStore((s) => s.activeLandmark);
  const setActiveLandmark = useStudyStore((s) => s.setActiveLandmark);
  const deleteLandmark = useStudyStore((s) => s.deleteLandmark);

  const t = getTranslations(language);

  const placedCount = LANDMARK_DEFINITIONS.filter(
    (l) => landmarks[l.name]
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

      {/* Progress indicator */}
      <div className="mb-3 flex gap-1">
        {LANDMARK_DEFINITIONS.map((def, idx) => (
          <div
            key={def.name}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              landmarks[def.name]
                ? "bg-green-500"
                : idx === currentStep
                ? "bg-orange-400"
                : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {/* Compact summary when all placed */}
      {allPlaced && !activeLandmark && (
        <div className="mb-2 text-sm text-green-600 font-medium">
          {t.landmarks.allPlaced}
        </div>
      )}

      {/* Current step hint */}
      {!allPlaced && nextUnplaced && (
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
          const isActive = activeLandmark === def.name;
          const meta = t.landmarks.definitions[def.name];
          return (
            <div
              key={def.name}
              className={`flex items-center gap-2 rounded px-2 py-1 text-xs ${
                isActive
                  ? "bg-orange-100 border border-orange-300"
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
                  <span className="text-green-600 text-xs">✓</span>
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