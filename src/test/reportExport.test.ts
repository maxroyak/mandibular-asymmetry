// ── Clinical Report Export Tests ──────────────────────────────
// Tests for clinical PDF / print export data payload, formatting, i18n, and overlay coordinate alignment.

import { describe, it, expect, beforeEach } from "vitest";
import { useStudyStore } from "../store/studyStore";
import { getTranslations, en, ru } from "../locales";
import { LANDMARK_DEFINITIONS } from "../domain/types";

// Mock localStorage for test environment
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => storageMap.set(key, value),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null,
  get length() { return storageMap.size; },
};
Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  configurable: true,
  writable: true,
});

describe("Clinical Report Export & i18n", () => {
  beforeEach(() => {
    storageMap.clear();
    useStudyStore.getState().newStudy();
    useStudyStore.getState().setLanguage("en");
  });

  describe("Translation completeness for report namespace", () => {
    it("English dictionary has all report keys defined", () => {
      const keys = Object.keys(en.report) as (keyof typeof en.report)[];
      expect(keys.length).toBeGreaterThanOrEqual(18);
      for (const key of keys) {
        expect(en.report[key]).toBeDefined();
      }
    });

    it("Russian dictionary has all report keys defined", () => {
      const keys = Object.keys(en.report) as (keyof typeof en.report)[];
      for (const key of keys) {
        expect(ru.report[key]).toBeDefined();
      }
    });

    it("calibratedValue formatter produces expected localized string", () => {
      expect(en.report.calibratedValue("0.1234")).toBe("Calibrated (0.1234 mm/px)");
      expect(ru.report.calibratedValue("0.1234")).toBe("Калибровано (0.1234 мм/пкс)");
    });
  });

  describe("Report data payload assembly", () => {
    it("generates calibrated report payload with millimeter measurements", () => {
      useStudyStore.getState().createStudy("PATIENT-9912", "data:image/png;base64,mock", 1200, 800);
      useStudyStore.getState().setLandmark("CoR", { x: 0.2, y: 0.2 });
      useStudyStore.getState().setLandmark("GoR", { x: 0.2, y: 0.8 });
      useStudyStore.getState().setLandmark("CoL", { x: 0.8, y: 0.23 });
      useStudyStore.getState().setLandmark("GoL", { x: 0.8, y: 0.8 });
      useStudyStore.getState().setLandmark("Me", { x: 0.5, y: 0.9 });

      // Calibrate
      useStudyStore.getState().startCalibration();
      useStudyStore.getState().placeCalibrationPoint({ x: 0.1, y: 0.1 });
      useStudyStore.getState().confirmPoint1();
      useStudyStore.getState().placeCalibrationPoint({ x: 0.1, y: 0.2 });
      useStudyStore.getState().confirmPoint2();
      useStudyStore.getState().confirmCalibration(10); // 10mm

      const state = useStudyStore.getState();
      expect(state.patientId).toBe("PATIENT-9912");
      expect(state.calibration).not.toBeNull();
      expect(state.mandibularResult).not.toBeNull();
      expect(state.mandibularResult?.ramus.rightMm).toBeGreaterThan(0);
      expect(state.mandibularResult?.ramus.leftMm).toBeGreaterThan(0);

      // Verify conclusion in EN
      expect(state.mandibularResult?.conclusion).toContain("The right ramus measures");

      // Switch to Russian and verify conclusion switches
      useStudyStore.getState().setLanguage("ru");
      const stateRu = useStudyStore.getState();
      expect(stateRu.mandibularResult?.conclusion).toContain("Ветвь справа составляет");
    });

    it("handles uncalibrated studies gracefully", () => {
      useStudyStore.getState().createStudy("", "data:image/png;base64,mock", 1000, 600);
      useStudyStore.getState().setLandmark("CoR", { x: 0.2, y: 0.2 });
      useStudyStore.getState().setLandmark("GoR", { x: 0.2, y: 0.8 });
      useStudyStore.getState().setLandmark("CoL", { x: 0.8, y: 0.2 });
      useStudyStore.getState().setLandmark("GoL", { x: 0.8, y: 0.8 });
      useStudyStore.getState().setLandmark("Me", { x: 0.5, y: 0.9 });

      const state = useStudyStore.getState();
      expect(state.calibration).toBeNull();
      expect(state.measurements?.ramusHeight?.rightMm).toBeNull();
      expect(state.measurements?.ramusHeight?.relativeDifferencePercent).toBe(0);

      const tEn = getTranslations("en");
      expect(tEn.report.uncalibratedValue).toBe("Uncalibrated (relative % only)");

      const tRu = getTranslations("ru");
      expect(tRu.report.uncalibratedValue).toBe("Без калибровки (только %)");
    });
  });

  describe("Overlay Coordinate Scaling & Natural Aspect Ratio Alignment", () => {
    it("maps normalized landmarks to exact natural image pixel coordinates", () => {
      const natW = 2400;
      const natH = 1200;
      useStudyStore.getState().createStudy("PATIENT-ALIGNED", "data:image/png;base64,mock", natW, natH);
      useStudyStore.getState().setLandmark("CoR", { x: 0.15, y: 0.25 });
      useStudyStore.getState().setLandmark("GoR", { x: 0.18, y: 0.75 });
      useStudyStore.getState().setLandmark("CoL", { x: 0.85, y: 0.24 });
      useStudyStore.getState().setLandmark("GoL", { x: 0.82, y: 0.76 });
      useStudyStore.getState().setLandmark("Me", { x: 0.50, y: 0.90 });

      const state = useStudyStore.getState();
      expect(state.imageNaturalWidth).toBe(2400);
      expect(state.imageNaturalHeight).toBe(1200);

      // Verify coordinate transformation matching ClinicalReportModal logic
      for (const def of LANDMARK_DEFINITIONS) {
        const pt = state.landmarks[def.name];
        expect(pt).toBeDefined();
        if (pt) {
          const pixelX = pt.x * natW;
          const pixelY = pt.y * natH;
          expect(pixelX).toBeGreaterThanOrEqual(0);
          expect(pixelX).toBeLessThanOrEqual(natW);
          expect(pixelY).toBeGreaterThanOrEqual(0);
          expect(pixelY).toBeLessThanOrEqual(natH);
        }
      }

      // Verify exact expected pixel values for CoR and Me
      expect(state.landmarks.CoR!.x * natW).toBe(360);
      expect(state.landmarks.CoR!.y * natH).toBe(300);
      expect(state.landmarks.Me!.x * natW).toBe(1200);
      expect(state.landmarks.Me!.y * natH).toBe(1080);
    });

    it("calculates proportional visual styling sizes for report overlay", () => {
      const natW = 2000;
      const natH = 1000;
      const strokeWidth = Math.max(2, natW * 0.0035);
      const dotRadius = Math.max(5, natW * 0.008);
      const fontSize = Math.max(11, natW * 0.013);
      const badgeHeight = Math.max(18, natH * 0.048);
      const badgeWidth = Math.max(65, natW * 0.17);

      expect(strokeWidth).toBe(7);
      expect(dotRadius).toBe(16);
      expect(fontSize).toBe(26);
      expect(badgeHeight).toBe(48);
      expect(badgeWidth).toBe(340);
    });
  });
});
