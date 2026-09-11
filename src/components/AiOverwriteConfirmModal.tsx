// ── Shared AI Overwrite Confirmation Modal ───────────────────
// Accessible modal dialog confirming replacement of user landmarks with AI proposals.

import React from "react";
import { useStudyStore } from "../store/studyStore";
import { getTranslations } from "../locales";

interface AiOverwriteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const AiOverwriteConfirmModal: React.FC<AiOverwriteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const language = useStudyStore((s) => s.language);
  const t = getTranslations(language);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-overwrite-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-lg" aria-hidden="true">
            🪄
          </div>
          <div>
            <h3 id="ai-overwrite-title" className="text-base font-semibold text-gray-900">
              {t.ai.confirmOverwriteTitle}
            </h3>
            <p className="mt-1 text-xs text-gray-500 leading-relaxed">
              {t.ai.confirmOverwriteMessage}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onConfirm();
            }}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer"
          >
            {t.ai.confirmOverwriteAction}
          </button>
        </div>
      </div>
    </div>
  );
};
