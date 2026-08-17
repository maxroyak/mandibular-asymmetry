// ── Radiograph SVG Overlay Component ──────────────────────────
// Single Source of Truth for Radiograph Visual Overlays (WYSIWYG).
// Shared between interactive viewport (ImageViewer) and print report (ClinicalReportModal).

import React, { useMemo } from "react";
import { useStudyStore } from "../store/studyStore";
import { getTranslations } from "../locales";
import { LANDMARK_DEFINITIONS, type LandmarkName } from "../domain/types";

export interface RadiographOverlayProps {
  /** If true, hides interactive hit areas, drag cursors, active rings, and delete buttons. */
  readOnly?: boolean;
  /** Whether the visual overlay (lines & labels) is visible. Default: true */
  showOverlay?: boolean;
  /** Custom pixel-to-viewBox scaling helper */
  pxToViewBox?: (px: number) => number;
  /** Whether a marker is actively being dragged (for cursor state) */
  isDraggingMarker?: boolean;
  /** Click handler for interactive placement */
  onClick?: (e: React.MouseEvent<SVGSVGElement>) => void;
  /** Additional CSS class names */
  className?: string;
  /** Additional inline styles (e.g. pan/zoom transform) */
  style?: React.CSSProperties;
  /** SVG element reference */
  svgRef?: React.RefObject<SVGSVGElement | null>;
}

const RIGHT_COLOR = "#2563eb"; // Blue
const LEFT_COLOR = "#16a34a";  // Green
const MIDLINE_COLOR = "#f59e0b"; // Amber

export function landmarkColor(name: string): string {
  const def = LANDMARK_DEFINITIONS.find((l) => l.name === name);
  if (!def) return "#ef4444";
  if (def.side === "right") return RIGHT_COLOR;
  if (def.side === "left") return LEFT_COLOR;
  return MIDLINE_COLOR;
}

export function RadiographOverlay({
  readOnly = false,
  showOverlay = true,
  pxToViewBox,
  isDraggingMarker = false,
  onClick,
  className = "absolute inset-0 h-full w-full overlay-svg",
  style,
  svgRef,
}: RadiographOverlayProps) {
  const language = useStudyStore((s) => s.language);
  const landmarks = useStudyStore((s) => s.landmarks);
  const aiCandidateLandmarks = useStudyStore((s) => s.aiCandidateLandmarks);
  const activeLandmark = useStudyStore((s) => s.activeLandmark);
  const deleteLandmark = useStudyStore((s) => s.deleteLandmark);
  const calibration = useStudyStore((s) => s.calibration);
  const calibrationPoints = useStudyStore((s) => s.calibrationPoints);
  const calibrationStage = useStudyStore((s) => s.calibrationStage);
  const mandibularResult = useStudyStore((s) => s.mandibularResult);
  const hoveredLine = useStudyStore((s) => s.hoveredLine);

  const activeCalibrationPoint: 1 | 2 | null =
    calibrationStage === "placing-point-1" || calibrationStage === "reviewing-point-1"
      ? 1
      : calibrationStage === "placing-point-2" || calibrationStage === "reviewing-point-2"
      ? 2
      : null;

  const t = getTranslations(language);

  // Fallback px-to-viewBox converter (normalized 0..1 space based on standard 600px viewport)
  const p2v = pxToViewBox || ((px: number) => px / 600);

  const isCalibrated = calibration !== null;
  const point1Confirmed =
    calibrationStage === "reviewing-point-2" ||
    calibrationStage === "entering-distance" ||
    calibrationStage === "calibrated";
  const point2Confirmed =
    calibrationStage === "entering-distance" ||
    calibrationStage === "calibrated";

  const calMarkerR = p2v(5);
  const calHitR = p2v(14);
  const lmMarkerR = p2v(5);
  const lmHitR = p2v(14);
  const lmActiveRingR = p2v(18);
  const deleteBtnR = p2v(7);

  const lineDefs = useMemo(
    () => [
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
    ],
    [landmarks, mandibularResult, t]
  );

  return (
    <svg
      ref={svgRef}
      className={className}
      viewBox="0 0 1 1"
      preserveAspectRatio="xMidYMid meet"
      onClick={onClick}
      style={{
        pointerEvents: readOnly ? "none" : "all",
        ...style,
      }}
    >
      {/* ── 1. Measurement Lines with mm Labels ── */}
      {showOverlay &&
        lineDefs.map((line) => {
          if (!line.from || !line.to) return null;
          const isHovered = !readOnly && hoveredLine === line.id;
          const midX = (line.from.x + line.to.x) / 2;
          const midY = (line.from.y + line.to.y) / 2;
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
                strokeWidth={isHovered ? 0.006 : 0.0035}
                opacity={!readOnly && hoveredLine && !isHovered ? 0.3 : 1}
                vectorEffect="non-scaling-stroke"
                style={{
                  filter: isHovered ? "drop-shadow(0 0 3px rgba(255,255,255,0.8))" : "none",
                  transition: "stroke-width 0.15s, opacity 0.15s",
                }}
              />
              {/* Dark pill label background */}
              <rect
                x={midX - 0.08}
                y={midY - 0.025}
                width={0.16}
                height={0.022}
                fill="rgba(0,0,0,0.75)"
                rx={0.004}
                ry={0.004}
                style={{ pointerEvents: "none" }}
              />
              {/* Measurement name + mm value text */}
              <text
                x={midX}
                y={midY}
                fill={showMm ? "#ffffff" : "#fbbf24"}
                fontSize={0.012}
                textAnchor="middle"
                dy="-0.005"
                className="select-none font-sans font-medium"
                style={{ pointerEvents: "none", textShadow: "0 0 2px black" }}
              >
                {label}
              </text>
            </g>
          );
        })}

      {/* ── 2. Calibration Line & Distance Label ── */}
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
              className="select-none font-bold"
              style={{ pointerEvents: "none", textShadow: "0 0 2px black" }}
            >
              {calibration.realDistanceMm.toFixed(1)} {t.common.mm}
            </text>
          )}
        </g>
      )}

      {/* ── 3. Calibration Point P1 Marker ── */}
      {calibrationPoints?.point1 && (
        <g>
          {/* Active highlight ring (interactive mode only) */}
          {!readOnly && activeCalibrationPoint === 1 && (
            <circle
              cx={calibrationPoints.point1.x}
              cy={calibrationPoints.point1.y}
              r={calHitR * 1.3}
              fill="none"
              stroke="#fbbf24"
              strokeWidth={p2v(2)}
              vectorEffect="non-scaling-stroke"
              style={{ pointerEvents: "none", opacity: 0.8 }}
            />
          )}

          {/* Large transparent interaction hit area (interactive mode only) */}
          {!readOnly && (
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
                cursor:
                  calibrationStage === "reviewing-point-1" ||
                  calibrationStage === "reviewing-point-2" ||
                  calibrationStage === "entering-distance" ||
                  calibrationStage === "calibrated" ||
                  calibrationStage === "idle"
                    ? isDraggingMarker
                      ? "grabbing"
                      : "grab"
                    : "default",
              }}
            />
          )}

          {/* Small visible marker */}
          <circle
            cx={calibrationPoints.point1.x}
            cy={calibrationPoints.point1.y}
            r={calMarkerR}
            fill={point1Confirmed ? "#10b981" : "#fbbf24"}
            stroke="white"
            strokeWidth={p2v(2)}
            strokeDasharray={
              point1Confirmed ? undefined : `${p2v(2)} ${p2v(1.5)}`
            }
            vectorEffect="non-scaling-stroke"
            style={{ pointerEvents: "none" }}
          />

          {/* Label offset from marker */}
          <text
            x={calibrationPoints.point1.x + calHitR}
            y={calibrationPoints.point1.y - calHitR * 0.7}
            fill={point1Confirmed ? "#10b981" : "#fbbf24"}
            fontSize={0.01}
            className="select-none font-bold"
            style={{ pointerEvents: "none", textShadow: "0 0 2px black" }}
          >
            P1
          </text>
        </g>
      )}

      {/* ── 4. Calibration Point P2 Marker ── */}
      {calibrationPoints?.point2 && (
        <g>
          {/* Active highlight ring (interactive mode only) */}
          {!readOnly && activeCalibrationPoint === 2 && (
            <circle
              cx={calibrationPoints.point2.x}
              cy={calibrationPoints.point2.y}
              r={calHitR * 1.3}
              fill="none"
              stroke="#fbbf24"
              strokeWidth={p2v(2)}
              vectorEffect="non-scaling-stroke"
              style={{ pointerEvents: "none", opacity: 0.8 }}
            />
          )}

          {/* Large transparent interaction hit area (interactive mode only) */}
          {!readOnly && (
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
                cursor:
                  calibrationStage === "reviewing-point-2" ||
                  calibrationStage === "entering-distance" ||
                  calibrationStage === "calibrated" ||
                  calibrationStage === "idle"
                    ? isDraggingMarker
                      ? "grabbing"
                      : "grab"
                    : "default",
              }}
            />
          )}

          {/* Small visible marker */}
          <circle
            cx={calibrationPoints.point2.x}
            cy={calibrationPoints.point2.y}
            r={calMarkerR}
            fill={point2Confirmed ? "#10b981" : "#fbbf24"}
            stroke="white"
            strokeWidth={p2v(2)}
            strokeDasharray={
              point2Confirmed ? undefined : `${p2v(2)} ${p2v(1.5)}`
            }
            vectorEffect="non-scaling-stroke"
            style={{ pointerEvents: "none" }}
          />

          {/* Label offset from marker */}
          <text
            x={calibrationPoints.point2.x + calHitR}
            y={calibrationPoints.point2.y - calHitR * 0.7}
            fill={point2Confirmed ? "#10b981" : "#fbbf24"}
            fontSize={0.01}
            className="select-none font-bold"
            style={{ pointerEvents: "none", textShadow: "0 0 2px black" }}
          >
            P2
          </text>
        </g>
      )}

      {/* ── 5. Anatomical & AI Candidate Landmark Markers ── */}
      {LANDMARK_DEFINITIONS.map((def) => {
        const lm = landmarks[def.name];
        if (!lm) return null;
        const color = landmarkColor(def.name);
        const isActive = !readOnly && activeLandmark === def.name;
        const isAiCandidate = !!aiCandidateLandmarks[def.name];

        return (
          <g key={def.name}>
            {/* Active placement ring */}
            {isActive && (
              <circle
                cx={lm.x}
                cy={lm.y}
                r={lmActiveRingR}
                fill="none"
                stroke="#f97316"
                strokeWidth={p2v(2)}
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
                strokeWidth={p2v(2)}
                strokeDasharray={`${p2v(3)} ${p2v(2)}`}
                vectorEffect="non-scaling-stroke"
              />
            )}

            {/* Large transparent interaction hit area (interactive mode only) */}
            {!readOnly && (
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
            )}

            {/* Small visible marker */}
            <circle
              cx={lm.x}
              cy={lm.y}
              r={lmMarkerR}
              fill={color}
              stroke="white"
              strokeWidth={p2v(2)}
              vectorEffect="non-scaling-stroke"
              style={{ pointerEvents: "none" }}
            />

            {/* Landmark Label */}
            <text
              x={lm.x + lmHitR}
              y={lm.y - lmHitR * 0.7}
              fill={isAiCandidate ? "#fde047" : "white"}
              fontSize={0.01}
              className="select-none font-bold"
              style={{ pointerEvents: "none", textShadow: "0 0 2px black" }}
            >
              {def.label}
              {isAiCandidate ? " (AI)" : ""}
            </text>

            {/* Delete button (small red badge with ×, interactive mode only) */}
            {!readOnly && (
              <g
                className="delete-btn"
                data-delete={def.name}
                style={{ cursor: "pointer", pointerEvents: "all" }}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteLandmark(def.name as LandmarkName);
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
                  strokeWidth={p2v(1)}
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
            )}
          </g>
        );
      })}
    </svg>
  );
}
