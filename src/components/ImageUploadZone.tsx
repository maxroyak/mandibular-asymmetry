// ── Image Upload Zone ────────────────────────────────────────
// Drag-drop or file picker for OPG radiograph upload.

import { useRef, useState, useCallback } from "react";
import { useStudyStore } from "../store/studyStore";

export function ImageUploadZone() {
  const createStudy = useStudyStore((s) => s.createStudy);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file (JPG, PNG, BMP, TIFF).");
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setError("Image too large. Maximum size is 20 MB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        // Load image to get natural dimensions
        const img = new Image();
        img.onload = () => {
          // Downscale if very large (>2000px max dimension) to keep localStorage manageable
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
        };
        img.onerror = () => {
          setError("Failed to load image. Please try a different file.");
        };
        img.src = dataUrl;
      };
      reader.onerror = () => {
        setError("Failed to read file.");
      };
      reader.readAsDataURL(file);
    },
    [createStudy]
  );

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div
        className={`w-full max-w-2xl rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 bg-gray-50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <div className="text-6xl mb-4">📁</div>
        <p className="text-lg font-semibold text-gray-700">
          Drop radiograph here
        </p>
        <p className="text-sm text-gray-500 mt-1">or click to browse</p>
        <p className="text-xs text-gray-400 mt-4">
          Supported: JPG, PNG, BMP, TIFF — Max size: 20 MB
        </p>
        {error && (
          <p className="text-sm text-red-600 mt-4 font-medium">{error}</p>
        )}
      </div>
    </div>
  );
}