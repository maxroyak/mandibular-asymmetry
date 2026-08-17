import { describe, it, expect } from "vitest";
import {
  createDefaultFilters,
  applyFilterPreset,
  buildCssFilterString,
  isFilterActive,
  FILTER_PRESETS,
  FILTER_BOUNDS,
} from "./imageFilters";
import type { ImageFilterState, FilterPresetType } from "./types";

describe("domain/imageFilters — pure domain functions", () => {
  describe("createDefaultFilters", () => {
    it("returns standard baseline filter state", () => {
      const filters = createDefaultFilters();
      expect(filters).toEqual({
        brightness: 100,
        contrast: 100,
        invert: false,
        sharpen: false,
        gamma: 1.0,
        preset: "default",
      });
    });
  });

  describe("applyFilterPreset", () => {
    it("applies 'default' preset", () => {
      const filters = applyFilterPreset("default");
      expect(filters.preset).toBe("default");
      expect(filters.brightness).toBe(100);
      expect(filters.contrast).toBe(100);
      expect(filters.invert).toBe(false);
      expect(filters.sharpen).toBe(false);
      expect(filters.gamma).toBe(1.0);
    });

    it("applies 'bone-enhanced' preset with sharpen enabled and high contrast", () => {
      const filters = applyFilterPreset("bone-enhanced");
      expect(filters.preset).toBe("bone-enhanced");
      expect(filters.sharpen).toBe(true);
      expect(filters.contrast).toBeGreaterThan(100);
      expect(filters.invert).toBe(false);
    });

    it("applies 'high-contrast' preset", () => {
      const filters = applyFilterPreset("high-contrast");
      expect(filters.preset).toBe("high-contrast");
      expect(filters.contrast).toBeGreaterThanOrEqual(150);
      expect(filters.invert).toBe(false);
    });

    it("applies 'inverted' preset with invert=true", () => {
      const filters = applyFilterPreset("inverted");
      expect(filters.preset).toBe("inverted");
      expect(filters.invert).toBe(true);
    });

    it("applies 'custom' preset", () => {
      const filters = applyFilterPreset("custom");
      expect(filters.preset).toBe("custom");
    });

    it("falls back to default preset if given an invalid preset key", () => {
      const filters = applyFilterPreset("non-existent" as FilterPresetType);
      expect(filters.preset).toBe("default");
      expect(filters.brightness).toBe(100);
    });
  });

  describe("buildCssFilterString", () => {
    it("builds valid CSS filter string for default filters", () => {
      const filters = createDefaultFilters();
      const css = buildCssFilterString(filters);
      expect(css).toContain("brightness(100%)");
      expect(css).toContain("contrast(100%)");
      expect(css).not.toContain("invert(100%)");
      expect(css).not.toContain("url(#radiograph-sharpen)");
    });

    it("includes invert(100%) when invert is true", () => {
      const filters: ImageFilterState = {
        ...createDefaultFilters(),
        invert: true,
      };
      const css = buildCssFilterString(filters);
      expect(css).toContain("invert(100%)");
      expect(css).toContain("brightness(100%)");
      expect(css).toContain("contrast(100%)");
    });

    it("includes url(#radiograph-sharpen) when sharpen is true", () => {
      const filters: ImageFilterState = {
        ...createDefaultFilters(),
        sharpen: true,
      };
      const css = buildCssFilterString(filters);
      expect(css).toContain("url(#radiograph-sharpen)");
      expect(css).not.toContain("invert(100%)");
    });

    it("formats arbitrary brightness and contrast values accurately", () => {
      const filters: ImageFilterState = {
        brightness: 135,
        contrast: 175,
        invert: true,
        sharpen: true,
        gamma: 1.2,
        preset: "custom",
      };
      const css = buildCssFilterString(filters);
      expect(css).toBe("invert(100%) brightness(135%) contrast(175%) url(#radiograph-sharpen)");
    });
  });

  describe("isFilterActive", () => {
    it("returns false for fresh default filters", () => {
      const filters = createDefaultFilters();
      expect(isFilterActive(filters)).toBe(false);
    });

    it("returns true when brightness is modified", () => {
      const filters = { ...createDefaultFilters(), brightness: 120 };
      expect(isFilterActive(filters)).toBe(true);
    });

    it("returns true when contrast is modified", () => {
      const filters = { ...createDefaultFilters(), contrast: 110 };
      expect(isFilterActive(filters)).toBe(true);
    });

    it("returns true when invert is enabled", () => {
      const filters = { ...createDefaultFilters(), invert: true };
      expect(isFilterActive(filters)).toBe(true);
    });

    it("returns true when sharpen is enabled", () => {
      const filters = { ...createDefaultFilters(), sharpen: true };
      expect(isFilterActive(filters)).toBe(true);
    });

    it("returns true when gamma is modified", () => {
      const filters = { ...createDefaultFilters(), gamma: 1.4 };
      expect(isFilterActive(filters)).toBe(true);
    });

    it("returns true when preset is non-default", () => {
      const filters = { ...createDefaultFilters(), preset: "bone-enhanced" as const };
      expect(isFilterActive(filters)).toBe(true);
    });
  });

  describe("FILTER_BOUNDS and presets integrity", () => {
    it("has valid slider boundaries", () => {
      expect(FILTER_BOUNDS.brightness.min).toBe(50);
      expect(FILTER_BOUNDS.brightness.max).toBe(150);
      expect(FILTER_BOUNDS.contrast.min).toBe(50);
      expect(FILTER_BOUNDS.contrast.max).toBe(200);
      expect(FILTER_BOUNDS.gamma.min).toBe(0.5);
      expect(FILTER_BOUNDS.gamma.max).toBe(2.0);
    });

    it("all predefined presets satisfy the slider boundaries", () => {
      for (const [presetKey, state] of Object.entries(FILTER_PRESETS)) {
        expect(state.brightness).toBeGreaterThanOrEqual(FILTER_BOUNDS.brightness.min);
        expect(state.brightness).toBeLessThanOrEqual(FILTER_BOUNDS.brightness.max);
        expect(state.contrast).toBeGreaterThanOrEqual(FILTER_BOUNDS.contrast.min);
        expect(state.contrast).toBeLessThanOrEqual(FILTER_BOUNDS.contrast.max);
        expect(state.gamma).toBeGreaterThanOrEqual(FILTER_BOUNDS.gamma.min);
        expect(state.gamma).toBeLessThanOrEqual(FILTER_BOUNDS.gamma.max);
        expect(state.preset).toBe(presetKey);
      }
    });
  });
});
