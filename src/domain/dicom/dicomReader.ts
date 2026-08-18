// ── DICOM Parser & Canvas Renderer ──────────────────────────
// Pure client-side parsing of panoramic DICOM (.dcm) files.
// Handles 8/12/16-bit grayscale, MONOCHROME1/2, VOI windowing,
// and auto-calibration from Pixel Spacing (0028,0030) tags.

import dicomParser from "dicom-parser";
import type { Calibration } from "../types";
import type { DicomMetadata, DicomParseResult } from "./types";

/**
 * Parse Pixel Spacing tag (e.g. "0.125\\0.125" or "0.125")
 */
export function parsePixelSpacingString(
  raw: string | undefined
): { row: number; col: number } | null {
  if (!raw) return null;
  const parts = raw.split("\\").map((s) => parseFloat(s.trim()));
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] > 0 && parts[1] > 0) {
    return { row: parts[0], col: parts[1] };
  }
  if (parts.length === 1 && !isNaN(parts[0]) && parts[0] > 0) {
    return { row: parts[0], col: parts[0] };
  }
  return null;
}

/**
 * Format DICOM Study Date string (YYYYMMDD) to readable format
 */
export function formatDicomDate(raw: string | undefined): string | undefined {
  if (!raw || raw.length !== 8 || raw.includes("-") || isNaN(Number(raw))) return raw;
  const y = raw.substring(0, 4);
  const m = raw.substring(4, 6);
  const d = raw.substring(6, 8);
  return `${y}-${m}-${d}`;
}

/**
 * Extract metadata from a parsed DICOM dataset
 */
export function extractDicomMetadata(dataSet: dicomParser.DataSet): DicomMetadata {
  const patientId = (dataSet.string("x00100020") || "").trim();
  const patientName = (dataSet.string("x00100010") || "").trim();
  const studyDate = formatDicomDate(dataSet.string("x00080020"));
  const modality = dataSet.string("x00080060");

  const rows = dataSet.uint16("x00280010") || 0;
  const columns = dataSet.uint16("x00280011") || 0;
  const bitsAllocated = dataSet.uint16("x00280100") || 16;
  const bitsStored = dataSet.uint16("x00280101") || bitsAllocated;
  const photometricInterpretation =
    (dataSet.string("x00280004") || "MONOCHROME2").trim().toUpperCase();

  const pixelSpacing = parsePixelSpacingString(dataSet.string("x00280030"));
  const imagerPixelSpacing = parsePixelSpacingString(dataSet.string("x00181164"));

  // Pixel Spacing has priority over Imager Pixel Spacing (patient plane vs detector plane)
  const activeSpacing = pixelSpacing || imagerPixelSpacing;
  const mmPerPixel = activeSpacing ? (activeSpacing.col + activeSpacing.row) / 2 : null;

  // Window center/width
  const wcStr = dataSet.string("x00281050");
  const wwStr = dataSet.string("x00281051");
  const windowCenter = wcStr ? parseFloat(wcStr.split("\\")[0]) : undefined;
  const windowWidth = wwStr ? parseFloat(wwStr.split("\\")[0]) : undefined;

  return {
    patientId,
    patientName,
    studyDate,
    modality,
    rows,
    columns,
    bitsAllocated,
    bitsStored,
    photometricInterpretation,
    pixelSpacing,
    imagerPixelSpacing,
    mmPerPixel,
    windowCenter: !isNaN(windowCenter!) ? windowCenter : undefined,
    windowWidth: !isNaN(windowWidth!) ? windowWidth : undefined,
  };
}

/**
 * Render DICOM pixel data to an HTML5 Canvas and export as Data URL.
 */
export function renderDicomToCanvas(
  dataSet: dicomParser.DataSet,
  metadata: DicomMetadata
): { dataUrl: string; width: number; height: number } {
  const { rows, columns, bitsAllocated, photometricInterpretation } = metadata;
  if (!rows || !columns) {
    throw new Error("Invalid DICOM dimensions (rows or columns missing).");
  }

  const pixelDataElement = dataSet.elements.x7fe00010;
  if (!pixelDataElement) {
    throw new Error("Pixel Data (7FE0,0010) element not found in DICOM file.");
  }

  const offset = pixelDataElement.dataOffset;
  const length = pixelDataElement.length;
  const byteArray = dataSet.byteArray;

  const totalPixels = rows * columns;
  const is16Bit = bitsAllocated > 8;
  const isMonochrome1 = photometricInterpretation === "MONOCHROME1";

  // Rescale intercept & slope
  const rescaleSlopeStr = dataSet.string("x00281053");
  const rescaleInterceptStr = dataSet.string("x00281052");
  const slope = rescaleSlopeStr ? parseFloat(rescaleSlopeStr) : 1;
  const intercept = rescaleInterceptStr ? parseFloat(rescaleInterceptStr) : 0;

  // Extract pixel values
  const pixelValues = new Float32Array(totalPixels);
  let minVal = Infinity;
  let maxVal = -Infinity;

  if (is16Bit) {
    const dataView = new DataView(
      byteArray.buffer,
      byteArray.byteOffset + offset,
      Math.min(length, totalPixels * 2)
    );
    for (let i = 0; i < totalPixels; i++) {
      if (i * 2 + 1 >= dataView.byteLength) break;
      const raw = dataView.getUint16(i * 2, true); // Little endian
      const val = raw * slope + intercept;
      pixelValues[i] = val;
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    }
  } else {
    for (let i = 0; i < totalPixels; i++) {
      if (offset + i >= byteArray.length) break;
      const raw = byteArray[offset + i];
      const val = raw * slope + intercept;
      pixelValues[i] = val;
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    }
  }

  // Calculate Window Center & Window Width
  let wc = metadata.windowCenter;
  let ww = metadata.windowWidth;

  if (wc === undefined || ww === undefined || ww <= 0) {
    // Auto-windowing from min/max
    wc = (minVal + maxVal) / 2;
    ww = Math.max(maxVal - minVal, 1);
  }

  const windowMin = wc - 0.5 - (ww - 1) / 2;
  const windowMax = wc - 0.5 + (ww - 1) / 2;

  // Create canvas for rendering
  const canvas = document.createElement("canvas");
  canvas.width = columns;
  canvas.height = rows;
  const ctx = canvas.getContext ? canvas.getContext("2d") : null;
  if (!ctx) {
    // Fallback for headless/test environments without canvas engine
    return {
      dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${columns}" height="${rows}"></svg>`,
      width: columns,
      height: rows,
    };
  }

  const imgData = ctx.createImageData(columns, rows);
  const data = imgData.data;

  for (let i = 0; i < totalPixels; i++) {
    const val = pixelValues[i];
    let normalized = 0;

    if (val <= windowMin) {
      normalized = 0;
    } else if (val >= windowMax) {
      normalized = 255;
    } else {
      normalized = Math.round(((val - windowMin) / (windowMax - windowMin)) * 255);
    }

    if (isMonochrome1) {
      normalized = 255 - normalized;
    }

    const idx = i * 4;
    data[idx] = normalized;     // R
    data[idx + 1] = normalized; // G
    data[idx + 2] = normalized; // B
    data[idx + 3] = 255;        // A
  }

  ctx.putImageData(imgData, 0, 0);

  // Downscale if very large (>2000px) to keep memory manageable
  let finalWidth = columns;
  let finalHeight = rows;
  let finalDataUrl = "";
  const MAX_DIM = 2000;

  if (columns > MAX_DIM || rows > MAX_DIM) {
    const scale = MAX_DIM / Math.max(columns, rows);
    finalWidth = Math.round(columns * scale);
    finalHeight = Math.round(rows * scale);
    const scaledCanvas = document.createElement("canvas");
    scaledCanvas.width = finalWidth;
    scaledCanvas.height = finalHeight;
    const scaledCtx = scaledCanvas.getContext("2d");
    if (scaledCtx) {
      scaledCtx.drawImage(canvas, 0, 0, finalWidth, finalHeight);
      finalDataUrl = scaledCanvas.toDataURL("image/jpeg", 0.9);
    } else {
      finalDataUrl = canvas.toDataURL("image/jpeg", 0.9);
    }
  } else {
    finalDataUrl = canvas.toDataURL("image/jpeg", 0.9);
  }

  return {
    dataUrl: finalDataUrl,
    width: finalWidth,
    height: finalHeight,
  };
}

/**
 * Main DICOM parser entry point
 */
export function parseDicomFile(buffer: ArrayBuffer): DicomParseResult {
  const byteArray = new Uint8Array(buffer);
  const dataSet = dicomParser.parseDicom(byteArray);
  const metadata = extractDicomMetadata(dataSet);

  const { dataUrl, width, height } = renderDicomToCanvas(dataSet, metadata);

  let autoCalibration: Calibration | null = null;
  if (metadata.mmPerPixel && metadata.mmPerPixel > 0 && metadata.mmPerPixel < 5) {
    const origWidth = metadata.columns || width;
    const scaleFactor = origWidth > 0 ? width / origWidth : 1;
    const effectiveMmPerPixel = metadata.mmPerPixel / scaleFactor;

    autoCalibration = {
      pixelDistance: 100,
      realDistanceMm: effectiveMmPerPixel * 100,
      mmPerPixel: effectiveMmPerPixel,
      source: "dicom",
    };
  }

  return {
    metadata,
    autoCalibration,
    imageDataUrl: dataUrl,
    width,
    height,
  };
}
