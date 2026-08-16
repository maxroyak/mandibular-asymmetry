// ── Image Viewer ─────────────────────────────────────────────
// Container: image layer + SVG overlay layer + viewer controls.
// Handles landmark placement clicks, landmark dragging, pan/zoom.

import { useRef, useCallback, useEffect, useState } from "react";
import { useStudyStore } from "../store/studyStore";
import { LANDMARK_DEFINITIONS } from "../domain/types";
import type { Point, LandmarkName } from "../domain/types";

// ── Interaction mode ────────────────────────────────────────
// Tracks what the current pointer-down gesture is doing so that
// landmark dragging and image panning never interfere with each other.
type InteractionMode = "none" | "pan" | "drag-landmark";

export function ImageViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const interactionMode = useRef<InteractionMode>("none");
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const draggingLandmark = useRef<LandmarkName | null>(null);
  const activePointerId = useRef<number | null>(null);
  // isDraggingPlaced is a render-trigger flag so that click-after-drag is suppressed
  const [isDraggingPlaced, setIsDraggingPlaced] = useState(false);
  const [panMode, setPanMode] = useState(false);

  const imageDataUrl = useStudyStore((s) => s.imageDataUrl);
  const imageNaturalWidth = useStudyStore((s) => s.imageNaturalWidth);
  const imageNaturalHeight = useStudyStore((s) => s.imageNaturalHeight);
  const viewer = useStudyStore((s) => s.viewer);
  const landmarks = useStudyStore((s) => s.landmarks);
  const activeLandmark = useStudyStore((s) => s.activeLandmark);
  const calibrationPoints = useStudyStore((s) => s.calibrationPoints);
  const calibrationMode = useStudyStore((s) => s.calibrationMode);
  const isCalibrating = useStudyStore((s) => s.isCalibrating);
  const hoveredLine = useStudyStore((s) => s.hoveredLine);

  const setLandmark = useStudyStore((s) => s.setLandmark);
  const moveLandmark = useStudyStore((s) => s.moveLandmark);
  const setActiveLandmark = useStudyStore((s) => s.setActiveLandmark);
  const setZoom = useStudyStore((s) => s.setZoom);
  const setPan = useStudyStore((s) => s.setPan);
  const setBrightness = useStudyStore((s) => s.setBrightness);
  const setContrast = useStudyStore((s) => s.setContrast);
  const resetViewer = useStudyStore((s) => s.resetViewer);
  const fitToScreen = useStudyStore((s) => s.fitToScreen);
  const setCalibrationPoint = useStudyStore((s) => s.setCalibrationPoint);

  // ── One source of truth: mm values from the store ──────────
  // The overlay reads mandibularResult from the same store state that
  // the ResultsPanel uses. No recalculation in the UI layer.
  const mandibularResult = useStudyStore((s) => s.mandibularResult);
  const calibration = useStudyStore((s) => s.calibration);
  const isCalibrated = calibrationMode === "B" && calibration !== null;

  // ── Screen → normalized coordinate conversion ──────────────
  // Correct flow:
  //   Pointer (clientX, clientY)
  //     → Viewer-local (subtract container rect left/top)
  //     → Undo pan (subtract panX, panY)
  //     → Undo zoom (divide by zoom)
  //     → Image-display rect (object-contain fitted space)
  //     → Normalized (divide by displayed image w/h in that space)
  //     → Clamp [0, 1]
  //
  // The image is rendered with `object-contain` inside a full-container
  // <img>, then `transform: translate(panX,panY) scale(zoom)` is applied
  // with `transformOrigin: center`. The SVG overlay receives the same
  // transform so landmarks track the image exactly.
  //
  // `object-contain` centers the image and letterboxes it. We compute the
  // displayed image rectangle (offset + size) within the container so that
  // the normalized coordinate maps to actual image pixels, not container
  // pixels. This is essential for non-square images.
  const screenToNormalized = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };

      // 1. Viewer-local coordinates (CSS pixels relative to container)
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;

      // 2. Undo pan — pan is applied in container (pre-zoom) space
      const pannedX = localX - viewer.panX;
      const pannedY = localY - viewer.panY;

      // 3. Undo zoom — zoom scales about the container center
      //    transformOrigin: center → point' = center + (point - center) * zoom
      //    So to invert: point = center + (point' - center) / zoom
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const unzoomedX = cx + (pannedX - cx) / viewer.zoom;
      const unzoomedY = cy + (pannedY - cy) / viewer.zoom;

      // 4. Now we're back in the pre-transform container space.
      //    The <img> uses object-contain, so the actual displayed image
      //    rectangle may be smaller than the container (letterboxed).
      //    Compute the fitted image rect inside the container.
      const imgW = imageNaturalWidth || rect.width;
      const imgH = imageNaturalHeight || rect.height;
      const containerAR = rect.width / rect.height;
      const imageAR = imgW / imgH;

      let displayedW: number;
      let displayedH: number;
      if (imageAR > containerAR) {
        // Image is wider — fit to width, letterbox top/bottom
        displayedW = rect.width;
        displayedH = rect.width / imageAR;
      } else {
        // Image is taller — fit to height, letterbox left/right
        displayedH = rect.height;
        displayedW = rect.height * imageAR;
      }

      const offsetX = (rect.width - displayedW) / 2;
      const offsetY = (rect.height - displayedH) / 2;

      // 5. Map from displayed-image pixel space to normalized [0, 1]
      const normX = (unzoomedX - offsetX) / displayedW;
      const normY = (unzoomedY - offsetY) / displayedH;

      return {
        x: Math.max(0, Math.min(1, normX)),
        y: Math.max(0, Math.min(1, normY)),
      };
    },
    [viewer.panX, viewer.panY, viewer.zoom, imageNaturalWidth, imageNaturalHeight]
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

  // Click on overlay: place landmark or calibration point
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // Don't place if we were just dragging
      if (isDraggingPlaced) return;
      const point = screenToNormalized(e.clientX, e.clientY);

      // Calibration mode: place calibration points
      // isCalibrating is set true by startCalibration(); calibrationMode only
      // becomes "B" after computeCalibration() completes, so we must check
      // isCalibrating here — not calibrationMode — during point placement.
      if (isCalibrating) {
        const cp = useStudyStore.getState().calibrationPoints;
        if (!cp || !cp.point1) {
          setCalibrationPoint(0, point);
          return;
        }
        if (cp.point1 && !cp.point2) {
          setCalibrationPoint(1, point);
          return;
        }
      }

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
      calibrationMode,
      isCalibrating,
      setCalibrationPoint,
      isDraggingPlaced,
    ]
  );

  // Pointer down on container: decide interaction mode
  //   - landmark marker hit  → drag-landmark (with pointer capture)
  //   - empty area           → pan (unless a landmark is active for placement)
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const target = e.target as Element;

      // Check if we hit a landmark marker — start landmark drag
      if (target && target.classList?.contains("landmark-marker")) {
        const name = target.getAttribute("data-landmark") as LandmarkName;
        if (name) {
          interactionMode.current = "drag-landmark";
          draggingLandmark.current = name;
          activePointerId.current = e.pointerId;
          // Capture pointer so we keep receiving move events even if the
          // cursor leaves the landmark element
          try {
            (e.currentTarget as Element).setPointerCapture(e.pointerId);
          } catch {
            /* some browsers throw if already captured */
          }
          e.preventDefault();
          return;
        }
      }

      // Check if we hit a delete button — let the click handler deal with it
      if (target && target.classList?.contains("delete-btn")) {
        return; // Don't start panning; the click event will handle deletion
      }

      // If a landmark is active, don't pan — the click will place a landmark
      if (activeLandmark) return;

      // If calibration point placement is pending, don't pan
      if (isCalibrating) {
        const cp = useStudyStore.getState().calibrationPoints;
        if (!cp || !cp.point1 || !cp.point2) return;
      }

      // Start panning
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
    [activeLandmark, viewer.panX, viewer.panY, isCalibrating]
  );

  // Pointer move: pan or drag landmark depending on interaction mode
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
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
    [screenToNormalized, moveLandmark, setPan]
  );

  // Pointer up / cancel: end drag or pan
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
        setTimeout(() => setIsDraggingPlaced(false), 50);
      }

      interactionMode.current = "none";
      draggingLandmark.current = null;
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
      name: "R Ramus",
      mm: mandibularResult?.ramus.rightMm ?? null,
    },
    {
      id: "ramusL",
      from: landmarks.CoL,
      to: landmarks.GoL,
      color: LEFT_COLOR,
      name: "L Ramus",
      mm: mandibularResult?.ramus.leftMm ?? null,
    },
    {
      id: "bodyR",
      from: landmarks.GoR,
      to: landmarks.Me,
      color: RIGHT_COLOR,
      name: "R Body",
      mm: mandibularResult?.body.rightMm ?? null,
    },
    {
      id: "bodyL",
      from: landmarks.GoL,
      to: landmarks.Me,
      color: LEFT_COLOR,
      name: "L Body",
      mm: mandibularResult?.body.leftMm ?? null,
    },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Viewer Toolbar */}
      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2">
        <button
          onClick={() => setZoom(viewer.zoom * 1.2)}
          className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-100"
          title="Zoom in (+)"
        >
          🔍+
        </button>
        <button
          onClick={() => setZoom(viewer.zoom * 0.8)}
          className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-100"
          title="Zoom out (-)"
        >
          🔍−
        </button>
        <button
          onClick={fitToScreen}
          className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-100"
          title="Fit to screen (0)"
        >
          Fit
        </button>
        <div className="mx-2 text-xs text-gray-400">|</div>
        <label className="flex items-center gap-1 text-xs">
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
        <label className="flex items-center gap-1 text-xs">
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
        <button
          onClick={resetViewer}
          className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-100"
          title="Reset all (R)"
        >
          Reset
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
        style={{ cursor: panMode || (!activeLandmark && !isCalibrating && interactionMode.current === "pan") ? "grab" : (activeLandmark || isCalibrating) ? "crosshair" : "default" }}
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
          {/* Measurement lines with mm labels */}
          {lineDefs.map((line) => {
            if (!line.from || !line.to) return null;
            const isHovered = hoveredLine === line.id;
            const midX = (line.from.x + line.to.x) / 2;
            const midY = (line.from.y + line.to.y) / 2;
            // Calibration gating: show mm only when calibrated and value available
            const showMm = isCalibrated && line.mm !== null;
            const label = showMm
              ? `${line.name}: ${line.mm!.toFixed(1)} mm`
              : `${line.name}: calibration required`;
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
                  x={midX - 0.07}
                  y={midY - 0.025}
                  width={0.14}
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

          {/* Calibration line */}
          {calibrationPoints?.point1 && calibrationPoints?.point2 && (
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
            </g>
          )}

          {/* Calibration points — small visible marker + large transparent hit area */}
          {calibrationPoints?.point1 && (
            <g>
              {/* Large transparent interaction circle (Bug 4) */}
              <circle
                cx={calibrationPoints.point1.x}
                cy={calibrationPoints.point1.y}
                r={0.014}
                fill="transparent"
                style={{ pointerEvents: "all", cursor: "pointer" }}
              />
              {/* Small visible marker (Bug 3) */}
              <circle
                cx={calibrationPoints.point1.x}
                cy={calibrationPoints.point1.y}
                r={0.005}
                fill="#10b981"
                stroke="white"
                strokeWidth={0.002}
                vectorEffect="non-scaling-stroke"
                style={{ pointerEvents: "none" }}
              />
              {/* Small label offset from marker (Bug 7) */}
              <text
                x={calibrationPoints.point1.x + 0.012}
                y={calibrationPoints.point1.y - 0.008}
                fill="#10b981"
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
              {/* Large transparent interaction circle (Bug 4) */}
              <circle
                cx={calibrationPoints.point2.x}
                cy={calibrationPoints.point2.y}
                r={0.014}
                fill="transparent"
                style={{ pointerEvents: "all", cursor: "pointer" }}
              />
              {/* Small visible marker (Bug 3) */}
              <circle
                cx={calibrationPoints.point2.x}
                cy={calibrationPoints.point2.y}
                r={0.005}
                fill="#10b981"
                stroke="white"
                strokeWidth={0.002}
                vectorEffect="non-scaling-stroke"
                style={{ pointerEvents: "none" }}
              />
              {/* Small label offset from marker (Bug 7) */}
              <text
                x={calibrationPoints.point2.x + 0.012}
                y={calibrationPoints.point2.y - 0.008}
                fill="#10b981"
                fontSize={0.01}
                className="select-none"
                style={{ pointerEvents: "none", textShadow: "0 0 2px black" }}
              >
                P2
              </text>
            </g>
          )}

          {/* Landmark markers — small visible marker + large transparent hit area (Bug 5) */}
          {LANDMARK_DEFINITIONS.map((def) => {
            const lm = landmarks[def.name];
            if (!lm) return null;
            const color = landmarkColor(def.name);
            const isActive = activeLandmark === def.name;
            return (
              <g key={def.name}>
                {/* Active ring */}
                {isActive && (
                  <circle
                    cx={lm.x}
                    cy={lm.y}
                    r={0.018}
                    fill="none"
                    stroke="#f97316"
                    strokeWidth={0.003}
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                {/* Large transparent interaction circle (hit area) */}
                <circle
                  className="landmark-marker"
                  data-landmark={def.name}
                  cx={lm.x}
                  cy={lm.y}
                  r={0.014}
                  fill="transparent"
                  style={{ pointerEvents: "all", cursor: "grab" }}
                />
                {/* Small visible marker */}
                <circle
                  cx={lm.x}
                  cy={lm.y}
                  r={0.005}
                  fill={color}
                  stroke="white"
                  strokeWidth={0.002}
                  vectorEffect="non-scaling-stroke"
                  style={{ pointerEvents: "none" }}
                />
                <text
                  x={lm.x + 0.012}
                  y={lm.y - 0.008}
                  fill="white"
                  fontSize={0.01}
                  className="select-none font-bold"
                  style={{ pointerEvents: "none", textShadow: "0 0 2px black" }}
                >
                  {def.label}
                </text>
                {/* Delete button on hover — small circle with × */}
                <circle
                  cx={lm.x + 0.014}
                  cy={lm.y + 0.014}
                  r={0.005}
                  fill="rgba(220,38,38,0.8)"
                  className="delete-btn"
                  data-delete={def.name}
                  style={{ cursor: "pointer", pointerEvents: "all" }}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}