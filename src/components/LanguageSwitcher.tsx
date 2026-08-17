// ── Language Switcher ─────────────────────────────────────────
// Compact segmented UI control for toggling between English (EN) and Russian (RU).

import { useStudyStore } from "../store/studyStore";
import type { Locale } from "../locales/types";

export function LanguageSwitcher() {
  const language = useStudyStore((s) => s.language);
  const setLanguage = useStudyStore((s) => s.setLanguage);

  const languages: { code: Locale; label: string }[] = [
    { code: "en", label: "EN" },
    { code: "ru", label: "RU" },
  ];

  return (
    <div
      role="group"
      aria-label="Language selector"
      className="inline-flex items-center rounded-lg border border-slate-700/80 bg-slate-800 p-0.5 text-xs shadow-xs"
    >
      {languages.map((lang) => {
        const isActive = language === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => setLanguage(lang.code)}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
              isActive
                ? "bg-cyan-600 text-white shadow-xs"
                : "text-slate-400 hover:bg-slate-700/70 hover:text-slate-200"
            }`}
            aria-pressed={isActive}
          >
            {lang.label}
          </button>
        );
      })}
    </div>
  );
}

