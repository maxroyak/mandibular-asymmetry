// ── Study Manager ───────────────────────────────────────────
// Step 4: Manage saved studies, patient metadata, and history.
// Uses localStorage (metadata) + IndexedDB (images) persistence.

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
  const patientId = useStudyStore((s) => s.patientId);
  const refreshStudyList = useStudyStore((s) => s.refreshStudyList);
  const getPersistenceError = useStudyStore((s) => s.getPersistenceError);
  const clearPersistenceError = useStudyStore((s) => s.clearPersistenceError);

  const t = getTranslations(language);

  const [showPatientInput, setShowPatientInput] = useState(false);
  const [localPatientId, setLocalPatientId] = useState(patientId);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check for persistence errors after save operations
  useEffect(() => {
    const err = getPersistenceError();
    if (err) {
      setPersistenceError(err);
      clearPersistenceError();
    }
  }, [isSaved, getPersistenceError, clearPersistenceError]);

  useEffect(() => {
    refreshStudyList();
  }, [refreshStudyList]);

  const handleLoad = async (id: string) => {
    setIsLoading(true);
    try {
      await loadStudy(id);
    } catch {
      setPersistenceError(t.studyManager.loadFailedError);
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm(t.studyManager.deleteStudyConfirm)) {
      await deleteStudy(id);
    }
  };

  return (
    <div className="p-4 select-none">
      {/* Persistence error banner */}
      {persistenceError && (
        <div className="mb-3 rounded-xl border border-rose-800/60 bg-rose-950/40 p-3 text-xs text-rose-300">
          <div className="flex items-start justify-between gap-2">
            <span>⚠ {persistenceError}</span>
            <button
              onClick={() => setPersistenceError(null)}
              className="text-rose-400 hover:text-rose-200 shrink-0 font-bold"
              title={t.common.close}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="mb-3 rounded-lg bg-cyan-950/40 border border-cyan-800/60 p-2.5 text-xs text-cyan-300 flex items-center gap-2">
          <span className="animate-spin">⏳</span>
          <span>{t.studyManager.loadingStudy}</span>
        </div>
      )}

      {/* Current Study Status */}
      <div className="mb-3.5 flex items-center justify-between rounded-xl bg-slate-800/60 border border-slate-700/60 p-3 text-xs">
        <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
          {t.studyManager.title ?? "Study Status"}
        </span>
        {isSaved ? (
          <span className="font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-md">
            ✓ {t.studyManager.saved}
          </span>
        ) : studyId ? (
          <span className="font-semibold text-amber-300 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-md flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>{t.studyManager.unsavedChanges}</span>
          </span>
        ) : (
          <span className="text-slate-500 font-mono">{t.studyManager.noStudy}</span>
        )}
      </div>

      {/* Patient ID Edit */}
      <div className="mb-4 rounded-xl border border-slate-800 bg-slate-800/40 p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          {t.studyManager.patient}
        </div>
        {showPatientInput ? (
          <div className="flex gap-1.5">
            <input
              type="text"
              value={localPatientId}
              onChange={(e) => setLocalPatientId(e.target.value)}
              placeholder={t.studyManager.patientIdPlaceholder}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-mono text-slate-100 focus:border-cyan-500 focus:outline-none"
              autoFocus
            />
            <button
              onClick={() => {
                useStudyStore.setState({ patientId: localPatientId, isSaved: false });
                setShowPatientInput(false);
              }}
              className="rounded-lg bg-cyan-600 px-3 py-1 text-xs font-semibold text-white hover:bg-cyan-500 transition-colors"
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
            className="w-full flex items-center justify-between rounded-lg bg-slate-900/60 border border-slate-700/60 px-2.5 py-1.5 text-xs text-slate-200 hover:border-slate-600 transition-colors text-left"
          >
            <span className="font-mono font-medium truncate">
              {patientId || t.studyManager.unassigned}
            </span>
            <span className="text-slate-400 text-[11px] ml-2">✎ Edit</span>
          </button>
        )}
      </div>

      {/* Saved Studies History List */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {t.studyManager.savedStudiesCount(studyList.length)}
          </h4>
          <button
            onClick={() => refreshStudyList()}
            type="button"
            className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium"
          >
            ↻ Refresh
          </button>
        </div>

        {studyList.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-center text-xs text-slate-500">
            No saved studies found.
          </div>
        ) : (
          <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {studyList.map((study: StoredStudy) => {
              const isCurrent = study.studyId === studyId;
              return (
                <div
                  key={study.studyId}
                  className={`flex items-center justify-between rounded-xl p-2.5 text-xs transition-all ${
                    isCurrent
                      ? "bg-cyan-950/40 border border-cyan-700/60 text-cyan-100"
                      : "bg-slate-800/60 border border-slate-700/60 text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  <button
                    onClick={() => handleLoad(study.studyId)}
                    type="button"
                    className="flex-1 text-left min-w-0 pr-2"
                  >
                    <div className="font-bold truncate text-slate-100">
                      {study.patientId || t.studyManager.unassigned}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(study.updatedAt).toLocaleString()}
                    </div>
                  </button>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleLoad(study.studyId)}
                      type="button"
                      className="rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-1 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-950/60 hover:border-cyan-500/60 transition-colors"
                    >
                      {t.studyManager.loadStudy}
                    </button>
                    <button
                      onClick={() => handleDelete(study.studyId)}
                      type="button"
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                      title={t.common.delete}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Local persistence disclaimer */}
      <div className="mt-4 border-t border-slate-800/80 pt-3">
        <p className="text-[10px] leading-relaxed text-slate-500">
          🔒 {t.studyManager.localPersistenceNote}
        </p>
      </div>
    </div>
  );
}