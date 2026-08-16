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

---
2026-08-17 01:22 | Track 3: AI-Assisted Landmark Detection via Manual Trigger Button (Phase 2)
Details: Implemented pure domain heuristic landmark regressor (`src/domain/ai/landmarkDetector.ts`) generating candidate points and confidence scores for CoR, GoR, CoL, GoL, and Me. Added manual trigger `[✨ Auto-Detect Landmarks (AI)]` in `LandmarkPalette.tsx` and `ImageViewer.tsx` toolbar. Added candidate review workflow (`aiCandidateLandmarks`), dashed candidate halo markers, `[Accept All AI Proposals]` / `[Clear AI Proposals]` actions, and manual edit verification. Authored `src/test/aiDetection.test.ts`. 318/318 unit tests passing (100%).
---

---
2026-08-17 01:29 | AI Landmark Detection Accuracy & ROI Cropping Fix
Details: Implemented `detectRadiographRoi` filtering out black letterbox/pillarbox padding (luminance < 15) to normalize candidate coordinates relative to active radiograph content. Refined anatomical proportional zones: Condylar (Y ∈ [0.15, 0.28], CoR X ∈ [0.12, 0.22], CoL X ∈ [0.78, 0.88]), Gonial (Y ∈ [0.65, 0.78], GoR X ∈ [0.15, 0.25], GoL X ∈ [0.75, 0.85]), Menton (Y ∈ [0.85, 0.93], X ∈ [0.48, 0.52]). Added DICOM bypass and updated test suite `src/test/aiDetection.test.ts`. 320/320 unit tests passing (100%).
---

---
2026-08-17 01:31 | UI Refactoring: Relocate "Save Study" and "New Study" Actions to Top Header
Details: Moved Save Study and New Study buttons into the top header toolbar in `AnalysisPage.tsx` next to the main title. Added unsaved indicator dot and discard confirmations. Streamlined `StudyManager.tsx` sidebar component. 320/320 unit tests passing (100%).
---

---
2026-08-17 01:34 | Calibration Points Drag-to-Adjust Functionality
Details: Enabled interactive dragging and repositioning of Calibration Points P1 and P2 during review stages (`reviewing-point-1`, `reviewing-point-2`, `entering-distance`, and `calibrated`) with coordinate clamping to `[0.0, 1.0]` and real-time scale updating. Prioritized calibration hit-testing in `ImageViewer.tsx` with grab/grabbing cursors. 323/323 unit tests passing (100%).
---

---
2026-08-17 01:36 | AI Landmark Vertical Misalignment & ROI Cropping Fix
Details: Enhanced `detectRadiographRoi` with adaptive luminance variance thresholding and central Y clamp fallback (`[0.08, 0.90]`). Constrained candidate anatomical zones: `CoR`/`CoL` Y ∈ [0.18, 0.28], `GoR`/`GoL` Y ∈ [0.60, 0.72], `Me` Y ∈ [0.80, 0.88] (strictly <= 0.88). 324/324 unit tests passing (100%).
---






