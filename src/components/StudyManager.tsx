// ── Study Manager ───────────────────────────────────────────
// Save, load, new, delete studies. Uses localStorage persistence.

import { useState } from "react";
import { useStudyStore } from "../store/studyStore";
import type { StoredStudy } from "../persistence/studyRepository";

export function StudyManager() {
  const studyId = useStudyStore((s) => s.studyId);
  const isSaved = useStudyStore((s) => s.isSaved);
  const studyList = useStudyStore((s) => s.studyList);
  const saveStudy = useStudyStore((s) => s.saveStudy);
  const loadStudy = useStudyStore((s) => s.loadStudy);
  const deleteStudy = useStudyStore((s) => s.deleteStudy);
  const newStudy = useStudyStore((s) => s.newStudy);
  const patientId = useStudyStore((s) => s.patientId);
  const refreshStudyList = useStudyStore((s) => s.refreshStudyList);

  const [showList, setShowList] = useState(false);
  const [showPatientInput, setShowPatientInput] = useState(false);
  const [localPatientId, setLocalPatientId] = useState(patientId);

  const handleNew = () => {
    if (!isSaved && studyId) {
      if (!confirm("Discard current study? Unsaved changes will be lost.")) {
        return;
      }
    }
    newStudy();
    setShowList(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this study permanently?")) {
      deleteStudy(id);
    }
  };

  return (
    <div className="border-t border-gray-200 p-4">
      <div className="mb-3 flex gap-2">
        <button
          onClick={() => saveStudy()}
          disabled={!studyId}
          className="flex-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40"
        >
          Save Study
        </button>
        <button
          onClick={handleNew}
          className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
        >
          New Study
        </button>
      </div>

      {/* Save status */}
      <div className="mb-2 text-xs text-gray-500">
        {isSaved ? (
          <span className="text-green-600">✓ Saved</span>
        ) : studyId ? (
          <span className="text-amber-600">● Unsaved changes</span>
        ) : (
          <span>No study</span>
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
              placeholder="Patient ID (optional)"
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
            />
            <button
              onClick={() => {
                useStudyStore.setState({ patientId: localPatientId });
                setShowPatientInput(false);
              }}
              className="rounded bg-gray-200 px-2 py-1 text-xs"
            >
              OK
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
            Patient: {patientId || "(unassigned)"} ✎
          </button>
        )}
      </div>

      {/* Saved studies toggle */}
      {studyList.length > 0 && (
        <div>
          <button
            onClick={() => {
              refreshStudyList();
              setShowList(!showList);
            }}
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            {showList ? "▼" : "▶"} Saved Studies ({studyList.length})
          </button>
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
                    onClick={() => {
                      loadStudy(study.studyId);
                      setShowList(false);
                    }}
                    className="flex-1 text-left"
                  >
                    <span className="font-medium">
                      {study.patientId || "Unassigned"}
                    </span>
                    <span className="text-gray-400 ml-2">
                      {new Date(study.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDelete(study.studyId)}
                    className="text-red-400 hover:text-red-600 ml-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}