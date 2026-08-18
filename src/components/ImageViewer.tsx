import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import { useStudyStore } from "../store/studyStore";
import { RadiographCanvasContainer } from "./RadiographCanvasContainer";
import { LANDMARK_DEFINITIONS } from "../domain/types";
import type { Point, LandmarkName, CalibrationStage } from "../domain/types";
import {
  screenToNormalized as transformScreenToNormalized,
  computeFittedImageRect,
} from "../domain/coordinateTransform";
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
// Marker hit area sizes in CSS pixels (not scaled by zoom).
const CALIBRATION_HIT_AREA_PX = 12;   // 24px diameter hit area
const LANDMARK_HIT_AREA_PX = 12;      // 24px diameter hit area

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
  const [showAiOverwriteModal, setShowAiOverwriteModal] = useState(false);

  const language = useStudyStore((s) => s.language);
  const t = getTranslations(language);

  const imageDataUrl = useStudyStore((s) => s.imageDataUrl);
  const imageNaturalWidth = useStudyStore((s) => s.imageNaturalWidth);
  const imageNaturalHeight = useStudyStore((s) => s.imageNaturalHeight);
  const viewer = useStudyStore((s) => s.viewer);
  const landmarks = useStudyStore((s) => s.landmarks);
  const activeLandmark = useStudyStore((s) => s.activeLandmark);
  const calibrationPoints = useStudyStore((s) => s.calibrationPoints);
  const calibrationStage = useStudyStore((s) => s.calibrationStage);
  const isAiDetecting = useStudyStore((s) => s.isAiDetecting);
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

  // ── Compute fitted image bounding box inside the container ──
  const fitted = useMemo(() => {
    if (!containerSize.w || !containerSize.h || !imageNaturalWidth || !imageNaturalHeight) {
      return { left: 0, top: 0, width: containerSize.w || 1000, height: containerSize.h || 600 };
    }
    return computeFittedImageRect(
      { left: 0, top: 0, width: containerSize.w, height: containerSize.h },
      { naturalWidth: imageNaturalWidth, naturalHeight: imageNaturalHeight }
    );
  }, [containerSize.w, containerSize.h, imageNaturalWidth, imageNaturalHeight]);

  // ── Convert CSS pixel size to SVG viewBox units ─────────────
  const pxToViewBox = useCallback(
    (px: number): number => {
      const base = Math.min(fitted.width, fitted.height);
      if (base <= 0 || viewer.zoom <= 0) return px / 1000; // fallback
      return px / (base * viewer.zoom);
    },
    [fitted.width, fitted.height, viewer.zoom]
  );

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
          const svg = (container.querySelector("svg.overlay-svg") || container.querySelector("svg")) as SVGSVGElement | null;
          if (svg) {
            const pt = svg.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            const ctm = svg.getScreenCTM();
            if (ctm) {
              const svgPt = pt.matrixTransform(ctm.inverse());
              const natW = imageNaturalWidth || 1200;
              const natH = imageNaturalHeight || 800;
              const normPt = { x: svgPt.x / natW, y: svgPt.y / natH };

              // Check calibration points first (higher priority than landmarks)
              const calHitRadius = pxToViewBox(CALIBRATION_HIT_AREA_PX);
              for (const which of [1, 2] as const) {
                const cp =
                  which === 1 ? calibrationPoints?.point1 : calibrationPoints?.point2;
                if (!cp) continue;
                const canDrag =
                  (which === 1 &&
                    (stage === "reviewing-point-1" ||
                      stage === "reviewing-point-2" ||
                      stage === "entering-distance" ||
                      stage === "calibrated" ||
                      stage === "idle")) ||
                  (which === 2 &&
                    (stage === "reviewing-point-2" ||
                      stage === "entering-distance" ||
                      stage === "calibrated" ||
                      stage === "idle"));

                if (!canDrag) continue;

                const dx = normPt.x - cp.x;
                const dy = normPt.y - cp.y;
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

              // Check landmarks — find closest within hit radius
              let closest: LandmarkName | null = null;
              let closestDist = Infinity;
              const lmHitRadius = pxToViewBox(LANDMARK_HIT_AREA_PX);
              for (const def of LANDMARK_DEFINITIONS) {
                const lm = landmarks[def.name];
                if (!lm) continue;
                const dx = normPt.x - lm.x;
                const dy = normPt.y - lm.y;
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

  return (
    <div className="flex h-full flex-col">
      {/* Viewer Toolbar */}
      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2">
        {/* Zoom & View Controls Group */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(viewer.zoom * 1.2)}
            className="px-2.5 py-1 text-xs font-semibold rounded border border-gray-300 hover:bg-gray-100 bg-white"
            title={t.viewer.zoomIn}
          >
            🔍+
          </button>
          <button
            onClick={() => setZoom(viewer.zoom * 0.8)}
            className="px-2.5 py-1 text-xs font-semibold rounded border border-gray-300 hover:bg-gray-100 bg-white"
            title={t.viewer.zoomOut}
          >
            🔍−
          </button>
          <button
            onClick={fitToScreen}
            className="px-2.5 py-1 text-xs font-medium rounded border border-gray-300 hover:bg-gray-100 bg-white text-gray-700"
            title={t.viewer.fitScreenTooltip}
          >
            {t.viewer.fitScreen}
          </button>
          <button
            onClick={resetViewer}
            className="px-2.5 py-1 text-xs font-medium rounded border border-gray-300 hover:bg-gray-100 bg-white text-gray-700"
            title={t.viewer.resetViewTooltip}
          >
            {t.viewer.resetView}
          </button>
        </div>

        <div className="mx-1 text-xs text-gray-300">|</div>

        {/* Image Adjustments */}
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

        <div className="mx-1 text-xs text-gray-300">|</div>

        {/* Show/hide measurement overlay toggle */}
        <button
          onClick={() => setShowOverlay(!showOverlay)}
          className={`px-3 py-1 text-xs font-medium rounded border ${
            showOverlay
              ? "border-blue-400 bg-blue-50 text-blue-700"
              : "border-gray-300 hover:bg-gray-100 bg-white text-gray-600"
          }`}
          title={showOverlay ? t.viewer.hideOverlay : t.viewer.showOverlay}
        >
          {showOverlay
            ? `📊 ${language === "ru" ? "Оверлей" : "Overlay"}`
            : `📊 ${language === "ru" ? "Скрыт" : "Off"}`}
        </button>

        <div className="mx-1 text-xs text-gray-300">|</div>

        {/* AI Auto-Detect Trigger */}
        <button
          onClick={() => {
            const placedCount = Object.keys(landmarks).filter((k) => landmarks[k as LandmarkName]).length;
            if (placedCount > 0) {
              setShowAiOverwriteModal(true);
            } else {
              detectLandmarksAi();
            }
          }}
          disabled={isAiDetecting}
          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded bg-indigo-50 border border-indigo-300 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors shadow-2xs"
          title={t.ai.detectButtonTooltip}
        >
          <span>{isAiDetecting ? "⏳" : "🪄"}</span>
          <span>{isAiDetecting ? t.ai.detecting : t.ai.detectButton}</span>
        </button>

        <div className="ml-auto text-xs text-gray-400">
          Zoom: {viewer.zoom.toFixed(1)}x
        </div>
      </div>

      {/* AI Overwrite Confirmation Modal */}
      {showAiOverwriteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-lg">
                🪄
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  {t.ai.confirmOverwriteTitle}
                </h3>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                  {t.ai.confirmOverwriteMessage}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowAiOverwriteModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAiOverwriteModal(false);
                  detectLandmarksAi();
                }}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 transition-colors shadow-2xs"
              >
                {t.ai.confirmOverwriteAction}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image + Overlay */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden bg-black"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        style={{
          cursor: isDraggingMarker
            ? "none"
            : panMode || (!activeLandmark && !isCalibratingStage(calibrationStage) && interactionMode.current === "pan")
            ? "grab"
            : (activeLandmark || isCalibratingStage(calibrationStage))
            ? "crosshair"
            : "default",
        }}
      >
        {/* Synchronized Image & SVG Overlay Frame via Unified RadiographCanvasContainer */}
        {imageDataUrl && (
          <RadiographCanvasContainer
            mode="fitted"
            style={{
              left: `${fitted.left}px`,
              top: `${fitted.top}px`,
              width: `${fitted.width}px`,
              height: `${fitted.height}px`,
              transform: `translate(${viewer.panX}px, ${viewer.panY}px) scale(${viewer.zoom})`,
              transformOrigin: "center",
            }}
            imageFilter={`brightness(${viewer.brightness}) contrast(${viewer.contrast})`}
            showOverlay={showOverlay}
            pxToViewBox={pxToViewBox}
            isDraggingMarker={isDraggingMarker}
            onOverlayClick={handleOverlayClick}
            readOnly={false}
          />
        )}
      </div>
    </div>
  );
}