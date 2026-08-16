# WORKLOG — Mandibular Asymmetry Analysis

## Append-Only Action & Release Log

---
2026-08-16 | Team Initial Setup & Architecture
Details: Implemented core 2D mandibular asymmetry analysis with Habets normalization formula, 5-point landmark placement (CoR, GoR, CoL, GoL, Me), normalized coordinate transform, and localStorage + IndexedDB persistence.
---

---
2026-08-16 | Calibration State Machine & Subpixel Dragging
Details: Rebuilt calibration into a 7-stage state machine (placing point 1, reviewing point 1, placing point 2, reviewing point 2, entering distance, calibrated, idle). Added real-time millimeter previews, minimum pixel distance validation (5px), and touch-friendly dragging handles.
---

---
2026-08-17 00:00 | Landmark Placement Manual & User Documentation
Details: Authored comprehensive clinician user guide `docs/user-manual-landmarks.md` covering landmark placement, calibration, canvas tools, and artifact avoidance. Updated README.md.
---

---
2026-08-17 00:50 | Internationalization (i18n) — English & Russian Support
Details: Added typed translation dictionaries in `src/locales/` (`types.ts`, `en.ts`, `ru.ts`, `index.ts`). Updated domain layer report builders for localized outputs. Added persistent language switcher (`LanguageSwitcher.tsx`) and updated all 7 UI components. 295/295 unit tests passing.
---

---
2026-08-17 01:05 | Track 1: Clinical PDF / Print Export Implementation
Details: Implemented `ClinicalReportModal.tsx` for 1-page clinical standard report preview and client-side `window.print()` PDF generation. Added `@media print` styling rules in `src/styles/index.css`. Added export actions in `AnalysisPage` header and `ResultsPanel`. Added test suite `src/test/reportExport.test.ts`. 300/300 unit tests passing.
---

---
2026-08-17 01:15 | Track 2: Native DICOM (.dcm) Radiograph Support & Auto-Scale
Details: Integrated `dicom-parser` with typed definitions. Implemented client-side DICOM reader (`src/domain/dicom/dicomReader.ts`), 16-bit/8-bit grayscale VOI windowing, photometric interpretations (MONOCHROME1/MONOCHROME2), metadata extraction (Patient ID, Study Date), and auto-calibration via Pixel Spacing (`0028,0030`) and Imager Pixel Spacing (`0018,1164`). Added DICOM drag-drop upload support in `ImageUploadZone.tsx`. Authored `src/test/dicomParser.test.ts`. 310/310 unit tests passing (100%).
---

