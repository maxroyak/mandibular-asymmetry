import { useStudyStore } from "../store/studyStore";
import { getTranslations } from "../locales";
import { isFilterActive, FILTER_BOUNDS } from "../domain/imageFilters";
import type { FilterPresetType } from "../domain/types";

interface ImageFiltersToolbarProps {
  className?: string;
}

export function ImageFiltersToolbar({ className = "" }: ImageFiltersToolbarProps) {
  const language = useStudyStore((s) => s.language);
  const filters = useStudyStore((s) => s.filters);
  const setImageFilters = useStudyStore((s) => s.setImageFilters);
  const resetImageFilters = useStudyStore((s) => s.resetImageFilters);
  const setFilterPreset = useStudyStore((s) => s.setFilterPreset);

  const t = getTranslations(language);
  const active = isFilterActive(filters);

  // Preset button config
  const presets: { id: FilterPresetType; label: string; icon: string; title: string }[] = [
    {
      id: "default",
      label: t.filters.presetDefault,
      icon: "⚪",
      title: t.filters.presetDefault,
    },
    {
      id: "bone-enhanced",
      label: t.filters.presetBoneEnhanced,
      icon: "🦴",
      title: t.filters.presetBoneEnhanced,
    },
    {
      id: "high-contrast",
      label: t.filters.presetHighContrast,
      icon: "◐",
      title: t.filters.presetHighContrast,
    },
    {
      id: "inverted",
      label: t.filters.presetInverted,
      icon: "🌓",
      title: t.filters.presetInverted,
    },
  ];

  // Active filter count for badge
  const activeCount = [
    filters.brightness !== 100,
    filters.contrast !== 100,
    filters.invert,
    filters.sharpen,
    filters.gamma !== 1.0,
  ].filter(Boolean).length;

  return (
    <div
      className={`flex flex-col gap-3 p-3 bg-slate-900/95 text-slate-100 rounded-lg shadow-xl border border-slate-700/80 backdrop-blur-sm select-none ${className}`}
      role="region"
      aria-label={t.filters.title}
    >
      {/* Header / Preset Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-700/60 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            {t.filters.title}
          </span>
          {active && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40"
              title={t.filters.activeFiltersBadge(activeCount)}
            >
              {activeCount}
            </span>
          )}
        </div>

        {/* Reset Button */}
        <button
          onClick={resetImageFilters}
          disabled={!active}
          className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
            active
              ? "text-rose-300 hover:text-rose-100 hover:bg-rose-900/40 border border-rose-500/40 cursor-pointer"
              : "text-slate-500 border border-transparent cursor-not-allowed opacity-50"
          }`}
          title={t.filters.resetFilters}
          aria-label={t.filters.resetFilters}
        >
          ↺ {t.filters.resetFilters}
        </button>
      </div>

      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-[11px] text-slate-400 font-medium mr-1">
          {t.filters.presetsTitle}:
        </span>
        {presets.map((p) => {
          const isSelected = filters.preset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setFilterPreset(p.id)}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-all inline-flex items-center gap-1.5 ${
                isSelected
                  ? "bg-blue-600 text-white shadow-sm border border-blue-400 font-semibold"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600/70"
              }`}
              title={p.title}
            >
              <span>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Brightness Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-xs">
            <label htmlFor="filter-brightness" className="text-slate-300 font-medium">
              ☀ {t.filters.brightness}
            </label>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
              {filters.brightness}%
            </span>
          </div>
          <input
            id="filter-brightness"
            type="range"
            min={FILTER_BOUNDS.brightness.min}
            max={FILTER_BOUNDS.brightness.max}
            step={FILTER_BOUNDS.brightness.step}
            value={filters.brightness}
            onChange={(e) => setImageFilters({ brightness: parseInt(e.target.value, 10) })}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* Contrast Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-xs">
            <label htmlFor="filter-contrast" className="text-slate-300 font-medium">
              ◐ {t.filters.contrast}
            </label>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
              {filters.contrast}%
            </span>
          </div>
          <input
            id="filter-contrast"
            type="range"
            min={FILTER_BOUNDS.contrast.min}
            max={FILTER_BOUNDS.contrast.max}
            step={FILTER_BOUNDS.contrast.step}
            value={filters.contrast}
            onChange={(e) => setImageFilters({ contrast: parseInt(e.target.value, 10) })}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* Gamma Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-xs">
            <label htmlFor="filter-gamma" className="text-slate-300 font-medium">
              γ {t.filters.gamma}
            </label>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
              {filters.gamma.toFixed(2)}
            </span>
          </div>
          <input
            id="filter-gamma"
            type="range"
            min={FILTER_BOUNDS.gamma.min}
            max={FILTER_BOUNDS.gamma.max}
            step={FILTER_BOUNDS.gamma.step}
            value={filters.gamma}
            onChange={(e) => setImageFilters({ gamma: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* Invert & Sharpen Toggles */}
        <div className="flex items-center gap-2 pt-2">
          {/* Invert Toggle */}
          <button
            type="button"
            onClick={() => setImageFilters({ invert: !filters.invert })}
            className={`flex-1 py-1.5 px-2 text-xs rounded font-medium border flex items-center justify-center gap-1.5 transition-all ${
              filters.invert
                ? "bg-amber-600/30 text-amber-200 border-amber-400 shadow-sm font-semibold"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600"
            }`}
            title={t.filters.invert}
            aria-pressed={filters.invert}
          >
            <span>🌓</span>
            <span>{t.filters.invertShort}</span>
          </button>

          {/* Sharpen Toggle */}
          <button
            type="button"
            onClick={() => setImageFilters({ sharpen: !filters.sharpen })}
            className={`flex-1 py-1.5 px-2 text-xs rounded font-medium border flex items-center justify-center gap-1.5 transition-all ${
              filters.sharpen
                ? "bg-emerald-600/30 text-emerald-200 border-emerald-400 shadow-sm font-semibold"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600"
            }`}
            title={t.filters.sharpen}
            aria-pressed={filters.sharpen}
          >
            <span>⚡</span>
            <span>{t.filters.sharpenShort}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
