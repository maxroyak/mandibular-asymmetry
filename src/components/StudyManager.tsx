// ── Study Manager ───────────────────────────────────────────
// Save, load, new, delete studies. Uses localStorage (metadata) +
// IndexedDB (images) persistence with bulk "Clear All" support.

import { useState, useEffect } from "react";
import { useStudyStore } from "../store/studyStore";
import type { StoredStudy } from "../persistence/studyRepository";
import { getTranslations } from "../locales";

export function StudyManager() {
  const language = useStudyStore((s) => s.language);
  const studyId = useStudyStore((s) => s.studyId);
  const isSaved = useStudyStore((s) => s.isSaved);
  const studyList = useStudyStore((s) => s.studyList);
  const loadStudy = useStudyStore((s) => s.loadStudy);
  const deleteStudy = useStudyStore((s) => s.deleteStudy);
  const clearAllStudies = useStudyStore((s) => s.clearAllStudies);
  const patientId = useStudyStore((s) => s.patientId);
  const refreshStudyList = useStudyStore((s) => s.refreshStudyList);
  const getPersistenceError = useStudyStore((s) => s.getPersistenceError);
  const clearPersistenceError = useStudyStore((s) => s.clearPersistenceError);

  const t = getTranslations(language);

  const [showList, setShowList] = useState(false);
  const [showPatientInput, setShowPatientInput] = useState(false);
  const [localPatientId, setLocalPatientId] = useState(patientId);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  // Check for persistence errors after save operations
  useEffect(() => {
    const err = getPersistenceError();
    if (err) {
      setPersistenceError(err);
      clearPersistenceError();
    }
  }, [isSaved, getPersistenceError, clearPersistenceError]);

  const handleLoad = async (id: string) => {
    setIsLoading(true);
    try {
      await loadStudy(id);
    } catch {
      setPersistenceError(t.studyManager.loadFailedError);
    }
    setIsLoading(false);
    setShowList(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm(t.studyManager.deleteStudyConfirm)) {
      await deleteStudy(id);
    }
  };

  const handleConfirmClearAll = async () => {
    setIsLoading(true);
    try {
      await clearAllStudies();
      setShowClearAllModal(false);
      setShowList(false);
    } catch {
      setPersistenceError(t.studyManager.loadFailedError);
    }
    setIsLoading(false);
  };

  return (
    <div className="border-t border-gray-200 p-4">
      {/* Persistence error banner */}
      {persistenceError && (
        <div className="mb-2 rounded bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          <div className="flex items-start justify-between gap-2">
            <span>⚠ {persistenceError}</span>
            <button
              onClick={() => setPersistenceError(null)}
              className="text-red-400 hover:text-red-600 shrink-0"
              title={t.common.close}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="mb-2 text-xs text-blue-600">{t.studyManager.loadingStudy}</div>
      )}

      {/* Save status badge */}
      <div className="mb-3 flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-xs">
        <span className="text-gray-500 font-medium">{t.studyManager.title ?? "Study Status"}</span>
        {isSaved ? (
          <span className="font-semibold text-green-600">✓ {t.studyManager.saved}</span>
        ) : studyId ? (
          <span className="font-semibold text-amber-600">● {t.studyManager.unsavedChanges}</span>
        ) : (
          <span className="text-gray-400">{t.studyManager.noStudy}</span>
        )}
      </div>

      {/* Patient ID */}
      <div className="mb-2">
        {showPatientInput ? (
          <div className="flex gap-1">
            <input
              type="text"
              value={localPatientId}
              onChange={(e) => setLocalPatientId(e.target.value)}
              placeholder={t.studyManager.patientIdPlaceholder}
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
            />
            <button
              onClick={() => {
                useStudyStore.setState({ patientId: localPatientId });
                setShowPatientInput(false);
              }}
              className="rounded bg-gray-200 px-2 py-1 text-xs"
            >
              {t.common.ok}
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setLocalPatientId(patientId);
              setShowPatientInput(true);
            }}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {t.studyManager.patient} {patientId || t.studyManager.unassigned} ✎
          </button>
        )}
      </div>

      {/* Saved studies toggle & Clear All Action */}
      {studyList.length > 0 && (
        <div>
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                refreshStudyList();
                setShowList(!showList);
              }}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              {showList ? "▼" : "▶"} {t.studyManager.savedStudiesCount(studyList.length)}
            </button>

            {/* Clear All Studies Button */}
            <button
              onClick={() => setShowClearAllModal(true)}
              className="text-[11px] font-medium text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 transition-colors"
              title={t.studyManager.clearAll}
            >
              <span>🗑️</span>
              <span>{t.studyManager.clearAll}</span>
            </button>
          </div>

          {showList && (
            <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
              {studyList.map((study: StoredStudy) => (
                <div
                  key={study.studyId}
                  className={`flex items-center justify-between rounded px-2 py-1 text-xs ${
                    study.studyId === studyId
                      ? "bg-blue-100 border border-blue-200"
                      : "bg-gray-50"
                  }`}
                >
                  <button
                    onClick={() => handleLoad(study.studyId)}
                    className="flex-1 text-left"
                  >
                    <span className="font-medium">
                      {study.patientId || t.studyManager.unassigned}
                    </span>
                    <span className="text-gray-400 ml-2">
                      {new Date(study.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDelete(study.studyId)}
                    className="text-red-400 hover:text-red-600 ml-1"
                    title={t.common.delete}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Local persistence note */}
      <div className="mt-3 border-t border-gray-100 pt-2">
        <p className="text-[10px] leading-tight text-gray-400">
          {t.studyManager.localPersistenceNote}
        </p>
      </div>

      {/* Clear All Confirmation Modal */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-red-600 mb-2">
              <span className="text-xl">🗑️</span>
              <h3 className="font-bold text-gray-900 text-sm">
                {t.studyManager.clearAllConfirmTitle}
              </h3>
            </div>
            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              {t.studyManager.clearAllConfirmMessage}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-xs transition-colors"
              >
                {t.studyManager.clearAllConfirmAction}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}