// ── Language Switcher ─────────────────────────────────────────
// Compact UI control for toggling between English (EN) and Russian (RU).

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
      className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs shadow-xs"
    >
      {languages.map((lang) => {
        const isActive = language === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => setLanguage(lang.code)}
            className={`rounded-md px-2.5 py-1 font-medium transition-all ${
              isActive
                ? "bg-blue-600 text-white shadow-xs"
                : "text-gray-600 hover:bg-gray-200/60 hover:text-gray-900"
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
