// ── Clinical Report Modal & Printable View ────────────────────
// Formatted 1-page clinical standard report for PDF generation & printing.
// Responsive modal preview with pure client-side window.print() output.
// Uses unified RadiographOverlay (readOnly) for 100% WYSIWYG parity.

import { useEffect, useRef } from "react";
import { useStudyStore } from "../store/studyStore";
import { getTranslations } from "../locales";
import { RadiographOverlay } from "./RadiographOverlay";

interface ClinicalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ClinicalReportModal({ isOpen, onClose }: ClinicalReportModalProps) {
  const language = useStudyStore((s) => s.language);
  const patientId = useStudyStore((s) => s.patientId);
  const imageDataUrl = useStudyStore((s) => s.imageDataUrl);
  const calibration = useStudyStore((s) => s.calibration);
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

            {/* 3. Radiograph Visual Overlay Section (Strict Bounding Box Parity) */}
            {imageDataUrl && (
              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                  {t.report.overlayTitle}
                </div>
                <div
                  className="relative inline-block w-full overflow-hidden rounded border border-gray-300 bg-black leading-none"
                  style={{
                    display: "inline-block",
                    width: "100%",
                    position: "relative",
                  }}
                >
                  <img
                    src={imageDataUrl}
                    alt="Panoramic Radiograph"
                    className="block w-full h-auto"
                    style={{
                      display: "block",
                      width: "100%",
                      height: "auto",
                    }}
                  />
                  <RadiographOverlay
                    readOnly={true}
                    preserveAspectRatio="none"
                    className="absolute inset-0 w-full h-full overlay-svg pointer-events-none"
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                    }}
                  />
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
