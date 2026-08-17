// ── Radiograph SVG Overlay Component ──────────────────────────
// Single Source of Truth for Radiograph Visual Overlays (WYSIWYG).
// Uses isotropic pixel-space viewBox={`0 0 ${natW} ${natH}`} to ensure 100% round circles.

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
  /** SVG aspect ratio preservation behavior. Default: 'none' */
  preserveAspectRatio?: string;
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
  isDraggingMarker = false,
  onClick,
  className = "absolute inset-0 h-full w-full overlay-svg",
  style,
  svgRef,
  preserveAspectRatio = "none",
}: RadiographOverlayProps) {
  const language = useStudyStore((s) => s.language);
  const imageNaturalWidth = useStudyStore((s) => s.imageNaturalWidth);
  const imageNaturalHeight = useStudyStore((s) => s.imageNaturalHeight);
  const landmarks = useStudyStore((s) => s.landmarks);
  const aiCandidateLandmarks = useStudyStore((s) => s.aiCandidateLandmarks);
  const activeLandmark = useStudyStore((s) => s.activeLandmark);
  const deleteLandmark = useStudyStore((s) => s.deleteLandmark);
  const calibration = useStudyStore((s) => s.calibration);
  const calibrationPoints = useStudyStore((s) => s.calibrationPoints);
  const calibrationStage = useStudyStore((s) => s.calibrationStage);
  const mandibularResult = useStudyStore((s) => s.mandibularResult);
  const hoveredLine = useStudyStore((s) => s.hoveredLine);

  const natW = imageNaturalWidth || 1200;
  const natH = imageNaturalHeight || 800;

  const activeCalibrationPoint: 1 | 2 | null =
    calibrationStage === "placing-point-1" || calibrationStage === "reviewing-point-1"
      ? 1
      : calibrationStage === "placing-point-2" || calibrationStage === "reviewing-point-2"
      ? 2
      : null;

  const t = getTranslations(language);

  const isCalibrated = calibration !== null;
  const point1Confirmed =
    calibrationStage === "reviewing-point-2" ||
    calibrationStage === "entering-distance" ||
    calibrationStage === "calibrated";
  const point2Confirmed =
    calibrationStage === "entering-distance" ||
    calibrationStage === "calibrated";

  // Isotropic dimension calculations based on pixel viewBox
  const lineBaseStroke = Math.max(2, natW * 0.003);
  const lineHoverStroke = Math.max(3.5, natW * 0.005);
  const markerRadius = Math.max(6, natW * 0.0075);
  const hitAreaRadius = Math.max(16, natW * 0.018);
  const activeRingRadius = Math.max(20, natW * 0.024);
  const fontSize = Math.max(12, natW * 0.012);
  const labelOffset = Math.max(18, natW * 0.02);
  const badgeWidth = Math.max(110, natW * 0.13);
  const badgeHeight = Math.max(22, natH * 0.035);
  const deleteBtnRadius = Math.max(8, natW * 0.009);

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
      viewBox={`0 0 ${natW} ${natH}`}
      preserveAspectRatio={preserveAspectRatio}
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
          const x1 = line.from.x * natW;
          const y1 = line.from.y * natH;
          const x2 = line.to.x * natW;
          const y2 = line.to.y * natH;
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          const showMm = isCalibrated && line.mm !== null;
          const label = showMm
            ? `${line.name}: ${line.mm!.toFixed(1)} ${t.common.mm}`
            : `${line.name}: ${t.overlay.calibrationRequired}`;

          return (
            <g key={line.id}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={line.color}
                strokeWidth={isHovered ? lineHoverStroke : lineBaseStroke}
                opacity={!readOnly && hoveredLine && !isHovered ? 0.3 : 1}
                style={{
                  filter: isHovered ? "drop-shadow(0 0 4px rgba(255,255,255,0.9))" : "none",
                  transition: "stroke-width 0.15s, opacity 0.15s",
                }}
              />
              {/* Dark pill label background */}
              <rect
                x={midX - badgeWidth / 2}
                y={midY - badgeHeight / 2}
                width={badgeWidth}
                height={badgeHeight}
                fill="rgba(0,0,0,0.75)"
                rx={badgeHeight * 0.25}
                ry={badgeHeight * 0.25}
                style={{ pointerEvents: "none" }}
              />
              {/* Measurement text */}
              <text
                x={midX}
                y={midY}
                fill={showMm ? "#ffffff" : "#fbbf24"}
                fontSize={fontSize}
                fontWeight="600"
                textAnchor="middle"
                dominantBaseline="central"
                className="select-none font-sans"
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
            x1={calibrationPoints.point1.x * natW}
            y1={calibrationPoints.point1.y * natH}
            x2={calibrationPoints.point2.x * natW}
            y2={calibrationPoints.point2.y * natH}
            stroke="#10b981"
            strokeWidth={lineBaseStroke * 1.1}
            strokeDasharray={`${natW * 0.015} ${natW * 0.008}`}
          />
          {calibrationStage === "calibrated" && calibration && (
            <text
              x={((calibrationPoints.point1.x + calibrationPoints.point2.x) / 2) * natW}
              y={((calibrationPoints.point1.y + calibrationPoints.point2.y) / 2) * natH}
              fill="#10b981"
              fontSize={fontSize}
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="central"
              className="select-none"
              style={{ pointerEvents: "none", textShadow: "0 0 3px black" }}
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
              cx={calibrationPoints.point1.x * natW}
              cy={calibrationPoints.point1.y * natH}
              r={hitAreaRadius * 1.3}
              fill="none"
              stroke="#fbbf24"
              strokeWidth={lineBaseStroke}
              style={{ pointerEvents: "none", opacity: 0.85 }}
            />
          )}

          {/* Large transparent interaction hit area (interactive mode only) */}
          {!readOnly && (
            <circle
              className="calibration-marker"
              data-calibration-point="1"
              cx={calibrationPoints.point1.x * natW}
              cy={calibrationPoints.point1.y * natH}
              r={hitAreaRadius}
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

          {/* Small visible marker (TRUE CIRCLE) */}
          <circle
            cx={calibrationPoints.point1.x * natW}
            cy={calibrationPoints.point1.y * natH}
            r={markerRadius}
            fill={point1Confirmed ? "#10b981" : "#fbbf24"}
            stroke="white"
            strokeWidth={lineBaseStroke * 0.7}
            strokeDasharray={
              point1Confirmed ? undefined : `${natW * 0.005} ${natW * 0.003}`
            }
            style={{ pointerEvents: "none" }}
          />

          {/* Label offset from marker */}
          <text
            x={calibrationPoints.point1.x * natW + labelOffset}
            y={calibrationPoints.point1.y * natH - labelOffset * 0.7}
            fill={point1Confirmed ? "#10b981" : "#fbbf24"}
            fontSize={fontSize * 0.9}
            fontWeight="bold"
            className="select-none"
            style={{ pointerEvents: "none", textShadow: "0 0 3px black" }}
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
              cx={calibrationPoints.point2.x * natW}
              cy={calibrationPoints.point2.y * natH}
              r={hitAreaRadius * 1.3}
              fill="none"
              stroke="#fbbf24"
              strokeWidth={lineBaseStroke}
              style={{ pointerEvents: "none", opacity: 0.85 }}
            />
          )}

          {/* Large transparent interaction hit area (interactive mode only) */}
          {!readOnly && (
            <circle
              className="calibration-marker"
              data-calibration-point="2"
              cx={calibrationPoints.point2.x * natW}
              cy={calibrationPoints.point2.y * natH}
              r={hitAreaRadius}
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

          {/* Small visible marker (TRUE CIRCLE) */}
          <circle
            cx={calibrationPoints.point2.x * natW}
            cy={calibrationPoints.point2.y * natH}
            r={markerRadius}
            fill={point2Confirmed ? "#10b981" : "#fbbf24"}
            stroke="white"
            strokeWidth={lineBaseStroke * 0.7}
            strokeDasharray={
              point2Confirmed ? undefined : `${natW * 0.005} ${natW * 0.003}`
            }
            style={{ pointerEvents: "none" }}
          />

          {/* Label offset from marker */}
          <text
            x={calibrationPoints.point2.x * natW + labelOffset}
            y={calibrationPoints.point2.y * natH - labelOffset * 0.7}
            fill={point2Confirmed ? "#10b981" : "#fbbf24"}
            fontSize={fontSize * 0.9}
            fontWeight="bold"
            className="select-none"
            style={{ pointerEvents: "none", textShadow: "0 0 3px black" }}
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
        const px = lm.x * natW;
        const py = lm.y * natH;

        return (
          <g key={def.name}>
            {/* Active placement ring (TRUE CIRCLE) */}
            {isActive && (
              <circle
                cx={px}
                cy={py}
                r={activeRingRadius}
                fill="none"
                stroke="#f97316"
                strokeWidth={lineBaseStroke}
              />
            )}

            {/* AI Candidate Dashed Halo (TRUE CIRCLE) */}
            {isAiCandidate && !isActive && (
              <circle
                cx={px}
                cy={py}
                r={hitAreaRadius * 1.3}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={lineBaseStroke}
                strokeDasharray={`${natW * 0.006} ${natW * 0.004}`}
              />
            )}

            {/* Large transparent interaction hit area (interactive mode only) */}
            {!readOnly && (
              <circle
                className="landmark-marker"
                data-landmark={def.name}
                cx={px}
                cy={py}
                r={hitAreaRadius}
                fill="white"
                fillOpacity={0.001}
                style={{
                  pointerEvents: "none",
                  cursor: isDraggingMarker ? "grabbing" : "grab",
                }}
              />
            )}

            {/* Small visible marker (TRUE CIRCLE) */}
            <circle
              cx={px}
              cy={py}
              r={markerRadius}
              fill={color}
              stroke="white"
              strokeWidth={lineBaseStroke * 0.7}
              style={{ pointerEvents: "none" }}
            />

            {/* Landmark Label */}
            <text
              x={px + labelOffset}
              y={py - labelOffset * 0.7}
              fill={isAiCandidate ? "#fde047" : "white"}
              fontSize={fontSize * 0.9}
              fontWeight="bold"
              className="select-none font-bold"
              style={{ pointerEvents: "none", textShadow: "0 0 3px black" }}
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
                  cx={px + labelOffset * 0.7}
                  cy={py + labelOffset * 0.7}
                  r={deleteBtnRadius}
                  fill="#dc2626"
                  stroke="white"
                  strokeWidth={lineBaseStroke * 0.5}
                />
                <text
                  x={px + labelOffset * 0.7}
                  y={py + labelOffset * 0.7}
                  fill="white"
                  fontSize={deleteBtnRadius * 1.3}
                  fontWeight="bold"
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
