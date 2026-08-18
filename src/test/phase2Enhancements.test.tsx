// ── Phase 2 Enhancements Test Suite ───────────────────────────
// Tests for DICOM auto-scale badges, precision markers & hair-crosses,
// StudyManager bulk clear, and CBCT 2D export micro-instruction banner.

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useStudyStore } from "../store/studyStore";
import { ImageUploadZone } from "../components/ImageUploadZone";
import { RadiographOverlay } from "../components/RadiographOverlay";
import { CalibrationPanel } from "../components/CalibrationPanel";
import { ImageViewer } from "../components/ImageViewer";
import { LandmarkPalette } from "../components/LandmarkPalette";

// Mock localStorage
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => storageMap.set(key, value),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null,
  get length() {
    return storageMap.size;
  },
};
Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  configurable: true,
  writable: true,
});

describe("Phase 2 — DICOM Auto-Calibration Badges & Localizations", () => {
  beforeEach(() => {
    storageMap.clear();
    useStudyStore.getState().newStudy();
  });

  it("renders DICOM auto-calibration badge in CalibrationPanel for RU", () => {
    useStudyStore.setState({ language: "ru" });
    useStudyStore.getState().createStudy("PAT-DICOM-RU", "data:image/png;base64,mock", 1200, 800, {
      pixelDistance: 100,
      realDistanceMm: 12.5,
      mmPerPixel: 0.125,
      source: "dicom",
    });

    render(<CalibrationPanel />);
    expect(screen.getByText(/✓ Автокалибровка по DICOM \(0\.1250 мм\/пкс\)/i)).toBeInTheDocument();
  });

  it("renders DICOM auto-calibration badge in CalibrationPanel for EN", () => {
    useStudyStore.setState({ language: "en" });
    useStudyStore.getState().createStudy("PAT-DICOM-EN", "data:image/png;base64,mock", 1200, 800, {
      pixelDistance: 100,
      realDistanceMm: 12.5,
      mmPerPixel: 0.125,
      source: "dicom",
    });

    render(<CalibrationPanel />);
    expect(screen.getByText(/✓ Auto-calibrated via DICOM \(0\.1250 mm\/px\)/i)).toBeInTheDocument();
  });
});

describe("Phase 2 — CBCT 2D Export Micro-Instruction Banner & Modal", () => {
  beforeEach(() => {
    storageMap.clear();
    useStudyStore.getState().newStudy();
    useStudyStore.setState({ language: "ru" });
  });

  it("renders the CBCT micro-instruction button in ImageUploadZone", () => {
    render(<ImageUploadZone />);
    const link = screen.getByText("Как загрузить срез из 3D КТ (КЛКТ)?");
    expect(link).toBeInTheDocument();
  });

  it("opens modal with 2-step instructions and notes on click, and closes on OK / X", () => {
    render(<ImageUploadZone />);
    const link = screen.getByText("Как загрузить срез из 3D КТ (КЛКТ)?");
    fireEvent.click(link);

    // Modal title & content
    expect(screen.getByText("Как экспортировать 2D панораму из 3D КЛКТ")).toBeInTheDocument();
    expect(screen.getByText(/Шаг 1\. Откройте исследование в вашей программе КТ/i)).toBeInTheDocument();
    expect(screen.getByText(/Шаг 2\. Экспортируйте 2D срез/i)).toBeInTheDocument();
    expect(screen.getByText(/5–15 МБ вместо 1 ГБ/i)).toBeInTheDocument();

    // Click OK to close
    const okBtn = screen.getByText("ОК");
    fireEvent.click(okBtn);

    expect(screen.queryByText("Как экспортировать 2D панораму из 3D КЛКТ")).toBeNull();
  });

  it("supports English language for CBCT instructions", () => {
    useStudyStore.setState({ language: "en" });
    render(<ImageUploadZone />);
    const link = screen.getByText("How to upload a slice from 3D CBCT?");
    expect(link).toBeInTheDocument();

    fireEvent.click(link);
    expect(screen.getByText("How to Export a 2D Panorama from 3D CBCT")).toBeInTheDocument();
    expect(screen.getByText(/Step 1\. Open the study in your CBCT viewer/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 2\. Export the 2D slice/i)).toBeInTheDocument();
  });
});

describe("Phase 2 — Precision Marker Radii & Hair-Cross Overlay", () => {
  beforeEach(() => {
    storageMap.clear();
    useStudyStore.getState().newStudy();
  });

  it("renders precision hair-cross lines and 3-4px marker circles for landmarks", () => {
    useStudyStore.getState().createStudy("PAT-OVERLAY", "data:image/png;base64,mock", 1200, 800);
    useStudyStore.getState().setLandmark("CoR", { x: 0.3, y: 0.3 });

    const { container } = render(
      <svg>
        <RadiographOverlay />
      </svg>
    );

    // Marker circle for CoR
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBeGreaterThan(0);

    // Hit target with transparent fillOpacity
    const hitArea = container.querySelector('circle[data-landmark="CoR"]');
    expect(hitArea).not.toBeNull();
    expect(hitArea?.getAttribute("r")).toBe("19.2"); // 1200 * 0.016 = 19.2px >= 14px

    // Hair-cross lines inside SVG
    const lines = container.querySelectorAll("line");
    expect(lines.length).toBeGreaterThanOrEqual(2); // horizontal & vertical hair-cross lines
  });

  it("sets cursor to none during active marker dragging to avoid obscuring cortical bone", () => {
    useStudyStore.getState().createStudy("PAT-CURSOR", "data:image/png;base64,mock", 1200, 800);
    useStudyStore.getState().setLandmark("CoR", { x: 0.3, y: 0.3 });

    const { container, rerender } = render(
      <svg>
        <RadiographOverlay isDraggingMarker={false} />
      </svg>
    );

    let hitArea = container.querySelector('circle[data-landmark="CoR"]');
    expect(hitArea?.getAttribute("style")).toContain("cursor: grab");

    // When isDraggingMarker becomes true
    rerender(
      <svg>
        <RadiographOverlay isDraggingMarker={true} />
      </svg>
    );

    hitArea = container.querySelector('circle[data-landmark="CoR"]');
    expect(hitArea?.getAttribute("style")).toContain("cursor: none");
  });
});

describe("Phase 2 — Topbar Controls Refactoring (Reset View & AI Landmark Detection)", () => {
  beforeEach(() => {
    storageMap.clear();
    useStudyStore.getState().newStudy();
  });

  it("renders 'Reset View' with explicit tooltip and groups it alongside Zoom in EN and RU", () => {
    useStudyStore.setState({ language: "ru" });
    useStudyStore.getState().createStudy("PAT-RESET-RU", "data:image/png;base64,mock", 1200, 800);

    const { unmount } = render(<ImageViewer />);
    const resetBtnRu = screen.getByRole("button", { name: /Сбросить вид/i });
    expect(resetBtnRu).toBeInTheDocument();
    expect(resetBtnRu).toHaveAttribute(
      "title",
      "Сбросить масштаб, позицию и контраст изображения (точки сохраняются)"
    );
    unmount();

    // Switch to English
    useStudyStore.setState({ language: "en" });
    render(<ImageViewer />);
    const resetBtnEn = screen.getByRole("button", { name: /Reset View/i });
    expect(resetBtnEn).toBeInTheDocument();
    expect(resetBtnEn).toHaveAttribute(
      "title",
      "Reset zoom, pan, and contrast (landmarks are preserved)"
    );
  });

  it("shows overwrite confirmation modal when clicking AI detection if landmarks already exist", async () => {
    useStudyStore.setState({ language: "ru" });
    useStudyStore.getState().createStudy("PAT-AI-MODAL", "data:image/png;base64,mock", 1200, 800);
    useStudyStore.getState().setLandmark("CoR", { x: 0.3, y: 0.3 });

    render(<ImageViewer />);
    const aiBtn = screen.getByRole("button", { name: /🪄 ИИ-разметка точек/i });
    expect(aiBtn).toBeInTheDocument();
    expect(aiBtn).toHaveAttribute(
      "title",
      "Автоматически найти 5 анатомических точек с помощью ИИ"
    );

    // Click AI button -> should open modal
    fireEvent.click(aiBtn);

    expect(screen.getByText("Заменить текущие точки ИИ-разметкой?")).toBeInTheDocument();
    expect(screen.getByText(/Текущие анатомические точки будут заменены предложенными ИИ/i)).toBeInTheDocument();

    // Cancel closes modal
    const cancelBtn = screen.getByText("Отмена");
    fireEvent.click(cancelBtn);
    expect(screen.queryByText("Заменить текущие точки ИИ-разметкой?")).toBeNull();
  });

  it("shows overwrite confirmation modal in LandmarkPalette as well", () => {
    useStudyStore.setState({ language: "en" });
    useStudyStore.getState().createStudy("PAT-PALETTE-AI", "data:image/png;base64,mock", 1200, 800);
    useStudyStore.getState().setLandmark("GoL", { x: 0.7, y: 0.7 });

    render(<LandmarkPalette />);
    const aiBtn = screen.getByRole("button", { name: /🪄 🪄 AI Landmark Detection/i });
    expect(aiBtn).toBeInTheDocument();

    fireEvent.click(aiBtn);
    expect(screen.getByText("Replace current landmarks with AI detection?")).toBeInTheDocument();
    expect(screen.getByText("Yes, Run AI")).toBeInTheDocument();
  });
});

