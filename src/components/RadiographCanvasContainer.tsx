// ── Radiograph Canvas Container Component ────────────────────
// Architectural Constraint: Unified Canvas Aspect Wrapper.
// Enforces zero-padding, zero-margin, matching aspect-ratio, and 1:1 layout binding
// between the radiograph <img> element and the <RadiographOverlay /> SVG overlay.

import React from "react";
import { useStudyStore } from "../store/studyStore";
import { RadiographOverlay } from "./RadiographOverlay";

export interface RadiographCanvasContainerProps {
  /** Mode: 'aspect' for responsive aspect-ratio container (Report Modal), 'fitted' for absolute pan/zoom frame (ImageViewer), or 'fill' */
  mode?: "aspect" | "fitted" | "fill";
  /** If true, overlay is in read-only mode (hides drag handles, delete buttons, active rings) */
  readOnly?: boolean;
  /** Whether the measurement overlay lines/markers are visible */
  showOverlay?: boolean;
  /** Custom pixel-to-viewBox scaling helper */
  pxToViewBox?: (px: number) => number;
  /** Whether a marker is currently being dragged */
  isDraggingMarker?: boolean;
  /** Click handler on the SVG overlay */
  onOverlayClick?: (e: React.MouseEvent<SVGSVGElement>) => void;
  /** Optional CSS filter for the image (e.g. brightness, contrast) */
  imageFilter?: string;
  /** Additional container CSS class names */
  className?: string;
  /** Additional container inline styles (e.g. pan/zoom transform or fitted frame dimensions) */
  style?: React.CSSProperties;
}

export function RadiographCanvasContainer({
  mode = "aspect",
  readOnly = false,
  showOverlay = true,
  pxToViewBox,
  isDraggingMarker = false,
  onOverlayClick,
  imageFilter,
  className = "",
  style,
}: RadiographCanvasContainerProps) {
  const imageDataUrl = useStudyStore((s) => s.imageDataUrl);
  const imageNaturalWidth = useStudyStore((s) => s.imageNaturalWidth);
  const imageNaturalHeight = useStudyStore((s) => s.imageNaturalHeight);

  if (!imageDataUrl) return null;

  const natW = imageNaturalWidth || 1200;
  const natH = imageNaturalHeight || 800;

  // Base container styles ensuring zero offset, padding, or margin discrepancies
  const baseContainerStyle: React.CSSProperties =
    mode === "aspect"
      ? {
          position: "relative",
          display: "block",
          width: "100%",
          aspectRatio: `${natW} / ${natH}`,
          overflow: "hidden",
          padding: 0,
          margin: 0,
          lineHeight: 0,
          ...style,
        }
      : mode === "fitted"
      ? {
          position: "absolute",
          overflow: "hidden",
          padding: 0,
          margin: 0,
          lineHeight: 0,
          ...style,
        }
      : {
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          padding: 0,
          margin: 0,
          lineHeight: 0,
          ...style,
        };

  return (
    <div
      data-testid="radiograph-canvas-container"
      className={`radiograph-canvas-container select-none ${className}`}
      style={baseContainerStyle}
    >
      {/* ── 1. Image Layer (Tightly bound to container) ── */}
      <img
        data-testid="radiograph-img"
        src={imageDataUrl}
        alt="Panoramic Radiograph"
        className="block w-full h-full object-fill pointer-events-none"
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "fill",
          margin: 0,
          padding: 0,
          border: "none",
          filter: imageFilter || undefined,
          userSelect: "none",
        }}
        draggable={false}
      />

      {/* ── 2. SVG Overlay Layer (Strictly 1:1 Inset Bounding Parity) ── */}
      <RadiographOverlay
        data-testid="radiograph-overlay-svg"
        readOnly={readOnly}
        showOverlay={showOverlay}
        pxToViewBox={pxToViewBox}
        isDraggingMarker={isDraggingMarker}
        onClick={onOverlayClick}
        preserveAspectRatio="none"
        className={`absolute inset-0 h-full w-full overlay-svg ${
          readOnly ? "pointer-events-none" : "pointer-events-all"
        }`}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          margin: 0,
          padding: 0,
          border: "none",
        }}
      />
    </div>
  );
}
