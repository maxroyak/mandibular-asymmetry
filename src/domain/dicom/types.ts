// ── DICOM Domain Types ────────────────────────────────────────

import type { Calibration } from "../types";

export interface DicomMetadata {
  patientId: string;
  patientName?: string;
  studyDate?: string;
  modality?: string;
  rows: number;
  columns: number;
  bitsAllocated: number;
  bitsStored: number;
  photometricInterpretation: "MONOCHROME1" | "MONOCHROME2" | string;
  pixelSpacing: { row: number; col: number } | null;
  imagerPixelSpacing: { row: number; col: number } | null;
  mmPerPixel: number | null;
  windowCenter?: number;
  windowWidth?: number;
}

export interface DicomParseResult {
  metadata: DicomMetadata;
  autoCalibration: Calibration | null;
  imageDataUrl: string;
  width: number;
  height: number;
}
