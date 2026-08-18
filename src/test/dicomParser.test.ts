// ── DICOM Parser & Auto-Scale Tests ───────────────────────────
// Unit tests for DICOM tag parsing, pixel data rendering, and auto-calibration.

import { describe, it, expect, beforeEach } from "vitest";
import {
  parsePixelSpacingString,
  formatDicomDate,
  extractDicomMetadata,
  parseDicomFile,
} from "../domain/dicom/dicomReader";
import { useStudyStore } from "../store/studyStore";
import dicomParser from "dicom-parser";

// Mock localStorage for test environment
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => storageMap.set(key, value),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null,
  get length() { return storageMap.size; },
};
Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  configurable: true,
  writable: true,
});

/**
 * Helper to build a minimal valid synthetic DICOM binary for testing
 */
function createSyntheticDicomBuffer(options: {
  patientId?: string;
  studyDate?: string;
  pixelSpacing?: string;
  imagerPixelSpacing?: string;
  rows?: number;
  cols?: number;
  photometric?: string;
  bitsAllocated?: number;
}): ArrayBuffer {
  const rows = options.rows ?? 10;
  const cols = options.cols ?? 10;
  const bits = options.bitsAllocated ?? 16;
  const bytesPerPixel = bits === 16 ? 2 : 1;
  const pixelDataSize = rows * cols * bytesPerPixel;

  // Build minimal dataset elements using explicit VR little endian
  const elements: { tagGroup: number; tagElement: number; vr: string; value: Uint8Array }[] = [];

  const addStringElement = (group: number, element: number, vr: string, str: string) => {
    let bytes = new TextEncoder().encode(str);
    if (bytes.length % 2 !== 0) {
      const padded = new Uint8Array(bytes.length + 1);
      padded.set(bytes);
      padded[bytes.length] = 0x20; // space pad for DICOM string VRs
      bytes = padded;
    }
    elements.push({ tagGroup: group, tagElement: element, vr, value: bytes });
  };

  const addUint16Element = (group: number, element: number, val: number) => {
    const bytes = new Uint8Array(2);
    new DataView(bytes.buffer).setUint16(0, val, true);
    elements.push({ tagGroup: group, tagElement: element, vr: "US", value: bytes });
  };

  // Transfer Syntax UID (0002,0010) - Explicit VR Little Endian
  addStringElement(0x0002, 0x0010, "UI", "1.2.840.10008.1.2.1");

  // Study Date (0008,0020)
  if (options.studyDate) {
    addStringElement(0x0008, 0x0020, "DA", options.studyDate);
  }

  // Patient ID (0010,0020)
  if (options.patientId) {
    addStringElement(0x0010, 0x0020, "LO", options.patientId);
  }

  // Photometric Interpretation (0028,0004)
  addStringElement(0x0028, 0x0004, "CS", options.photometric ?? "MONOCHROME2");

  // Rows (0028,0010) & Columns (0028,0011)
  addUint16Element(0x0028, 0x0010, rows);
  addUint16Element(0x0028, 0x0011, cols);

  // Pixel Spacing (0028,0030)
  if (options.pixelSpacing) {
    addStringElement(0x0028, 0x0030, "DS", options.pixelSpacing);
  }

  // Imager Pixel Spacing (0018,1164)
  if (options.imagerPixelSpacing) {
    addStringElement(0x0018, 0x1164, "DS", options.imagerPixelSpacing);
  }

  // Bits Allocated (0028,0100) & Bits Stored (0028,0101)
  addUint16Element(0x0028, 0x0100, bits);
  addUint16Element(0x0028, 0x0101, bits);

  // Pixel Data (7FE0,0010)
  const pixelBytes = new Uint8Array(pixelDataSize);
  for (let i = 0; i < pixelBytes.length; i++) {
    pixelBytes[i] = (i * 17) % 255;
  }
  elements.push({ tagGroup: 0x7fe0, tagElement: 0x0010, vr: "OW", value: pixelBytes });

  const is4ByteVr = (vr: string) => ["OB", "OW", "OF", "SQ", "UT", "UN"].includes(vr);

  // Calculate total buffer size
  // 128 preamble + 4 "DICM" + each element
  let totalSize = 132;
  for (const el of elements) {
    if (is4ByteVr(el.vr)) {
      totalSize += 4 + 2 + 2 + 4 + el.value.length;
    } else {
      totalSize += 4 + 2 + 2 + el.value.length;
    }
  }

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const uint8 = new Uint8Array(buffer);

  // 128 bytes preamble = 0, then "DICM"
  uint8.set(new TextEncoder().encode("DICM"), 128);

  let offset = 132;
  for (const el of elements) {
    view.setUint16(offset, el.tagGroup, true);
    view.setUint16(offset + 2, el.tagElement, true);
    uint8[offset + 4] = el.vr.charCodeAt(0);
    uint8[offset + 5] = el.vr.charCodeAt(1);
    if (is4ByteVr(el.vr)) {
      view.setUint16(offset + 6, 0, true); // 2 reserved bytes
      view.setUint32(offset + 8, el.value.length, true); // 4-byte length
      uint8.set(el.value, offset + 12);
      offset += 12 + el.value.length;
    } else {
      view.setUint16(offset + 6, el.value.length, true); // 2-byte length
      uint8.set(el.value, offset + 8);
      offset += 8 + el.value.length;
    }
  }

  return buffer;
}

describe("DICOM Helper Functions", () => {
  describe("parsePixelSpacingString", () => {
    it("parses valid row\\col pixel spacing", () => {
      expect(parsePixelSpacingString("0.125\\0.125")).toEqual({ row: 0.125, col: 0.125 });
      expect(parsePixelSpacingString("0.096 \\ 0.096 ")).toEqual({ row: 0.096, col: 0.096 });
      expect(parsePixelSpacingString("0.150\\0.148")).toEqual({ row: 0.15, col: 0.148 });
    });

    it("parses single float value as isotropic spacing", () => {
      expect(parsePixelSpacingString("0.125")).toEqual({ row: 0.125, col: 0.125 });
    });

    it("returns null for invalid or negative spacing", () => {
      expect(parsePixelSpacingString(undefined)).toBeNull();
      expect(parsePixelSpacingString("")).toBeNull();
      expect(parsePixelSpacingString("abc\\def")).toBeNull();
      expect(parsePixelSpacingString("-0.125\\0.125")).toBeNull();
    });
  });

  describe("formatDicomDate", () => {
    it("formats YYYYMMDD to YYYY-MM-DD", () => {
      expect(formatDicomDate("20260817")).toBe("2026-08-17");
      expect(formatDicomDate("19951231")).toBe("1995-12-31");
    });

    it("returns raw string if not 8 chars", () => {
      expect(formatDicomDate("2026-08-17")).toBe("2026-08-17");
      expect(formatDicomDate(undefined)).toBeUndefined();
    });
  });
});

describe("DICOM Dataset Extraction & Canvas Rendering", () => {
  it("extracts metadata and detects Pixel Spacing auto-calibration", () => {
    const buffer = createSyntheticDicomBuffer({
      patientId: "ORTHO-TEST-01",
      studyDate: "20260817",
      pixelSpacing: "0.100\\0.100",
      rows: 20,
      cols: 20,
    });

    const dataSet = dicomParser.parseDicom(new Uint8Array(buffer));
    const metadata = extractDicomMetadata(dataSet);

    expect(metadata.patientId).toBe("ORTHO-TEST-01");
    expect(metadata.studyDate).toBe("2026-08-17");
    expect(metadata.rows).toBe(20);
    expect(metadata.columns).toBe(20);
    expect(metadata.pixelSpacing).toEqual({ row: 0.1, col: 0.1 });
    expect(metadata.mmPerPixel).toBe(0.1);
  });

  it("prioritizes Pixel Spacing over Imager Pixel Spacing", () => {
    const buffer = createSyntheticDicomBuffer({
      patientId: "ORTHO-PRIORITY",
      pixelSpacing: "0.080\\0.080",
      imagerPixelSpacing: "0.100\\0.100",
    });

    const dataSet = dicomParser.parseDicom(new Uint8Array(buffer));
    const metadata = extractDicomMetadata(dataSet);

    expect(metadata.pixelSpacing).toEqual({ row: 0.08, col: 0.08 });
    expect(metadata.imagerPixelSpacing).toEqual({ row: 0.1, col: 0.1 });
    expect(metadata.mmPerPixel).toBe(0.08);
  });

  it("parses DICOM file and returns autoCalibration object", () => {
    const buffer = createSyntheticDicomBuffer({
      patientId: "PATIENT-DICOM-99",
      pixelSpacing: "0.125\\0.125",
      rows: 16,
      cols: 16,
    });

    const result = parseDicomFile(buffer);
    expect(result.metadata.patientId).toBe("PATIENT-DICOM-99");
    expect(result.autoCalibration).not.toBeNull();
    expect(result.autoCalibration?.mmPerPixel).toBe(0.125);
    expect(result.autoCalibration?.realDistanceMm).toBe(12.5);
    expect(result.autoCalibration?.source).toBe("dicom");
    expect(result.width).toBe(16);
    expect(result.height).toBe(16);
  });

  it("handles DICOM files without pixel spacing gracefully", () => {
    const buffer = createSyntheticDicomBuffer({
      patientId: "PATIENT-NO-SPACING",
      rows: 10,
      cols: 10,
    });

    const result = parseDicomFile(buffer);
    expect(result.metadata.patientId).toBe("PATIENT-NO-SPACING");
    expect(result.metadata.mmPerPixel).toBeNull();
    expect(result.autoCalibration).toBeNull();
  });
});

describe("StudyStore DICOM Auto-Calibration Integration", () => {
  beforeEach(() => {
    storageMap.clear();
    useStudyStore.getState().newStudy();
  });

  it("creates study with auto-calibrated state when initial calibration is passed", () => {
    const autoCal = {
      pixelDistance: 100,
      realDistanceMm: 12.5,
      mmPerPixel: 0.125,
    };

    useStudyStore
      .getState()
      .createStudy("DICOM-AUTO-01", "data:image/png;base64,mock", 1000, 800, autoCal);

    const state = useStudyStore.getState();
    expect(state.patientId).toBe("DICOM-AUTO-01");
    expect(state.calibration).toEqual(autoCal);
    expect(state.calibrationMode).toBe("B");
    expect(state.calibrationStage).toBe("calibrated");

    // Place landmarks and verify immediate millimeter calculations
    useStudyStore.getState().setLandmark("CoR", { x: 0.2, y: 0.2 });
    useStudyStore.getState().setLandmark("GoR", { x: 0.2, y: 0.8 });
    useStudyStore.getState().setLandmark("CoL", { x: 0.8, y: 0.2 });
    useStudyStore.getState().setLandmark("GoL", { x: 0.8, y: 0.8 });
    useStudyStore.getState().setLandmark("Me", { x: 0.5, y: 0.9 });

    const updated = useStudyStore.getState();
    expect(updated.mandibularResult).not.toBeNull();
    expect(updated.mandibularResult?.ramus.rightMm).toBeGreaterThan(0);
    expect(updated.mandibularResult?.conclusion).toContain("The right ramus measures");
  });
});
