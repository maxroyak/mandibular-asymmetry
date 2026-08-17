import { useRef, useCallback, useEffect, useState } from "react";
import { useStudyStore } from "../store/studyStore";
import { LANDMARK_DEFINITIONS } from "../domain/types";
import type { Point, LandmarkName, CalibrationStage } from "../domain/types";
import { screenToNormalized as transformScreenToNormalized } from "../domain/coordinateTransform";
import { getTranslations } from "../locales";
import { ImageFiltersToolbar } from "./ImageFiltersToolbar";
import { buildCssFilterString, isFilterActive } from "../domain/imageFilters";

// ── Interaction mode ────────────────────────────────────────
// Tracks what the current pointer-down gesture is doing so that
// landmark dragging, calibration point dragging, and image panning
// never interfere with each other.
type InteractionMode = "none" | "pan" | "drag-landmark" | "drag-calibration";

/** Returns true if the calibration state machine is in any active (non-idle, non-calibrated) stage. */
function isCalibratingStage(stage: CalibrationStage): boolean {
  return (
    stage === "placing-point-1" ||
    stage === "reviewing-point-1" ||
    stage === "placing-point-2" ||
    stage === "reviewing-point-2" ||
    stage === "entering-distance"
  );
}

// ── Fixed pixel size constants ───────────────────────────────
// Marker sizes in CSS pixels (not scaled by zoom).
const CALIBRATION_MARKER_PX = 5;      // 10px diameter visible marker
const CALIBRATION_HIT_AREA_PX = 12;   // 24px diameter hit area
const LANDMARK_MARKER_PX = 5;         // 10px diameter visible marker
const LANDMARK_HIT_AREA_PX = 12;      // 24px diameter hit area
const LANDMARK_ACTIVE_RING_PX = 10;   // 20px diameter active ring

export function ImageViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const interactionMode = useRef<InteractionMode>("none");
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const draggingLandmark = useRef<LandmarkName | null>(null);
  const draggingCalibrationPoint = useRef<1 | 2 | null>(null);
  const activePointerId = useRef<number | null>(null);
  const isDraggingRef = useRef(false); // Track drag state without re-render
  // Prevent double-placement: pointerdown places the landmark, and the
  // subsequent click event on the SVG must not place it again.
  const placedInPointerDown = useRef(false);
  // isDraggingPlaced is a render-trigger flag so that click-after-drag is suppressed
  const [isDraggingPlaced, setIsDraggingPlaced] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true); // Measurement lines toggle
  const [showLandmarks, setShowLandmarks] = useState(true); // Landmark pins toggle
  const [showFilters, setShowFilters] = useState(false); // Image enhancement filter popover
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [isDraggingMarker, setIsDraggingMarker] = useState(false); // for cursor: grabbing

  const language = useStudyStore((s) => s.language);
  const t = getTranslations(language);

  const imageDataUrl = useStudyStore((s) => s.imageDataUrl);
  const imageNaturalWidth = useStudyStore((s) => s.imageNaturalWidth);
  const imageNaturalHeight = useStudyStore((s) => s.imageNaturalHeight);
  const viewer = useStudyStore((s) => s.viewer);
  const filters = useStudyStore((s) => s.filters);
  const landmarks = useStudyStore((s) => s.landmarks);
  const activeLandmark = useStudyStore((s) => s.activeLandmark);
  const calibrationPoints = useStudyStore((s) => s.calibrationPoints);
  const calibrationMode = useStudyStore((s) => s.calibrationMode);
  const calibrationStage = useStudyStore((s) => s.calibrationStage);
  const hoveredLine = useStudyStore((s) => s.hoveredLine);
  const isAiDetecting = useStudyStore((s) => s.isAiDetecting);
  const aiCandidateLandmarks = useStudyStore((s) => s.aiCandidateLandmarks);
  const detectLandmarksAi = useStudyStore((s) => s.detectLandmarksAi);

  const setLandmark = useStudyStore((s) => s.setLandmark);
  const moveLandmark = useStudyStore((s) => s.moveLandmark);
  const deleteLandmark = useStudyStore((s) => s.deleteLandmark);
  const setActiveLandmark = useStudyStore((s) => s.setActiveLandmark);
  const setZoom = useStudyStore((s) => s.setZoom);
  const setPan = useStudyStore((s) => s.setPan);
  const resetViewer = useStudyStore((s) => s.resetViewer);
  const fitToScreen = useStudyStore((s) => s.fitToScreen);
  const placeCalibrationPoint = useStudyStore((s) => s.placeCalibrationPoint);
  const moveCalibrationPoint = useStudyStore((s) => s.moveCalibrationPoint);
  const setImageFilters = useStudyStore((s) => s.setImageFilters);

  // ── Track container size for fixed-pixel marker calculations ──
  useEffect(() => {
    const updateSize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect && rect.width > 0 && rect.height > 0) {
        setContainerSize({ w: rect.width, h: rect.height });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // ── Convert CSS pixel size to SVG viewBox units ─────────────
  const pxToViewBox = useCallback(
    (px: number): number => {
      const base = Math.min(containerSize.w, containerSize.h);
      if (base <= 0 || viewer.zoom <= 0) return px / 1000; // fallback
      return px / (base * viewer.zoom);
    },
    [containerSize.w, containerSize.h, viewer.zoom]
  );

  // Pre-compute commonly used sizes
  const calMarkerR = pxToViewBox(CALIBRATION_MARKER_PX);
  const calHitR = pxToViewBox(CALIBRATION_HIT_AREA_PX);
  const lmMarkerR = pxToViewBox(LANDMARK_MARKER_PX);
  const lmHitR = pxToViewBox(LANDMARK_HIT_AREA_PX);
  const lmActiveRingR = pxToViewBox(LANDMARK_ACTIVE_RING_PX);

  // ── One source of truth: mm values from the store ──────────
  const mandibularResult = useStudyStore((s) => s.mandibularResult);
  const calibration = useStudyStore((s) => s.calibration);
  const isCalibrated = calibrationMode === "B" && calibration !== null;

  // ── Screen → normalized coordinate conversion ──────────────
  const screenToNormalized = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
      return transformScreenToNormalized(clientX, clientY, rect, viewer, {
        naturalWidth: imageNaturalWidth,
        naturalHeight: imageNaturalHeight,
      });
    },
    [viewer, imageNaturalWidth, imageNaturalHeight]
  );

  // Mouse wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(viewer.zoom * delta);
    },
    [viewer.zoom, setZoom]
  );

  // Click on overlay: place landmark fallback
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (isDraggingPlaced) return;
      if (isDraggingRef.current) return;
      if (placedInPointerDown.current) {
        placedInPointerDown.current = false;
        return;
      }

      const target = e.target as Element;
      const deleteTarget = target.closest?.(".delete-btn") || target.closest?.("[data-delete]");
      if (deleteTarget) {
        const lmName = deleteTarget.getAttribute("data-delete") as LandmarkName | null;
        if (lmName) {
          deleteLandmark(lmName);
          return;
        }
      }

      const stage = useStudyStore.getState().calibrationStage;
      if (isCalibratingStage(stage)) {
        return;
      }

      const point = screenToNormalized(e.clientX, e.clientY);

      if (activeLandmark) {
        setLandmark(activeLandmark, point);
        const idx = LANDMARK_DEFINITIONS.findIndex(
          (l) => l.name === activeLandmark
        );
        if (idx >= 0 && idx < LANDMARK_DEFINITIONS.length - 1) {
          setActiveLandmark(LANDMARK_DEFINITIONS[idx + 1].name);
        } else {
          setActiveLandmark(null);
        }
      }
    },
    [
      screenToNormalized,
      activeLandmark,
      setLandmark,
      setActiveLandmark,
      deleteLandmark,
      isDraggingPlaced,
    ]
  );

  // Pointer down on container
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const target = e.target as Element;
      const stage = useStudyStore.getState().calibrationStage;

      // 1. Calibration point PLACEMENT
      if (stage === "placing-point-1" || stage === "placing-point-2") {
        const point = screenToNormalized(e.clientX, e.clientY);
        placeCalibrationPoint(point);
        return;
      }

      // 2. Landmark PLACEMENT
      if (activeLandmark && !isCalibratingStage(stage)) {
        const point = screenToNormalized(e.clientX, e.clientY);
        setLandmark(activeLandmark, point);
        const idx = LANDMARK_DEFINITIONS.findIndex(
          (l) => l.name === activeLandmark
        );
        if (idx >= 0 && idx < LANDMARK_DEFINITIONS.length - 1) {
          setActiveLandmark(LANDMARK_DEFINITIONS[idx + 1].name);
        } else {
          setActiveLandmark(null);
        }
        placedInPointerDown.current = true;
        e.preventDefault();
        return;
      }

      // 3. Delete button check
      if (
        target &&
        (target.classList?.contains("delete-btn") ||
          (target as Element).closest?.(".delete-btn") ||
          (target as Element).getAttribute?.("data-delete"))
      ) {
        return;
      }

      // 4. Programmatic hit-testing for calibration points and landmarks
      if (!activeLandmark) {
        const container = containerRef.current;
        if (container) {
          // Select the OVERLAY SVG (not the hidden 0×0 filter-definition SVG
          // that appears earlier in the DOM). The hidden SVG has no viewBox,
          // so its getScreenCTM() maps to screen pixels rather than the 0-1
          // normalized coordinate space, which would make hit-testing fail.
          const svg = container.querySelector("svg.overlay-svg") as SVGSVGElement | null;
          if (svg) {
            const pt = svg.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            const ctm = svg.getScreenCTM();
            if (ctm) {
              const svgPt = pt.matrixTransform(ctm.inverse());

              // Check calibration points first (only during active calibration workflow)
              const calHitRadius = pxToViewBox(CALIBRATION_HIT_AREA_PX);
              if (isCalibratingStage(stage)) {
                for (const which of [1, 2] as const) {
                  const cp =
                    which === 1 ? calibrationPoints?.point1 : calibrationPoints?.point2;
                  if (!cp) continue;
                  const canDrag =
                    (which === 1 &&
                      (stage === "reviewing-point-1" ||
                        stage === "reviewing-point-2" ||
                        stage === "entering-distance")) ||
                    (which === 2 &&
                      (stage === "reviewing-point-2" ||
                        stage === "entering-distance"));

                  if (!canDrag) continue;

                  const dx = svgPt.x - cp.x;
                  const dy = svgPt.y - cp.y;
                  const dist = Math.sqrt(dx * dx + dy * dy);
                  if (dist < calHitRadius) {
                    interactionMode.current = "drag-calibration";
                    draggingCalibrationPoint.current = which;
                    activePointerId.current = e.pointerId;
                    isDraggingRef.current = true;
                    setIsDraggingMarker(true);
                    try {
                      (e.currentTarget as Element).setPointerCapture(e.pointerId);
                    } catch {
                      /* noop */
                    }
                    e.preventDefault();
                    return;
                  }
                }
              }

              // Check landmarks
              let closest: LandmarkName | null = null;
              let closestDist = Infinity;
              const lmHitRadius = pxToViewBox(LANDMARK_HIT_AREA_PX);
              for (const def of LANDMARK_DEFINITIONS) {
                const lm = landmarks[def.name];
                if (!lm) continue;
                const dx = svgPt.x - lm.x;
                const dy = svgPt.y - lm.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < lmHitRadius && dist < closestDist) {
                  closest = def.name;
                  closestDist = dist;
                }
              }
              if (closest) {
                interactionMode.current = "drag-landmark";
                draggingLandmark.current = closest;
                activePointerId.current = e.pointerId;
                isDraggingRef.current = true;
                setIsDraggingMarker(true);
                try {
                  (e.currentTarget as Element).setPointerCapture(e.pointerId);
                } catch {
                  /* noop */
                }
                e.preventDefault();
                return;
              }
            }
          }
        }
      }

      // 5. Don't pan during calibration review or entering-distance stages
      if (
        stage === "reviewing-point-1" ||
        stage === "reviewing-point-2" ||
        stage === "entering-distance"
      ) {
        return;
      }

      // 6. Start panning
      interactionMode.current = "pan";
      activePointerId.current = e.pointerId;
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        panX: viewer.panX,
        panY: viewer.panY,
      };
      try {
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
      e.preventDefault();
    },
    [activeLandmark, viewer.panX, viewer.panY, screenToNormalized, placeCalibrationPoint, setLandmark, setActiveLandmark, pxToViewBox, calibrationPoints, landmarks]
  );

  // Pointer move
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (interactionMode.current === "drag-calibration" && draggingCalibrationPoint.current) {
        const point = screenToNormalized(e.clientX, e.clientY);
        moveCalibrationPoint(draggingCalibrationPoint.current, point);
        return;
      }

      if (interactionMode.current === "drag-landmark" && draggingLandmark.current) {
        const point = screenToNormalized(e.clientX, e.clientY);
        moveLandmark(draggingLandmark.current, point);
        return;
      }

      if (interactionMode.current === "pan") {
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        setPan(dragStart.current.panX + dx, dragStart.current.panY + dy);
      }
    },
    [screenToNormalized, moveLandmark, setPan, moveCalibrationPoint]
  );

  // Pointer up / cancel
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (activePointerId.current !== null) {
        try {
          (e.currentTarget as Element).releasePointerCapture(activePointerId.current);
        } catch {
          /* noop */
        }
        activePointerId.current = null;
      }

      if (interactionMode.current === "pan" || interactionMode.current === "drag-landmark" || interactionMode.current === "drag-calibration") {
        setIsDraggingPlaced(true);
        isDraggingRef.current = true;
        setTimeout(() => {
          setIsDraggingPlaced(false);
          isDraggingRef.current = false;
        }, 50);
      }

      interactionMode.current = "none";
      draggingLandmark.current = null;
      draggingCalibrationPoint.current = null;
      setIsDraggingMarker(false);
    },
    []
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as Element;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA"))
        return;

      switch (e.key) {
        case "+":
        case "=":
          setZoom(viewer.zoom * 1.15);
          break;
        case "-":
          setZoom(viewer.zoom * 0.85);
          break;
        case "0":
          fitToScreen();
          break;
        case "r":
        case "R":
          resetViewer();
          break;
        case "Escape":
          setActiveLandmark(null);
          break;
        case " ":
          e.preventDefault();
          setPanMode(true);
          break;
      }
    };
    const upHandler = (e: KeyboardEvent) => {
      if (e.key === " ") {
        setPanMode(false);
      }
    };
    window.addEventListener("keydown", handler);
    window.addEventListener("keyup", upHandler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("keyup", upHandler);
    };
  }, [viewer.zoom, setZoom, fitToScreen, resetViewer, setActiveLandmark]);

  // Landmark colors
  const landmarkColor = (name: LandmarkName): string => {
    const def = LANDMARK_DEFINITIONS.find((l) => l.name === name);
    if (!def) return "#ef4444";
    if (def.side === "right") return "#3b82f6"; // Pure Blue
    if (def.side === "left") return "#ef4444";  // Pure Red / Coral
    return "#f59e0b"; // Warm Amber
  };

  const RIGHT_COLOR = "#3b82f6"; // Pure Blue
  const LEFT_COLOR = "#ef4444";  // Pure Red / Coral

  const lineDefs = [
    {
      id: "ramusR",
      from: landmarks.CoR,
      to: landmarks.GoR,
      color: RIGHT_COLOR,
      name: t.overlay.ramusR,
      mm: mandibularResult?.ramus.rightMm ?? null,
    },
    {
      id: "ramusL",
      from: landmarks.CoL,
      to: landmarks.GoL,
      color: LEFT_COLOR,
      name: t.overlay.ramusL,
      mm: mandibularResult?.ramus.leftMm ?? null,
    },
    {
      id: "bodyR",
      from: landmarks.GoR,
      to: landmarks.Me,
      color: RIGHT_COLOR,
      name: t.overlay.bodyR,
      mm: mandibularResult?.body.rightMm ?? null,
    },
    {
      id: "bodyL",
      from: landmarks.GoL,
      to: landmarks.Me,
      color: LEFT_COLOR,
      name: t.overlay.bodyL,
      mm: mandibularResult?.body.leftMm ?? null,
    },
  ];

  const isCalibrating = isCalibratingStage(calibrationStage);

  const activeCalibrationPoint: 1 | 2 | null =
    calibrationStage === "placing-point-1" || calibrationStage === "reviewing-point-1"
      ? 1
      : calibrationStage === "placing-point-2" || calibrationStage === "reviewing-point-2"
      ? 2
      : null;

  const point1Confirmed =
    calibrationStage === "placing-point-2" ||
    calibrationStage === "reviewing-point-2" ||
    calibrationStage === "entering-distance" ||
    calibrationStage === "calibrated";
  const point2Confirmed =
    calibrationStage === "entering-distance" ||
    calibrationStage === "calibrated";

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-slate-950 radiograph-grid-bg">
      {/* ── Translucent Glassmorphic Floating HUD Toolbar ── */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 sm:gap-2 px-3 py-1.5 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-slate-700/70 shadow-2xl text-slate-200 select-none max-w-[95vw] overflow-x-auto print-hide"
        role="toolbar"
        aria-label="Viewer HUD"
      >
        {/* Cluster A: View Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(viewer.zoom * 0.85)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 active:bg-slate-700/80 text-xs font-semibold transition-colors cursor-pointer"
            title={t.hud.zoomOut}
            aria-label={t.hud.zoomOut}
          >
            🔍−
          </button>
          <span className="min-w-[44px] text-center font-mono text-xs font-semibold text-slate-300">
            {t.hud.zoomLevel(viewer.zoom)}
          </span>
          <button
            onClick={() => setZoom(viewer.zoom * 1.15)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 active:bg-slate-700/80 text-xs font-semibold transition-colors cursor-pointer"
            title={t.hud.zoomIn}
            aria-label={t.hud.zoomIn}
          >
            🔍+
          </button>
          <button
            onClick={fitToScreen}
            className="px-2 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800/80 hover:text-slate-100 transition-colors cursor-pointer"
            title={t.hud.fit}
          >
            {t.hud.fit}
          </button>
          <button
            onClick={() => setPanMode(!panMode)}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              panMode
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-100"
            }`}
            title={t.hud.pan}
          >
            {t.hud.pan}
          </button>
          <button
            onClick={resetViewer}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 active:bg-slate-700/80 text-xs transition-colors cursor-pointer"
            title={t.hud.reset}
            aria-label={t.hud.reset}
          >
            ↺
          </button>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-slate-700/80 mx-0.5 shrink-0" />

        {/* Cluster B: Radiograph Enhancement */}
        <div className="flex items-center gap-1">
          {/* Grayscale Inversion */}
          <button
            onClick={() => setImageFilters({ invert: !filters.invert })}
            className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filters.invert
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-xs"
                : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-100"
            }`}
            title={t.hud.invert}
            aria-label={t.hud.invert}
          >
            🌓
          </button>

          {/* Filter Popover Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-2 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              showFilters || isFilterActive(filters)
                ? "bg-blue-600/30 text-blue-200 border border-blue-500/50 shadow-xs"
                : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-100"
            }`}
            title={t.filters.togglePanel}
          >
            <span>🎨</span>
            <span>{t.hud.filters}</span>
            {isFilterActive(filters) && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-slate-700/80 mx-0.5 shrink-0" />

        {/* Cluster C: Overlay Toggles */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowOverlay(!showOverlay)}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              showOverlay
                ? "bg-slate-800 text-blue-400 border border-blue-500/40"
                : "text-slate-500 hover:bg-slate-800/80 hover:text-slate-300"
            }`}
            title={t.hud.measurements}
          >
            📊 {t.hud.measurements}
          </button>
          <button
            onClick={() => setShowLandmarks(!showLandmarks)}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              showLandmarks
                ? "bg-slate-800 text-blue-400 border border-blue-500/40"
                : "text-slate-500 hover:bg-slate-800/80 hover:text-slate-300"
            }`}
            title={t.hud.landmarks}
          >
            🎯 {t.hud.landmarks}
          </button>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-slate-700/80 mx-0.5 shrink-0" />

        {/* Cluster D: AI Auto-Detect */}
        <div className="flex items-center">
          <button
            onClick={() => detectLandmarksAi()}
            disabled={isAiDetecting}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 border border-blue-500/40 shadow-sm disabled:opacity-50 transition-colors cursor-pointer"
            title={t.ai.detectButton}
          >
            <span>{isAiDetecting ? "⏳" : "✨"}</span>
            <span>{isAiDetecting ? t.hud.aiDetecting : t.hud.aiDetect}</span>
          </button>
        </div>
      </div>

      {/* Image + Overlay Viewport */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        style={{
          cursor: isDraggingMarker
            ? "grabbing"
            : panMode || (!activeLandmark && !isCalibratingStage(calibrationStage) && interactionMode.current === "pan")
            ? "grab"
            : (activeLandmark || isCalibratingStage(calibrationStage))
            ? "crosshair"
            : "default",
        }}
      >
        {/* Hidden SVG Filter Definition for Convolution Sharpening */}
        <svg className="absolute w-0 h-0 pointer-events-none opacity-0" aria-hidden="true">
          <filter id="radiograph-sharpen">
            <feConvolveMatrix
              order="3"
              kernelMatrix="0 -1 0 -1 5 -1 0 -1 0"
              preserveAlpha="true"
            />
          </filter>
        </svg>

        {/* Floating Radiograph Filter Suite Popover */}
        {showFilters && (
          <div className="absolute top-16 right-4 z-40 max-w-sm w-full">
            <ImageFiltersToolbar />
          </div>
        )}

        {/* Image Layer */}
        {imageDataUrl && (
          <img
            src={imageDataUrl}
            alt="Panoramic radiograph"
            className="absolute inset-0 h-full w-full object-contain"
            style={{
              filter: buildCssFilterString(filters),
              transform: `translate(${viewer.panX}px, ${viewer.panY}px) scale(${viewer.zoom})`,
              transformOrigin: "center",
              pointerEvents: "none",
              userSelect: "none",
            }}
            draggable={false}
          />
        )}

        {/* Overlay Layer (SVG) */}
        <svg
          className="absolute inset-0 h-full w-full overlay-svg"
          viewBox="0 0 1 1"
          preserveAspectRatio="xMidYMid meet"
          onClick={handleOverlayClick}
          style={{
            pointerEvents: "all",
            transform: `translate(${viewer.panX}px, ${viewer.panY}px) scale(${viewer.zoom})`,
            transformOrigin: "center",
          }}
        >
          {/* Measurement lines with midpoint mm labels (strokeWidth: 1.5px) */}
          {showOverlay && lineDefs.map((line) => {
            if (!line.from || !line.to) return null;
            const isHovered = hoveredLine === line.id;
            const midX = (line.from.x + line.to.x) / 2;
            const midY = (line.from.y + line.to.y) / 2;
            const showMm = isCalibrated && line.mm !== null;
            const label = showMm
              ? `${line.name}: ${line.mm!.toFixed(1)} ${t.common.mm}`
              : `${line.name}: ${t.overlay.calibrationRequired}`;
            const pillWidth = showMm ? 0.16 : 0.22;
            const pillHalfWidth = pillWidth / 2;

            return (
              <g key={line.id}>
                <line
                  x1={line.from.x}
                  y1={line.from.y}
                  x2={line.to.x}
                  y2={line.to.y}
                  stroke={line.color}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  opacity={hoveredLine && !isHovered ? 0.25 : 1}
                  vectorEffect="non-scaling-stroke"
                  style={{
                    filter: isHovered
                      ? `drop-shadow(0 0 5px ${line.color})`
                      : "drop-shadow(0 0 2px rgba(0,0,0,0.85))",
                    transition: "stroke-width 0.15s, opacity 0.15s",
                  }}
                />
                {/* Translucent glassmorphic dark pill badge */}
                <rect
                  x={midX - pillHalfWidth}
                  y={midY - 0.024}
                  width={pillWidth}
                  height={0.024}
                  fill="rgba(15, 23, 42, 0.88)"
                  stroke={isHovered ? line.color : "rgba(51, 65, 85, 0.85)"}
                  strokeWidth={pxToViewBox(1)}
                  rx={0.005}
                  ry={0.005}
                  style={{ pointerEvents: "none" }}
                />
                {/* Measurement text inside pill */}
                <text
                  x={midX}
                  y={midY}
                  fill={showMm ? "#f8fafc" : "#fbbf24"}
                  fontSize={0.011}
                  fontWeight="bold"
                  textAnchor="middle"
                  dy="-0.006"
                  className="select-none font-sans"
                  style={{ pointerEvents: "none" }}
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Calibration line (visible ONLY during active calibration stages) */}
          {showOverlay && isCalibrating && calibrationPoints?.point1 && calibrationPoints?.point2 && (
            <g>
              <line
                x1={calibrationPoints.point1.x}
                y1={calibrationPoints.point1.y}
                x2={calibrationPoints.point2.x}
                y2={calibrationPoints.point2.y}
                stroke="#10b981"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                vectorEffect="non-scaling-stroke"
                style={{ filter: "drop-shadow(0 0 2px rgba(0,0,0,0.8))" }}
              />
            </g>
          )}

          {/* Calibration point markers (visible ONLY during active calibration stages) */}
          {isCalibrating && calibrationPoints?.point1 && (
            <g>
              {activeCalibrationPoint === 1 && (
                <circle
                  cx={calibrationPoints.point1.x}
                  cy={calibrationPoints.point1.y}
                  r={calHitR * 1.3}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth={pxToViewBox(2)}
                  vectorEffect="non-scaling-stroke"
                  style={{ pointerEvents: "none", opacity: 0.9 }}
                />
              )}
              <circle
                className="calibration-marker"
                data-calibration-point="1"
                cx={calibrationPoints.point1.x}
                cy={calibrationPoints.point1.y}
                r={calHitR}
                fill="white"
                fillOpacity={0.001}
                style={{
                  pointerEvents: "none",
                  cursor: isDraggingMarker ? "grabbing" : "grab",
                }}
              />
              <circle
                cx={calibrationPoints.point1.x}
                cy={calibrationPoints.point1.y}
                r={calMarkerR}
                fill={point1Confirmed ? "#10b981" : "#fbbf24"}
                stroke="white"
                strokeWidth={pxToViewBox(1.5)}
                strokeDasharray={point1Confirmed ? undefined : `${pxToViewBox(2)} ${pxToViewBox(1.5)}`}
                vectorEffect="non-scaling-stroke"
                style={{ pointerEvents: "none" }}
              />
              <text
                x={calibrationPoints.point1.x + calHitR}
                y={calibrationPoints.point1.y - calHitR * 0.7}
                fill={point1Confirmed ? "#34d399" : "#fbbf24"}
                fontSize={0.011}
                fontWeight="bold"
                className="select-none font-sans"
                style={{ pointerEvents: "none", textShadow: "0 0 3px black" }}
              >
                P1
              </text>
            </g>
          )}

          {isCalibrating && calibrationPoints?.point2 && (
            <g>
              {activeCalibrationPoint === 2 && (
                <circle
                  cx={calibrationPoints.point2.x}
                  cy={calibrationPoints.point2.y}
                  r={calHitR * 1.3}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth={pxToViewBox(2)}
                  vectorEffect="non-scaling-stroke"
                  style={{ pointerEvents: "none", opacity: 0.9 }}
                />
              )}
              <circle
                className="calibration-marker"
                data-calibration-point="2"
                cx={calibrationPoints.point2.x}
                cy={calibrationPoints.point2.y}
                r={calHitR}
                fill="white"
                fillOpacity={0.001}
                style={{
                  pointerEvents: "none",
                  cursor: isDraggingMarker ? "grabbing" : "grab",
                }}
              />
              <circle
                cx={calibrationPoints.point2.x}
                cy={calibrationPoints.point2.y}
                r={calMarkerR}
                fill={point2Confirmed ? "#10b981" : "#fbbf24"}
                stroke="white"
                strokeWidth={pxToViewBox(1.5)}
                strokeDasharray={point2Confirmed ? undefined : `${pxToViewBox(2)} ${pxToViewBox(1.5)}`}
                vectorEffect="non-scaling-stroke"
                style={{ pointerEvents: "none" }}
              />
              <text
                x={calibrationPoints.point2.x + calHitR}
                y={calibrationPoints.point2.y - calHitR * 0.7}
                fill={point2Confirmed ? "#34d399" : "#fbbf24"}
                fontSize={0.011}
                fontWeight="bold"
                className="select-none font-sans"
                style={{ pointerEvents: "none", textShadow: "0 0 3px black" }}
              >
                P2
              </text>
            </g>
          )}

          {/* Landmark markers (Clean solid circle with subtle halo & text label) */}
          {showLandmarks && LANDMARK_DEFINITIONS.map((def) => {
            const lm = landmarks[def.name];
            if (!lm) return null;
            const color = landmarkColor(def.name);
            const isActive = activeLandmark === def.name;
            const isAiCandidate = !!aiCandidateLandmarks[def.name];

            return (
              <g key={def.name}>
                {/* Active Pulsing Ring */}
                {isActive && (
                  <circle
                    cx={lm.x}
                    cy={lm.y}
                    r={lmActiveRingR}
                    fill="none"
                    stroke="#f97316"
                    strokeWidth={pxToViewBox(2)}
                    vectorEffect="non-scaling-stroke"
                    style={{ filter: "drop-shadow(0 0 4px #f97316)" }}
                  />
                )}

                {/* AI Candidate Dashed Halo */}
                {isAiCandidate && !isActive && (
                  <circle
                    cx={lm.x}
                    cy={lm.y}
                    r={lmHitR * 1.2}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={pxToViewBox(1.5)}
                    strokeDasharray={`${pxToViewBox(3)} ${pxToViewBox(2)}`}
                    vectorEffect="non-scaling-stroke"
                    style={{ filter: "drop-shadow(0 0 3px #f59e0b)" }}
                  />
                )}

                {/* Subtle Anatomical Halo Ring */}
                <circle
                  cx={lm.x}
                  cy={lm.y}
                  r={lmMarkerR + pxToViewBox(2)}
                  fill="none"
                  stroke={color}
                  strokeOpacity={0.4}
                  strokeWidth={pxToViewBox(1)}
                  vectorEffect="non-scaling-stroke"
                  style={{ pointerEvents: "none" }}
                />

                {/* Interaction Hit Area */}
                <circle
                  className="landmark-marker"
                  data-landmark={def.name}
                  cx={lm.x}
                  cy={lm.y}
                  r={lmHitR}
                  fill="white"
                  fillOpacity={0.001}
                  style={{
                    pointerEvents: "none",
                    cursor: isDraggingMarker ? "grabbing" : "grab",
                  }}
                />

                {/* High-Precision Solid Marker Circle */}
                <circle
                  cx={lm.x}
                  cy={lm.y}
                  r={lmMarkerR}
                  fill={color}
                  stroke="white"
                  strokeWidth={pxToViewBox(1.5)}
                  vectorEffect="non-scaling-stroke"
                  style={{
                    pointerEvents: "none",
                    filter: "drop-shadow(0 0 2px rgba(0,0,0,0.9))",
                  }}
                />

                {/* Landmark Label */}
                <text
                  x={lm.x + lmHitR}
                  y={lm.y - lmHitR * 0.6}
                  fill={isAiCandidate ? "#fde047" : "#f8fafc"}
                  fontSize={0.011}
                  fontWeight="bold"
                  className="select-none font-sans"
                  style={{ pointerEvents: "none", textShadow: "0 0 3px black" }}
                >
                  {def.label}{isAiCandidate ? " (AI)" : ""}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}