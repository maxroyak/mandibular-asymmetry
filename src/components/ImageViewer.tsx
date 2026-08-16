import { useRef, useCallback, useEffect, useState } from "react";
import { useStudyStore } from "../store/studyStore";
import { LANDMARK_DEFINITIONS } from "../domain/types";
import type { Point, LandmarkName, CalibrationStage } from "../domain/types";
import { screenToNormalized as transformScreenToNormalized } from "../domain/coordinateTransform";
import { getTranslations } from "../locales";

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
const DELETE_BTN_PX = 5;             // 10px diameter delete button

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
  const [showOverlay, setShowOverlay] = useState(true); // Item 9h: measurement overlay toggle
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [isDraggingMarker, setIsDraggingMarker] = useState(false); // for cursor: grabbing

  const language = useStudyStore((s) => s.language);
  const t = getTranslations(language);

  const imageDataUrl = useStudyStore((s) => s.imageDataUrl);
  const imageNaturalWidth = useStudyStore((s) => s.imageNaturalWidth);
  const imageNaturalHeight = useStudyStore((s) => s.imageNaturalHeight);
  const viewer = useStudyStore((s) => s.viewer);
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
  const setBrightness = useStudyStore((s) => s.setBrightness);
  const setContrast = useStudyStore((s) => s.setContrast);
  const resetViewer = useStudyStore((s) => s.resetViewer);
  const fitToScreen = useStudyStore((s) => s.fitToScreen);
  const placeCalibrationPoint = useStudyStore((s) => s.placeCalibrationPoint);
  const moveCalibrationPoint = useStudyStore((s) => s.moveCalibrationPoint);

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
  // The SVG has viewBox="0 0 1 1" with preserveAspectRatio="xMidYMid meet".
  // With the meet rule, 1 viewBox unit = min(containerW, containerH) CSS px
  // (before the zoom transform). After scale(zoom), it's min(w,h)*zoom.
  // So: viewBoxUnits = cssPx / (min(containerW, containerH) * zoom)
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
  const deleteBtnR = pxToViewBox(DELETE_BTN_PX);

  // ── One source of truth: mm values from the store ──────────
  // The overlay reads mandibularResult from the same store state that
  // the ResultsPanel uses. No recalculation in the UI layer.
  const mandibularResult = useStudyStore((s) => s.mandibularResult);
  const calibration = useStudyStore((s) => s.calibration);
  const isCalibrated = calibrationMode === "B" && calibration !== null;

  // ── Screen → normalized coordinate conversion ──────────────
  // Delegates to the pure domain function in coordinateTransform.ts,
  // accounting for container offset, pan, zoom about center, and
  // object-contain letterboxing.
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

  // Click on overlay: place landmark only (if not already placed in pointerdown).
  // Calibration point placement is handled in handlePointerDown (pointerdown
  // event) to eliminate the pointerdown/click conflict that was causing
  // calibration clicks to be swallowed by pan pointer capture.
  // Landmark placement is ALSO handled in handlePointerDown so that it works
  // reliably in real browsers where pointerdown→click may not always fire on
  // the SVG overlay (e.g. when pointer capture is set on the container).
  // This click handler is a FALLBACK that only places if pointerdown did not.
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // Don't place if we were just dragging
      if (isDraggingPlaced) return;
      if (isDraggingRef.current) return;
      // Don't double-place if pointerdown already handled it
      if (placedInPointerDown.current) {
        placedInPointerDown.current = false;
        return;
      }

      // Check if delete button was clicked
      const target = e.target as Element;
      const deleteTarget = target.closest?.(".delete-btn") || target.closest?.("[data-delete]");
      if (deleteTarget) {
        const lmName = deleteTarget.getAttribute("data-delete") as LandmarkName | null;
        if (lmName) {
          deleteLandmark(lmName);
          return;
        }
      }

      // Calibration placement is handled in pointerdown — not here.
      // If we're in a calibration placing stage, don't place a landmark.
      const stage = useStudyStore.getState().calibrationStage;
      if (stage === "placing-point-1" || stage === "placing-point-2" ||
          stage === "reviewing-point-1" || stage === "reviewing-point-2" ||
          stage === "entering-distance") {
        return;
      }

      const point = screenToNormalized(e.clientX, e.clientY);

      // Landmark placement
      if (activeLandmark) {
        setLandmark(activeLandmark, point);
        // Auto-advance to next landmark
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

  // Pointer down on container: decide interaction mode.
  // PRIORITY ORDER (highest first):
  //   1. Calibration point placement (placing-point-1 / placing-point-2)
  //   2. Landmark placement (if activeLandmark set AND not calibrating)
  //   3. Delete button click / pointerdown
  //   4. Calibration point drag (only when NOT placing a landmark)
  //   5. Landmark marker drag
  //   6. Pan
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const target = e.target as Element;
      const stage = useStudyStore.getState().calibrationStage;

      // ── 1. Calibration point PLACEMENT (highest priority) ──
      if (stage === "placing-point-1" || stage === "placing-point-2") {
        const point = screenToNormalized(e.clientX, e.clientY);
        placeCalibrationPoint(point);
        return;
      }

      // ── 2. Landmark PLACEMENT (if a landmark is active for placement) ──
      // This must come BEFORE the calibration-marker drag check so that
      // clicking on the image (even on a calibration marker's hit area)
      // places the landmark. The user explicitly selected a landmark to
      // place, so that intent takes priority over dragging calibration
      // points. Calibration drag is only allowed when no landmark is active.
      if (activeLandmark && !isCalibratingStage(stage)) {
        const point = screenToNormalized(e.clientX, e.clientY);
        setLandmark(activeLandmark, point);
        // Auto-advance to next landmark
        const idx = LANDMARK_DEFINITIONS.findIndex(
          (l) => l.name === activeLandmark
        );
        if (idx >= 0 && idx < LANDMARK_DEFINITIONS.length - 1) {
          setActiveLandmark(LANDMARK_DEFINITIONS[idx + 1].name);
        } else {
          setActiveLandmark(null);
        }
        // Mark as placed so the subsequent click event doesn't double-place
        placedInPointerDown.current = true;
        e.preventDefault();
        return;
      }

      // ── 3. Delete button check (before programmatic hit-testing) ──
      // If pointer is down on a delete button, ignore pointerdown for pan/drag
      if (
        target &&
        (target.classList?.contains("delete-btn") ||
          (target as Element).closest?.(".delete-btn") ||
          (target as Element).getAttribute?.("data-delete"))
      ) {
        return;
      }

      // ── 4. Programmatic hit-testing for calibration points and landmarks ──
      // SVG circles with pointerEvents: "all" and near-zero fillOpacity cause
      // the ENTIRE SVG to be the hit target in Chromium — the last-rendered
      // circle intercepts ALL pointer events, not just clicks within its
      // radius. We do hit-testing manually using SVG coordinate math instead.
      if (!activeLandmark) {
        const container = containerRef.current;
        if (container) {
          const svg = container.querySelector("svg");
          if (svg) {
            const pt = svg.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            const ctm = svg.getScreenCTM();
            if (ctm) {
              const svgPt = pt.matrixTransform(ctm.inverse());
              // svgPt.x and svgPt.y are in viewBox coordinates (0-1)

              // Check calibration points first (higher priority than landmarks)
              if (!isCalibratingStage(stage)) {
                const calHitRadius = pxToViewBox(CALIBRATION_HIT_AREA_PX);
                for (const which of [1, 2] as const) {
                  const cp =
                    which === 1 ? calibrationPoints?.point1 : calibrationPoints?.point2;
                  if (!cp) continue;
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
                      /* some browsers throw if already captured */
                    }
                    e.preventDefault();
                    return;
                  }
                }
              }

              // Check landmarks — find closest within hit radius
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
                  /* some browsers throw if already captured */
                }
                e.preventDefault();
                return;
              }
            }
          }
        }
      }

      // ── 5. Don't pan during calibration review or entering-distance stages ──
      if (
        stage === "reviewing-point-1" ||
        stage === "reviewing-point-2" ||
        stage === "entering-distance"
      ) {
        return;
      }

      // ── 6. Start panning ──
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

  // Pointer move: pan, drag landmark, or drag calibration point
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (interactionMode.current === "drag-calibration" && draggingCalibrationPoint.current) {
        const point = screenToNormalized(e.clientX, e.clientY);
        moveCalibrationPoint(draggingCalibrationPoint.current, point);
        return;
      }

      if (interactionMode.current === "drag-landmark" && draggingLandmark.current) {
        // Calculate landmark position DIRECTLY from current pointer position
        // on every move — no delta accumulation
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

  // Pointer up / cancel: end drag, pan, or calibration drag
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      // Release pointer capture
      if (activePointerId.current !== null) {
        try {
          (e.currentTarget as Element).releasePointerCapture(activePointerId.current);
        } catch {
          /* noop */
        }
        activePointerId.current = null;
      }

      if (interactionMode.current === "pan") {
        // Small timeout to prevent click-after-drag from placing a landmark
        setIsDraggingPlaced(true);
        isDraggingRef.current = true;
        setTimeout(() => {
          setIsDraggingPlaced(false);
          isDraggingRef.current = false;
        }, 50);
      } else if (interactionMode.current === "drag-landmark" || interactionMode.current === "drag-calibration") {
        // Suppress click after drag
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
      // Don't intercept if user is typing in an input
      const target = e.target as Element;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA"))
        return;

      switch (e.key) {
        case "+":
        case "=":
          setZoom(viewer.zoom * 1.1);
          break;
        case "-":
          setZoom(viewer.zoom * 0.9);
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
    if (def.side === "right") return "#2563eb";
    if (def.side === "left") return "#16a34a";
    return "#d97706";
  };

  // Measurement line definitions
  // mm values come from mandibularResult (the store's single source of truth).
  // Colors: blue for right side, red/orange (#dc2626) for left side.
  // When uncalibrated, labels show "calibration required" instead of mm.
  const RIGHT_COLOR = "#2563eb"; // blue
  const LEFT_COLOR = "#dc2626";  // red

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

  // ── Determine active calibration point (Item 6d) ──
  // The "active" point is the one currently being placed or reviewed.
  const activeCalibrationPoint: 1 | 2 | null =
    calibrationStage === "placing-point-1" || calibrationStage === "reviewing-point-1"
      ? 1
      : calibrationStage === "placing-point-2" || calibrationStage === "reviewing-point-2"
      ? 2
      : null;

  // ── Determine if a calibration point is confirmed (Item 6e) ──
  // Point 1 is "confirmed" once we've moved past reviewing-point-1.
  // Point 2 is "confirmed" once we've moved past reviewing-point-2.
  const point1Confirmed =
    calibrationStage === "placing-point-2" ||
    calibrationStage === "reviewing-point-2" ||
    calibrationStage === "entering-distance" ||
    calibrationStage === "calibrated";
  const point2Confirmed =
    calibrationStage === "entering-distance" ||
    calibrationStage === "calibrated";

  return (
    <div className="flex h-full flex-col">
      {/* Viewer Toolbar */}
      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2">
        <button
          onClick={() => setZoom(viewer.zoom * 1.2)}
          className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-100"
          title={t.viewer.zoomIn}
        >
          🔍+
        </button>
        <button
          onClick={() => setZoom(viewer.zoom * 0.8)}
          className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-100"
          title={t.viewer.zoomOut}
        >
          🔍−
        </button>
        <button
          onClick={fitToScreen}
          className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-100 text-xs font-medium"
          title={t.viewer.fitScreen}
        >
          {language === "ru" ? "Авто" : "Fit"}
        </button>
        <div className="mx-2 text-xs text-gray-400">|</div>
        <label className="flex items-center gap-1 text-xs" title={t.viewer.brightness}>
          ☀
          <input
            type="range"
            min={0.3}
            max={2.0}
            step={0.05}
            value={viewer.brightness}
            onChange={(e) => setBrightness(parseFloat(e.target.value))}
            className="w-20"
          />
        </label>
        <label className="flex items-center gap-1 text-xs" title={t.viewer.contrast}>
          ◐
          <input
            type="range"
            min={0.3}
            max={2.0}
            step={0.05}
            value={viewer.contrast}
            onChange={(e) => setContrast(parseFloat(e.target.value))}
            className="w-20"
          />
        </label>
        <div className="mx-2 text-xs text-gray-400">|</div>
        {/* Item 9h: Show/hide measurement overlay toggle */}
        <button
          onClick={() => setShowOverlay(!showOverlay)}
          className={`px-3 py-1 text-xs font-medium rounded border ${
            showOverlay
              ? "border-blue-400 bg-blue-50 text-blue-700"
              : "border-gray-300 hover:bg-gray-100 text-gray-600"
          }`}
          title={showOverlay ? t.viewer.hideOverlay : t.viewer.showOverlay}
        >
          {showOverlay
            ? `📊 ${language === "ru" ? "Оверлей" : "Overlay"}`
            : `📊 ${language === "ru" ? "Скрыт" : "Off"}`}
        </button>
        <div className="mx-2 text-xs text-gray-400">|</div>
        <button
          onClick={resetViewer}
          className="px-3 py-1 text-xs rounded border border-gray-300 hover:bg-gray-100 text-gray-600"
          title={t.viewer.resetView}
        >
          {language === "ru" ? "Сброс" : "Reset"}
        </button>
        <div className="mx-2 text-xs text-gray-400">|</div>
        {/* AI Auto-Detect Trigger */}
        <button
          onClick={() => detectLandmarksAi()}
          disabled={isAiDetecting}
          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded bg-indigo-50 border border-indigo-300 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
          title={t.ai.detectButton}
        >
          <span>{isAiDetecting ? "⏳" : "✨"}</span>
          <span>{isAiDetecting ? t.ai.detecting : t.ai.detectButton}</span>
        </button>
        <div className="ml-auto text-xs text-gray-400">
          Zoom: {viewer.zoom.toFixed(1)}x
        </div>
      </div>

      {/* Image + Overlay */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden bg-black"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        style={{ cursor: panMode || (!activeLandmark && !isCalibratingStage(calibrationStage) && interactionMode.current === "pan") ? "grab" : (activeLandmark || isCalibratingStage(calibrationStage)) ? "crosshair" : "default" }}
      >
        {/* Image Layer */}
        {imageDataUrl && (
          <img
            src={imageDataUrl}
            alt="Panoramic radiograph"
            className="absolute inset-0 h-full w-full object-contain"
            style={{
              filter: `brightness(${viewer.brightness}) contrast(${viewer.contrast})`,
              transform: `translate(${viewer.panX}px, ${viewer.panY}px) scale(${viewer.zoom})`,
              transformOrigin: "center",
              pointerEvents: "none",
              userSelect: "none",
            }}
            draggable={false}
          />
        )}

        {/* Overlay Layer (SVG) — receives the SAME transform as the image
            so landmarks, lines, and markers stay aligned with the radiograph
            at all zoom levels and pan offsets. */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 1 1"
          preserveAspectRatio="xMidYMid meet"
          onClick={handleOverlayClick}
          style={{
            pointerEvents: "all",
            transform: `translate(${viewer.panX}px, ${viewer.panY}px) scale(${viewer.zoom})`,
            transformOrigin: "center",
          }}
        >
          {/* Measurement lines with mm labels — only when overlay is visible */}
          {showOverlay && lineDefs.map((line) => {
            if (!line.from || !line.to) return null;
            const isHovered = hoveredLine === line.id;
            const midX = (line.from.x + line.to.x) / 2;
            const midY = (line.from.y + line.to.y) / 2;
            // Calibration gating: show mm only when calibrated and value available
            const showMm = isCalibrated && line.mm !== null;
            const label = showMm
              ? `${line.name}: ${line.mm!.toFixed(1)} ${t.common.mm}`
              : `${line.name}: ${t.overlay.calibrationRequired}`;
            return (
              <g key={line.id}>
                <line
                  x1={line.from.x}
                  y1={line.from.y}
                  x2={line.to.x}
                  y2={line.to.y}
                  stroke={line.color}
                  strokeWidth={isHovered ? 0.006 : 0.003}
                  opacity={hoveredLine && !isHovered ? 0.3 : 1}
                  vectorEffect="non-scaling-stroke"
                  style={{
                    filter: isHovered ? "drop-shadow(0 0 3px rgba(255,255,255,0.8))" : "none",
                    transition: "stroke-width 0.15s, opacity 0.15s",
                  }}
                />
                {/* Label background for readability */}
                <rect
                  x={midX - 0.08}
                  y={midY - 0.025}
                  width={0.16}
                  height={0.02}
                  fill="rgba(0,0,0,0.7)"
                  rx={0.003}
                  ry={0.003}
                  style={{ pointerEvents: "none" }}
                />
                {/* Measurement name + mm value at midpoint */}
                <text
                  x={midX}
                  y={midY}
                  fill={showMm ? "#ffffff" : "#fbbf24"}
                  fontSize={0.012}
                  textAnchor="middle"
                  dy="-0.005"
                  className="select-none"
                  style={{ pointerEvents: "none" }}
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Calibration line — show when both points exist, with distance label when calibrated */}
          {showOverlay && calibrationPoints?.point1 && calibrationPoints?.point2 && (
            <g>
              <line
                x1={calibrationPoints.point1.x}
                y1={calibrationPoints.point1.y}
                x2={calibrationPoints.point2.x}
                y2={calibrationPoints.point2.y}
                stroke="#10b981"
                strokeWidth={0.004}
                strokeDasharray="0.02 0.01"
                vectorEffect="non-scaling-stroke"
              />
              {calibrationStage === "calibrated" && calibration && (
                <text
                  x={(calibrationPoints.point1.x + calibrationPoints.point2.x) / 2}
                  y={(calibrationPoints.point1.y + calibrationPoints.point2.y) / 2}
                  fill="#10b981"
                  fontSize={0.012}
                  textAnchor="middle"
                  className="select-none"
                  style={{ pointerEvents: "none", textShadow: "0 0 2px black" }}
                >
                  {calibration.realDistanceMm.toFixed(1)} {t.common.mm}
                </text>
              )}
            </g>
          )}

          {/* ── Calibration point markers (Item 6) ──
              Fixed pixel sizes (not scaled by zoom).
              - Small visible marker: ~10px diameter
              - Large invisible hit area: ~24px diameter
              - Active point highlighted with ring
              - Unconfirmed: dashed border
              - Confirmed: solid border
              - Cursor: grab/grabbing for draggable points */}

          {calibrationPoints?.point1 && (
            <g>
              {/* Active highlight ring (Item 6d) */}
              {activeCalibrationPoint === 1 && (
                <circle
                  cx={calibrationPoints.point1.x}
                  cy={calibrationPoints.point1.y}
                  r={calHitR * 1.3}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth={pxToViewBox(2)}
                  vectorEffect="non-scaling-stroke"
                  style={{ pointerEvents: "none", opacity: 0.8 }}
                />
              )}
              {/* Large transparent interaction circle (drag hit area) */}
              <circle
                className="calibration-marker"
                data-calibration-point="1"
                cx={calibrationPoints.point1.x}
                cy={calibrationPoints.point1.y}
                r={calHitR}
                fill="white" fillOpacity={0.001}
                style={{
                  pointerEvents: "none",
                  cursor: calibrationStage === "reviewing-point-1"
                    ? (isDraggingMarker ? "grabbing" : "grab")
                    : "default",
                }}
              />
              {/* Small visible marker (Item 6a, 6e, 6f) */}
              <circle
                cx={calibrationPoints.point1.x}
                cy={calibrationPoints.point1.y}
                r={calMarkerR}
                fill={point1Confirmed ? "#10b981" : "#fbbf24"}
                stroke="white"
                strokeWidth={pxToViewBox(2)}
                strokeDasharray={point1Confirmed ? undefined : `${pxToViewBox(2)} ${pxToViewBox(1.5)}`}
                vectorEffect="non-scaling-stroke"
                style={{ pointerEvents: "none" }}
              />
              {/* Small label offset from marker */}
              <text
                x={calibrationPoints.point1.x + calHitR}
                y={calibrationPoints.point1.y - calHitR * 0.7}
                fill={point1Confirmed ? "#10b981" : "#fbbf24"}
                fontSize={0.01}
                className="select-none"
                style={{ pointerEvents: "none", textShadow: "0 0 2px black" }}
              >
                P1
              </text>
            </g>
          )}

          {calibrationPoints?.point2 && (
            <g>
              {/* Active highlight ring (Item 6d) */}
              {activeCalibrationPoint === 2 && (
                <circle
                  cx={calibrationPoints.point2.x}
                  cy={calibrationPoints.point2.y}
                  r={calHitR * 1.3}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth={pxToViewBox(2)}
                  vectorEffect="non-scaling-stroke"
                  style={{ pointerEvents: "none", opacity: 0.8 }}
                />
              )}
              {/* Large transparent interaction circle (drag hit area) */}
              <circle
                className="calibration-marker"
                data-calibration-point="2"
                cx={calibrationPoints.point2.x}
                cy={calibrationPoints.point2.y}
                r={calHitR}
                fill="white" fillOpacity={0.001}
                style={{
                  pointerEvents: "none",
                  cursor: calibrationStage === "reviewing-point-2"
                    ? (isDraggingMarker ? "grabbing" : "grab")
                    : "default",
                }}
              />
              {/* Small visible marker (Item 6a, 6e, 6f) */}
              <circle
                cx={calibrationPoints.point2.x}
                cy={calibrationPoints.point2.y}
                r={calMarkerR}
                fill={point2Confirmed ? "#10b981" : "#fbbf24"}
                stroke="white"
                strokeWidth={pxToViewBox(2)}
                strokeDasharray={point2Confirmed ? undefined : `${pxToViewBox(2)} ${pxToViewBox(1.5)}`}
                vectorEffect="non-scaling-stroke"
                style={{ pointerEvents: "none" }}
              />
              {/* Small label offset from marker */}
              <text
                x={calibrationPoints.point2.x + calHitR}
                y={calibrationPoints.point2.y - calHitR * 0.7}
                fill={point2Confirmed ? "#10b981" : "#fbbf24"}
                fontSize={0.01}
                className="select-none"
                style={{ pointerEvents: "none", textShadow: "0 0 2px black" }}
              >
                P2
              </text>
            </g>
          )}

          {/* ── Landmark markers (Item 8h) ──
              Fixed pixel sizes (not scaled by zoom).
              - Small visible marker: ~10px diameter
              - Large invisible hit area: ~24px diameter
              - Cursor: grab/grabbing for draggable points */}
          {LANDMARK_DEFINITIONS.map((def) => {
            const lm = landmarks[def.name];
            if (!lm) return null;
            const color = landmarkColor(def.name);
            const isActive = activeLandmark === def.name;
            const isAiCandidate = !!aiCandidateLandmarks[def.name];
            return (
              <g key={def.name}>
                {/* Active ring */}
                {isActive && (
                  <circle
                    cx={lm.x}
                    cy={lm.y}
                    r={lmActiveRingR}
                    fill="none"
                    stroke="#f97316"
                    strokeWidth={pxToViewBox(2)}
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                {/* AI Candidate Dashed Halo */}
                {isAiCandidate && !isActive && (
                  <circle
                    cx={lm.x}
                    cy={lm.y}
                    r={lmHitR * 1.3}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={pxToViewBox(2)}
                    strokeDasharray={`${pxToViewBox(3)} ${pxToViewBox(2)}`}
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                {/* Large transparent interaction circle (hit area) */}
                <circle
                  className="landmark-marker"
                  data-landmark={def.name}
                  cx={lm.x}
                  cy={lm.y}
                  r={lmHitR}
                  fill="white" fillOpacity={0.001}
                  style={{
                    pointerEvents: "none",
                    cursor: isDraggingMarker ? "grabbing" : "grab",
                  }}
                />
                {/* Small visible marker */}
                <circle
                  cx={lm.x}
                  cy={lm.y}
                  r={lmMarkerR}
                  fill={color}
                  stroke="white"
                  strokeWidth={pxToViewBox(2)}
                  vectorEffect="non-scaling-stroke"
                  style={{ pointerEvents: "none" }}
                />
                <text
                  x={lm.x + lmHitR}
                  y={lm.y - lmHitR * 0.7}
                  fill={isAiCandidate ? "#fde047" : "white"}
                  fontSize={0.01}
                  className="select-none font-bold"
                  style={{ pointerEvents: "none", textShadow: "0 0 2px black" }}
                >
                  {def.label}{isAiCandidate ? " (AI)" : ""}
                </text>
                {/* Delete button — small red badge with × */}
                <g
                  className="delete-btn"
                  data-delete={def.name}
                  style={{ cursor: "pointer", pointerEvents: "all" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteLandmark(def.name);
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <circle
                    cx={lm.x + lmHitR * 0.7}
                    cy={lm.y + lmHitR * 0.7}
                    r={deleteBtnR}
                    fill="#dc2626"
                    stroke="white"
                    strokeWidth={pxToViewBox(1)}
                    vectorEffect="non-scaling-stroke"
                  />
                  <text
                    x={lm.x + lmHitR * 0.7}
                    y={lm.y + lmHitR * 0.7}
                    fill="white"
                    fontSize={deleteBtnR * 1.4}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="select-none font-bold"
                    style={{ pointerEvents: "none" }}
                  >
                    ×
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}