// ── Visual E2E Quality Gate & Bounding Box Parity Test ──────────
// Verifies 100% WYSIWYG parity and strict bounding box alignment
// between workspace viewport (ImageViewer) and clinical report preview (ClinicalReportModal).

import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { useStudyStore } from "../store/studyStore";
import { ImageViewer } from "../components/ImageViewer";
import { ClinicalReportModal } from "../components/ClinicalReportModal";
import { RadiographCanvasContainer } from "../components/RadiographCanvasContainer";
import { LANDMARK_DEFINITIONS } from "../domain/types";
import { computeFittedImageRect } from "../domain/coordinateTransform";

// Mock localStorage & ResizeObserver
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

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

describe("Visual E2E Quality Gate: Radiograph Canvas & Overlay Parity", () => {
  const MOCK_IMG_DATA = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const NAT_WIDTH = 2400;
  const NAT_HEIGHT = 1200;

  beforeEach(() => {
    storageMap.clear();
    useStudyStore.getState().newStudy();
    useStudyStore.getState().createStudy("E2E-PATIENT-001", MOCK_IMG_DATA, NAT_WIDTH, NAT_HEIGHT);

    // Set 5 standard anatomical landmarks
    useStudyStore.getState().setLandmark("CoR", { x: 0.15, y: 0.25 });
    useStudyStore.getState().setLandmark("GoR", { x: 0.18, y: 0.75 });
    useStudyStore.getState().setLandmark("CoL", { x: 0.85, y: 0.24 });
    useStudyStore.getState().setLandmark("GoL", { x: 0.82, y: 0.76 });
    useStudyStore.getState().setLandmark("Me", { x: 0.50, y: 0.90 });

    // Set calibration points
    useStudyStore.getState().startCalibration();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.10, y: 0.10 });
    useStudyStore.getState().confirmPoint1();
    useStudyStore.getState().placeCalibrationPoint({ x: 0.10, y: 0.20 });
    useStudyStore.getState().confirmPoint2();
    useStudyStore.getState().confirmCalibration(10); // 10mm
  });

  describe("1. Architectural Constraint Verification (RadiographCanvasContainer)", () => {
    it("enforces zero padding, zero margin, and matching aspect-ratio in aspect mode", () => {
      const { container } = render(
        <RadiographCanvasContainer
          mode="aspect"
          readOnly={true}
          className="test-custom-class"
        />
      );

      const wrapper = container.querySelector('[data-testid="radiograph-canvas-container"]') as HTMLElement;
      expect(wrapper).toBeTruthy();
      expect(wrapper.style.position).toBe("relative");
      expect(wrapper.style.display).toBe("block");
      expect(wrapper.style.width).toBe("100%");
      expect(wrapper.style.aspectRatio).toBe(`${NAT_WIDTH} / ${NAT_HEIGHT}`);
      expect(wrapper.style.padding).toBe("0px");
      expect(wrapper.style.margin).toBe("0px");

      const img = container.querySelector('[data-testid="radiograph-img"]') as HTMLImageElement;
      expect(img).toBeTruthy();
      expect(img.style.objectFit).toBe("fill");
      expect(img.style.width).toBe("100%");
      expect(img.style.height).toBe("100%");

      const svg = container.querySelector("svg.overlay-svg") as SVGSVGElement;
      expect(svg).toBeTruthy();
      expect(svg.getAttribute("viewBox")).toBe("0 0 1 1");
      expect(svg.getAttribute("preserveAspectRatio")).toBe("none");
      expect(svg.style.position).toBe("absolute");
      expect(svg.style.top).toBe("0px");
      expect(svg.style.left).toBe("0px");
      expect(svg.style.width).toBe("100%");
      expect(svg.style.height).toBe("100%");
    });

    it("enforces absolute coordinate alignment in fitted mode", () => {
      const fittedStyle: React.CSSProperties = {
        left: "50px",
        top: "25px",
        width: "800px",
        height: "400px",
        transform: "translate(0px, 0px) scale(1)",
      };

      const { container } = render(
        <RadiographCanvasContainer
          mode="fitted"
          readOnly={false}
          style={fittedStyle}
        />
      );

      const wrapper = container.querySelector('[data-testid="radiograph-canvas-container"]') as HTMLElement;
      expect(wrapper).toBeTruthy();
      expect(wrapper.style.position).toBe("absolute");
      expect(wrapper.style.left).toBe("50px");
      expect(wrapper.style.top).toBe("25px");
      expect(wrapper.style.width).toBe("800px");
      expect(wrapper.style.height).toBe("400px");
    });
  });

  describe("2. Coordinate Parity & E2E Bounding Box Verification", () => {
    it("renders identical landmark coordinate positions in ImageViewer and ClinicalReportModal", () => {
      // Render Workspace ImageViewer
      const { container: viewerContainer } = render(<ImageViewer />);
      const viewerSvg = viewerContainer.querySelector("svg.overlay-svg") as SVGSVGElement;
      expect(viewerSvg).toBeTruthy();

      // Render ClinicalReportModal
      const { container: modalContainer } = render(
        <ClinicalReportModal isOpen={true} onClose={() => {}} />
      );
      const modalSvg = modalContainer.querySelector("svg.overlay-svg") as SVGSVGElement;
      expect(modalSvg).toBeTruthy();

      // Both views must have viewBox="0 0 1 1" and preserveAspectRatio="none"
      expect(viewerSvg.getAttribute("viewBox")).toBe("0 0 1 1");
      expect(modalSvg.getAttribute("viewBox")).toBe("0 0 1 1");
      expect(viewerSvg.getAttribute("preserveAspectRatio")).toBe("none");
      expect(modalSvg.getAttribute("preserveAspectRatio")).toBe("none");

      // Verify all 5 anatomical landmarks have identical normalized coordinates (< 0.0001 delta / < 0.1px drift)
      const landmarks = useStudyStore.getState().landmarks;
      for (const def of LANDMARK_DEFINITIONS) {
        const expectedPt = landmarks[def.name];
        expect(expectedPt).toBeDefined();
        if (!expectedPt) continue;

        // Find landmark circles in both SVGs
        // In ImageViewer (interactive), there are hit area circles and visible marker circles
        const viewerMarkerCircles = viewerContainer.querySelectorAll(`circle[cx="${expectedPt.x}"][cy="${expectedPt.y}"]`);
        expect(viewerMarkerCircles.length).toBeGreaterThanOrEqual(1);

        // In ClinicalReportModal (readOnly), there is the visible marker circle
        const modalMarkerCircles = modalContainer.querySelectorAll(`circle[cx="${expectedPt.x}"][cy="${expectedPt.y}"]`);
        expect(modalMarkerCircles.length).toBeGreaterThanOrEqual(1);

        // Check def.label exists in both
        expect(viewerContainer.textContent).toContain(def.label);
        expect(modalContainer.textContent).toContain(def.label);
      }

      // Verify Calibration P1 & P2 coordinates in both views
      const calPoints = useStudyStore.getState().calibrationPoints;
      expect(calPoints?.point1).toBeDefined();
      expect(calPoints?.point2).toBeDefined();

      if (calPoints?.point1 && calPoints?.point2) {
        const viewerP1 = viewerContainer.querySelectorAll(`circle[cx="${calPoints.point1.x}"][cy="${calPoints.point1.y}"]`);
        const modalP1 = modalContainer.querySelectorAll(`circle[cx="${calPoints.point1.x}"][cy="${calPoints.point1.y}"]`);
        expect(viewerP1.length).toBeGreaterThanOrEqual(1);
        expect(modalP1.length).toBeGreaterThanOrEqual(1);

        const viewerP2 = viewerContainer.querySelectorAll(`circle[cx="${calPoints.point2.x}"][cy="${calPoints.point2.y}"]`);
        const modalP2 = modalContainer.querySelectorAll(`circle[cx="${calPoints.point2.x}"][cy="${calPoints.point2.y}"]`);
        expect(viewerP2.length).toBeGreaterThanOrEqual(1);
        expect(modalP2.length).toBeGreaterThanOrEqual(1);
      }
    });

    it("verifies computeFittedImageRect ensures 0-pixel letterbox offset on arbitrary container sizes", () => {
      // Test wide container (e.g. 1920x800) with 2:1 image (2400x1200)
      const wideContainer = { left: 0, top: 0, width: 1920, height: 800 };
      const wideFitted = computeFittedImageRect(wideContainer, { naturalWidth: 2400, naturalHeight: 1200 });

      expect(wideFitted.height).toBe(800);
      expect(wideFitted.width).toBe(1600); // 800 * 2
      expect(wideFitted.left).toBe(160);   // (1920 - 1600) / 2
      expect(wideFitted.top).toBe(0);

      // Test tall container (e.g. 1000x1200) with 2:1 image
      const tallContainer = { left: 0, top: 0, width: 1000, height: 1200 };
      const tallFitted = computeFittedImageRect(tallContainer, { naturalWidth: 2400, naturalHeight: 1200 });

      expect(tallFitted.width).toBe(1000);
      expect(tallFitted.height).toBe(500); // 1000 / 2
      expect(tallFitted.left).toBe(0);
      expect(tallFitted.top).toBe(350);    // (1200 - 500) / 2
    });
  });
});
