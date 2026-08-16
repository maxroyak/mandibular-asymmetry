// ── Image Upload Zone ────────────────────────────────────────
// Drag-drop or file picker for OPG radiograph upload.
// Supports DICOM (.dcm, .dicom), JPG, PNG, BMP, and TIFF formats.

import { useRef, useState, useCallback } from "react";
import { useStudyStore } from "../store/studyStore";
import { getTranslations } from "../locales";
import { parseDicomFile } from "../domain/dicom/dicomReader";

export function ImageUploadZone() {
  const language = useStudyStore((s) => s.language);
  const createStudy = useStudyStore((s) => s.createStudy);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = getTranslations(language);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      const fileNameLower = file.name.toLowerCase();
      const isDicom =
        fileNameLower.endsWith(".dcm") ||
        fileNameLower.endsWith(".dicom") ||
        file.type === "application/dicom";

      if (!isDicom && !file.type.startsWith("image/")) {
        setError(t.upload.invalidImageError);
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setError(t.upload.imageTooLargeError);
        return;
      }

      setIsLoading(true);

      // ── Handle DICOM File ──
      if (isDicom) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const buffer = reader.result as ArrayBuffer;
            const result = parseDicomFile(buffer);
            createStudy(
              result.metadata.patientId || "",
              result.imageDataUrl,
              result.width,
              result.height,
              result.autoCalibration
            );
          } catch (err) {
            console.error("DICOM parse error:", err);
            setError(t.upload.dicomParseError);
          } finally {
            setIsLoading(false);
          }
        };
        reader.onerror = () => {
          setIsLoading(false);
          setError(t.upload.fileReadError);
        };
        reader.readAsArrayBuffer(file);
        return;
      }

      // ── Handle Standard Raster Image ──
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const img = new Image();
        img.onload = () => {
          let finalUrl = dataUrl;
          let finalW = img.naturalWidth;
          let finalH = img.naturalHeight;
          const MAX_DIM = 2000;
          if (finalW > MAX_DIM || finalH > MAX_DIM) {
            const scale = MAX_DIM / Math.max(finalW, finalH);
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(finalW * scale);
            canvas.height = Math.round(finalH * scale);
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              finalUrl = canvas.toDataURL("image/jpeg", 0.85);
              finalW = canvas.width;
              finalH = canvas.height;
            }
          }
          createStudy("", finalUrl, finalW, finalH);
          setIsLoading(false);
        };
        img.onerror = () => {
          setIsLoading(false);
          setError(t.upload.imageLoadError);
        };
        img.src = dataUrl;
      };
      reader.onerror = () => {
        setIsLoading(false);
        setError(t.upload.fileReadError);
      };
      reader.readAsDataURL(file);
    },
    [createStudy, t]
  );

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div
        className={`w-full max-w-2xl rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 bg-gray-50"
        } ${isLoading ? "opacity-60 cursor-wait" : "cursor-pointer"}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!isLoading) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (isLoading) return;
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        onClick={() => {
          if (!isLoading) inputRef.current?.click();
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (!isLoading && (e.key === "Enter" || e.key === " ")) {
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".dcm,.dicom,image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <div className="text-6xl mb-4">{isLoading ? "⏳" : "🩻"}</div>
        <p className="text-lg font-semibold text-gray-700">
          {isLoading ? t.studyManager.loadingStudy : t.upload.dragDropTitle}
        </p>
        <p className="text-sm text-gray-500 mt-1">{t.upload.dragDropSubtitle}</p>
        <p className="text-xs text-gray-400 mt-4">
          {t.upload.supportedFormats}
        </p>
        {error && (
          <p className="text-sm text-red-600 mt-4 font-medium">{error}</p>
        )}
      </div>
    </div>
  );
}