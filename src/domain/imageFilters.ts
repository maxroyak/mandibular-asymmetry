// ── Radiograph Image Enhancement & Filter Suite (Domain Layer) ─────────
// Pure functions for clinical radiograph visualization and edge enhancement.
// Zero React imports, zero side effects.

import type { FilterPresetType, ImageFilterState } from "./types";

/** Constant slider bounds and steps for clinical image enhancement controls */
export const FILTER_BOUNDS = {
  brightness: { min: 50, max: 150, default: 100, step: 1 },
  contrast: { min: 50, max: 200, default: 100, step: 1 },
  gamma: { min: 0.5, max: 2.0, default: 1.0, step: 0.05 },
} as const;

/**
 * Creates the default initial image filter state.
 */
export function createDefaultFilters(): ImageFilterState {
  return {
    brightness: 100,
    contrast: 100,
    invert: false,
    sharpen: false,
    gamma: 1.0,
    preset: "default",
  };
}

/**
 * Preset configurations tailored for orthodontic and maxillofacial radiograph inspection:
 * - default: unmodified radiograph
 * - bone-enhanced: higher contrast with edge sharpening and slight gamma boost for cortical margins (condyle, gonion)
 * - high-contrast: aggressive contrast separation for dense structures vs soft tissue/air
 * - inverted: grayscale negative view to highlight subtle bone trabeculae and thin cortical outlines
 * - custom: user-adjusted filter values
 */
export const FILTER_PRESETS: Record<FilterPresetType, ImageFilterState> = {
  default: {
    brightness: 100,
    contrast: 100,
    invert: false,
    sharpen: false,
    gamma: 1.0,
    preset: "default",
  },
  "bone-enhanced": {
    brightness: 110,
    contrast: 145,
    invert: false,
    sharpen: true,
    gamma: 1.1,
    preset: "bone-enhanced",
  },
  "high-contrast": {
    brightness: 95,
    contrast: 160,
    invert: false,
    sharpen: false,
    gamma: 1.0,
    preset: "high-contrast",
  },
  inverted: {
    brightness: 100,
    contrast: 115,
    invert: true,
    sharpen: false,
    gamma: 1.0,
    preset: "inverted",
  },
  custom: {
    brightness: 100,
    contrast: 100,
    invert: false,
    sharpen: false,
    gamma: 1.0,
    preset: "custom",
  },
};

/**
 * Returns a new filter state matching the requested preset.
 */
export function applyFilterPreset(preset: FilterPresetType): ImageFilterState {
  const target = FILTER_PRESETS[preset] ?? FILTER_PRESETS.default;
  return { ...target };
}

/**
 * Builds the CSS filter string applied to the underlying radiograph layer.
 * Includes brightness, contrast, inversion, and SVG convolution sharpening.
 */
export function buildCssFilterString(filters: ImageFilterState): string {
  const parts: string[] = [];

  if (filters.invert) {
    parts.push("invert(100%)");
  }

  parts.push(`brightness(${filters.brightness}%)`);
  parts.push(`contrast(${filters.contrast}%)`);

  if (filters.sharpen) {
    parts.push("url(#radiograph-sharpen)");
  }

  return parts.join(" ");
}

/**
 * Returns true if any filter value differs from the default baseline.
 */
export function isFilterActive(filters: ImageFilterState): boolean {
  return (
    filters.brightness !== 100 ||
    filters.contrast !== 100 ||
    filters.invert !== false ||
    filters.sharpen !== false ||
    filters.gamma !== 1.0 ||
    filters.preset !== "default"
  );
}
