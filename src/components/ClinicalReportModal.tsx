// ── Clinical Report Modal & Printable View ────────────────────
// Formatted 1-page clinical standard report for PDF generation & printing.
// Responsive modal preview with pure client-side window.print() output.

import { useEffect, useRef } from "react";
import { useStudyStore } from "../store/studyStore";
import { getTranslations } from "../locales";
import { LANDMARK_DEFINITIONS } from "../domain/types";

interface ClinicalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RIGHT_COLOR = "#2563eb"; // Blue
const LEFT_COLOR = "#16a34a";  // Green

export function ClinicalReportModal({ isOpen, onClose }: ClinicalReportModalProps) {
  const language = useStudyStore((s) => s.language);
  const patientId = useStudyStore((s) => s.patientId);
  const imageDataUrl = useStudyStore((s) => s.imageDataUrl);
  const imageNaturalWidth = useStudyStore((s) => s.imageNaturalWidth);
  const imageNaturalHeight = useStudyStore((s) => s.imageNaturalHeight);
  const landmarks = useStudyStore((s) => s.landmarks);
  const calibration = useStudyStore((s) => s.calibration);
  const calibrationPoints = useStudyStore((s) => s.calibrationPoints);
  const measurements = useStudyStore((s) => s.measurements);
  const mandibularResult = useStudyStore((s) => s.mandibularResult);

  const t = getTranslations(language);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isCalibrated = calibration !== null;
  const currentDateStr = new Date().toLocaleDateString(language === "ru" ? "ru-RU" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handlePrint = () => {
    window.print();
  };

  const natW = imageNaturalWidth || 1200;
  const natH = imageNaturalHeight || 800;

  // Scale visual elements proportionally with natural dimensions
  const strokeWidth = Math.max(2, natW * 0.0035);
  const dotRadius = Math.max(5, natW * 0.008);
  const fontSize = Math.max(11, natW * 0.013);
  const badgeHeight = Math.max(18, natH * 0.048);
  const badgeWidth = Math.max(65, natW * 0.17);

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto report-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="flex max-h-[95vh] w-full max-w-4xl flex-col rounded-xl bg-gray-100 shadow-2xl overflow-hidden report-modal-content"
      >
        {/* Modal Action Header (Screen only) */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shrink-0 print-hide">
          <div className="flex items-center gap-2">
            <span className="text-xl">📄</span>
            <h2 id="modal-title" className="text-base font-semibold text-gray-800">
              {t.report.modalTitle}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-blue-700 active:bg-blue-800 transition-colors"
            >
              <span>🖨</span>
              <span>{t.report.printButton}</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              {t.common.close}
            </button>
          </div>
        </div>

        {/* Scrollable Report Body on Screen / Clean A4 Page in Print */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 report-modal-body">
          <div
            id="clinical-print-root"
            className="mx-auto max-w-[210mm] rounded-lg bg-white p-6 sm:p-8 shadow-sm border border-gray-200 text-gray-900"
          >
            {/* 1. Clinic & Report Header */}
            <div className="border-b-2 border-gray-800 pb-3 mb-4 flex items-start justify-between">
              <div>
                <h1 className="text-lg font-bold uppercase tracking-tight text-gray-900">
                  {t.report.reportTitle}
                </h1>
                <p className="text-xs text-gray-600 font-medium mt-0.5">
                  {t.report.reportSubtitle}
                </p>
              </div>
              <div className="text-right text-xs text-gray-500 font-medium">
                <span className="inline-block rounded bg-gray-100 px-2 py-0.5 border border-gray-200">
                  {language.toUpperCase()}
                </span>
              </div>
            </div>

            {/* 2. Patient & Calibration Metadata Grid */}
            <div className="grid grid-cols-3 gap-3 rounded-md bg-gray-50 p-3 text-xs border border-gray-200 mb-4">
              <div>
                <span className="font-semibold text-gray-600">{t.report.patientId}</span>{" "}
                <span className="font-mono font-bold text-gray-900">
                  {patientId || t.studyManager.unassigned}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">{t.report.studyDate}</span>{" "}
                <span className="text-gray-900">{currentDateStr}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">{t.report.calibrationStatus}</span>{" "}
                <span className={isCalibrated ? "text-green-700 font-medium" : "text-amber-700 font-medium"}>
                  {isCalibrated
                    ? t.report.calibratedValue(calibration!.mmPerPixel.toFixed(4))
                    : t.report.uncalibratedValue}
                </span>
              </div>
            </div>

            {/* 3. Radiograph Visual Overlay Section */}
            {imageDataUrl && (
              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                  {t.report.overlayTitle}
                </div>
                <div
                  className="relative w-full overflow-hidden rounded border border-gray-300 bg-black"
                  style={{
                    aspectRatio: `${natW} / ${natH}`,
                  }}
                >
                  <img
                    src={imageDataUrl}
                    alt="Panoramic Radiograph"
                    className="block w-full h-full object-fill"
                  />
                  <svg
                    className="absolute inset-0 h-full w-full"
                    viewBox={`0 0 ${natW} ${natH}`}
                    preserveAspectRatio="none"
                  >
                    {/* Measurement Lines */}
                    {lineDefs.map((line) => {
                      if (!line.from || !line.to) return null;
                      const x1 = line.from.x * natW;
                      const y1 = line.from.y * natH;
                      const x2 = line.to.x * natW;
                      const y2 = line.to.y * natH;
                      const midX = (x1 + x2) / 2;
                      const midY = (y1 + y2) / 2;
                      const showMm = isCalibrated && line.mm !== null;
                      const label = showMm
                        ? `${line.name}: ${line.mm!.toFixed(1)} ${t.common.mm}`
                        : line.name;

                      return (
                        <g key={line.id}>
                          <line
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke={line.color}
                            strokeWidth={strokeWidth}
                          />
                          <rect
                            x={midX - badgeWidth / 2}
                            y={midY - badgeHeight / 2}
                            width={badgeWidth}
                            height={badgeHeight}
                            fill="rgba(0,0,0,0.75)"
                            rx={badgeHeight * 0.25}
                            ry={badgeHeight * 0.25}
                          />
                          <text
                            x={midX}
                            y={midY}
                            fill="#ffffff"
                            fontSize={fontSize}
                            fontWeight="600"
                            textAnchor="middle"
                            dominantBaseline="central"
                            style={{ textShadow: "0 0 2px black" }}
                          >
                            {label}
                          </text>
                        </g>
                      );
                    })}

                    {/* Calibration Reference Line */}
                    {calibrationPoints?.point1 && calibrationPoints?.point2 && (
                      <line
                        x1={calibrationPoints.point1.x * natW}
                        y1={calibrationPoints.point1.y * natH}
                        x2={calibrationPoints.point2.x * natW}
                        y2={calibrationPoints.point2.y * natH}
                        stroke="#10b981"
                        strokeWidth={strokeWidth * 0.9}
                        strokeDasharray={`${natW * 0.015} ${natW * 0.008}`}
                      />
                    )}

                    {/* Landmark Dots */}
                    {LANDMARK_DEFINITIONS.map((def) => {
                      const pt = landmarks[def.name];
                      if (!pt) return null;
                      const px = pt.x * natW;
                      const py = pt.y * natH;
                      const color =
                        def.side === "right"
                          ? RIGHT_COLOR
                          : def.side === "left"
                          ? LEFT_COLOR
                          : "#f59e0b";
                      return (
                        <g key={def.name}>
                          <circle
                            cx={px}
                            cy={py}
                            r={dotRadius}
                            fill={color}
                            stroke="#ffffff"
                            strokeWidth={strokeWidth * 0.5}
                          />
                          <text
                            x={px}
                            y={py - dotRadius * 1.4}
                            fill="#ffffff"
                            fontSize={fontSize}
                            fontWeight="bold"
                            textAnchor="middle"
                            style={{ textShadow: "0 0 3px black" }}
                          >
                            {def.name}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            )}

            {/* 4. Quantitative Measurements Table */}
            <div className="mb-4">
              <div className="text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                {t.report.tableTitle}
              </div>
              <table className="w-full border-collapse border border-gray-300 text-xs">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="border border-gray-300 p-2 text-left">{t.report.colMeasurement}</th>
                    <th className="border border-gray-300 p-2 text-center">{t.report.colRight}</th>
                    <th className="border border-gray-300 p-2 text-center">{t.report.colLeft}</th>
                    <th className="border border-gray-300 p-2 text-center">{t.report.colAbsDiff}</th>
                    <th className="border border-gray-300 p-2 text-center">{t.report.colRelDiff}</th>
                    <th className="border border-gray-300 p-2 text-center">{t.report.colHabetsIndex}</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Ramus Row */}
                  <tr>
                    <td className="border border-gray-300 p-2 font-medium">
                      {t.results.ramusTitle}
                    </td>
                    <td className="border border-gray-300 p-2 text-center font-mono font-semibold text-blue-700">
                      {isCalibrated && mandibularResult
                        ? `${mandibularResult.ramus.rightMm.toFixed(1)} ${t.common.mm}`
                        : "—"}
                    </td>
                    <td className="border border-gray-300 p-2 text-center font-mono font-semibold text-green-700">
                      {isCalibrated && mandibularResult
                        ? `${mandibularResult.ramus.leftMm.toFixed(1)} ${t.common.mm}`
                        : "—"}
                    </td>
                    <td className="border border-gray-300 p-2 text-center font-mono font-medium">
                      {isCalibrated && mandibularResult
                        ? `${mandibularResult.ramus.absoluteDifferenceMm.toFixed(1)} ${t.common.mm}`
                        : "—"}
                    </td>
                    <td className="border border-gray-300 p-2 text-center font-mono">
                      {measurements?.ramusHeight
                        ? `${measurements.ramusHeight.relativeDifferencePercent.toFixed(1)}%`
                        : "—"}
                    </td>
                    <td className="border border-gray-300 p-2 text-center font-mono font-bold text-gray-800">
                      {measurements?.ramusHeight
                        ? `${measurements.ramusHeight.asymmetryIndexPercent.toFixed(1)}%`
                        : "—"}
                    </td>
                  </tr>

                  {/* Mandibular Body Row */}
                  <tr>
                    <td className="border border-gray-300 p-2 font-medium">
                      {t.results.bodyTitle}
                    </td>
                    <td className="border border-gray-300 p-2 text-center font-mono font-semibold text-blue-700">
                      {isCalibrated && mandibularResult
                        ? `${mandibularResult.body.rightMm.toFixed(1)} ${t.common.mm}`
                        : "—"}
                    </td>
                    <td className="border border-gray-300 p-2 text-center font-mono font-semibold text-green-700">
                      {isCalibrated && mandibularResult
                        ? `${mandibularResult.body.leftMm.toFixed(1)} ${t.common.mm}`
                        : "—"}
                    </td>
                    <td className="border border-gray-300 p-2 text-center font-mono font-medium">
                      {isCalibrated && mandibularResult
                        ? `${mandibularResult.body.absoluteDifferenceMm.toFixed(1)} ${t.common.mm}`
                        : "—"}
                    </td>
                    <td className="border border-gray-300 p-2 text-center font-mono">
                      {measurements?.bodyLength
                        ? `${measurements.bodyLength.relativeDifferencePercent.toFixed(1)}%`
                        : "—"}
                    </td>
                    <td className="border border-gray-300 p-2 text-center font-mono font-bold text-gray-800">
                      {measurements?.bodyLength
                        ? `${measurements.bodyLength.asymmetryIndexPercent.toFixed(1)}%`
                        : "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 5. Clinical Measurement Conclusion Box */}
            {mandibularResult && (
              <div className="mb-4 rounded border border-blue-200 bg-blue-50/70 p-3 text-xs">
                <div className="font-semibold text-blue-900 mb-1">
                  {t.report.conclusionTitle}
                </div>
                <p className="text-gray-800 leading-relaxed">
                  {mandibularResult.conclusion}
                </p>
              </div>
            )}

            {/* 6. Medical Disclaimer & 2D Limitations Footer */}
            <div className="border-t border-gray-300 pt-3 text-[10px] text-gray-600 leading-normal">
              <div className="font-semibold text-gray-800 mb-0.5">
                {t.report.disclaimerTitle}
              </div>
              <p className="text-justify">
                {t.report.disclaimerBody}
              </p>
              <div className="mt-2 flex items-center justify-between text-[9px] text-gray-400">
                <span>{t.report.pageIndicator}</span>
                <span>{currentDateStr}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
