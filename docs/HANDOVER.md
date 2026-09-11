# Project Handover: Mandibular Asymmetry Analysis

**Project Name:** Mandibular Asymmetry Analysis  
**Repository:** `/home/gamer/projects/mandibular-asymmetry`  
**Version:** 0.2.0 (Phase 2 Finalized)  
**Date:** 2026-08-29  
**Author:** PMBot (Project Manager & Orchestration Agent)  
**Team Roster:** PMBot, OrthoBot, ResearchBot, DevBot, UXBot, VisionBot, TestBot, QABot, GitBot  
**Current Status:** ✅ Production-Ready MVP + Phase 2 Enhancements Completed (All 346 Tests Passing)

---

## 1. Executive Summary

The **Mandibular Asymmetry Analysis** application is a browser-based, client-side clinical decision-support tool designed for 2D quantitative assessment of mandibular skeletal asymmetry from panoramic radiographs (OPG) and 2D DICOM slices.

Built with **React 19**, **TypeScript 5.7**, **Vite 8**, **Zustand 5**, and **Tailwind CSS 4**, the system operates with **zero server dependencies** and **zero cloud transmission** — all image processing, DICOM parsing, landmark placement, geometric transformations, and clinical metrics computation run entirely within the user's browser, ensuring strict patient privacy and HIPAA/GDPR alignment.

---

## 2. Technology Stack & Architecture

### 2.1 Core Stack

| Layer | Technology | Purpose / Notes |
|---|---|---|
| **UI Framework** | React 19.0.0 | Component-based clinical user interface |
| **Language** | TypeScript 5.7.0 | Strict type safety across domain, store, and UI |
| **Build Tool** | Vite 8.0.0 | Rapid HMR dev server & optimized production bundling |
| **State Management** | Zustand 5.0.0 | Lightweight, reactive, decoupled application store |
| **Styling** | Tailwind CSS 4.0.0 | Clean clinical light theme (AntiGravity baseline) |
| **Medical Imaging** | `dicom-parser` 1.8.21 | Client-side 8/12/16-bit DICOM parsing & VOI windowing |
| **Testing** | Vitest 3.0.0 + Testing Library | Pure unit, domain, store, and visual parity E2E testing |
| **Persistence** | `localStorage` + `IndexedDB` | Study metadata in localStorage, raw radiographs in IndexedDB |

### 2.2 Architectural Layers & Clean Separation

The codebase strictly enforces clean architectural boundaries:

```
src/
├── domain/                  # PURE CLINICAL & MATHEMATICAL ENGINE (No React/DOM imports)
│   ├── ai/                  # Heuristic landmark detector & ROI letterbox cropping
│   ├── dicom/               # DICOM parser, VOI windowing, auto-scale extraction
│   ├── coordinateTransform.ts # Screen-to-normalized & pan/zoom inverse transforms
│   ├── mandibularAsymmetry.ts # Ramus/body lengths, Habets formula, clinical conclusions
│   └── types.ts             # Domain types, points, calibration stages, studies
├── store/                   # REACTIVE APPLICATION STATE
│   └── studyStore.ts        # Zustand store orchestrating studies, calibration & landmarks
├── components/              # UI & INTERACTIVE COMPONENTS
│   ├── AnalysisPage.tsx     # Main workbench layout with topbar actions
│   ├── ImageViewer.tsx      # Canvas/SVG radiograph viewer with pan/zoom/contrast
│   ├── RadiographCanvasContainer.tsx # Unified zero-padding aspect-ratio canvas wrapper
│   ├── RadiographOverlay.tsx # Single Source of Truth SVG overlay (WYSIWYG)
│   ├── CalibrationPanel.tsx # 7-stage calibration workflow UI + DICOM status
│   ├── LandmarkPalette.tsx  # Landmark selector, AI trigger & coordinates
│   ├── ResultsPanel.tsx     # Quantitative bilateral metrics & structured conclusion
│   ├── ClinicalReportModal.tsx # 1-page A4/Letter print & PDF export modal
│   ├── StudyManager.tsx     # Local study drawer with Bulk Clear All
│   ├── ImageUploadZone.tsx  # OPG / DICOM drag-and-drop & CBCT 2D export guide
│   └── LanguageSwitcher.tsx # Instant EN / RU toggle
├── locales/                 # INTERNATIONALIZATION (i18n)
│   ├── en.ts                # English medical terminology & UI strings
│   ├── ru.ts                # Russian medical terminology & UI strings
│   └── types.ts             # Strongly-typed translation dictionary
├── persistence/             # CLIENT-SIDE STORAGE
│   ├── imageStore.ts        # IndexedDB image blob storage
│   └── studyRepository.ts   # localStorage metadata serialization & migration
└── test/                    # AUTOMATED TEST SUITES (346 tests across 11 files)
```

---

## 3. Clinical & Mathematical Foundations

### 3.1 Anatomical Landmarks

The system utilizes a 5-landmark clinical proxy protocol:

1. **`CoR`** — *Condylion Right*: Superior-most point of the right condylar head.
2. **`GoR`** — *Gonion Right*: Posteroinferior-most point of the right mandibular angle.
3. **`CoL`** — *Condylion Left*: Superior-most point of the left condylar head.
4. **`GoL`** — *Gonion Left*: Posteroinferior-most point of the left mandibular angle.
5. **`Me`** — *Menton*: Inferior-most point on the mandibular symphysis contour.

### 3.2 Clinical Metrics & Formulas

- **Ramus Height Proxy ($H_{ramus}$):** Euclidean distance between Condylion and Gonion ($\text{Co} \to \text{Go}$).
- **Mandibular Body Length Proxy ($L_{body}$):** Euclidean distance between Gonion and Menton ($\text{Go} \to \text{Me}$).
- **Habets Asymmetry Index ($AI$):**
  $$\text{Index} = \frac{|\text{Right} - \text{Left}|}{\text{Right} + \text{Left}} \times 100\%$$
- **Relative Difference ($RD$):**
  $$\text{Relative Difference} = \frac{\text{Right} - \text{Left}}{\max(\text{Right}, \text{Left})} \times 100\%$$
- **Absolute Millimeter Difference:**
  $$\Delta \text{mm} = |\text{Right}_{\text{mm}} - \text{Left}_{\text{mm}}|$$

### 3.3 Clinical Safety & Diagnostic Guardrails

1. **Comparative Language:** All generated conclusions strictly use comparative phrasing (e.g., *"The right ramus is 2.4 mm longer than the left ramus"*), explicitly avoiding diagnostic labels like *"hypoplasia"* or *"hyperplasia"*.
2. **Independent Evaluations:** Ramus height and mandibular body length are calculated and interpreted independently (accommodating cases where ramus is longer on one side while body is longer on the contralateral side).
3. **Mandatory 2D Projection Disclaimers:** Every report and conclusion displays prominent caveats regarding 2D magnification, head rotation artifacts, and the necessity of clinical correlation / 3D CBCT imaging.

---

## 4. Key Features Implemented

### 4.1 Medical Radiograph Ingestion & DICOM Support
- Supports JPEG, PNG, BMP, TIFF, and native **DICOM (`.dcm`)** files.
- Automatically handles 8-bit, 12-bit, and 16-bit monochromatic radiograph data, photometric interpretations (`MONOCHROME1` / `MONOCHROME2`), and VOI window width/center calculations.
- **DICOM Auto-Scale:** Automatically reads `PixelSpacing` (`0028,0030`) and `ImagerPixelSpacing` (`0018,1164`) metadata tags to initialize calibration immediately without manual input.
- **CBCT 2D Export Guidance:** Built-in modal guide providing step-by-step instructions for exporting panoramic curves from 3D CBCT software (Ez3D-i, Romexis, Planmeca, Carestream) to avoid uploading heavy 1GB 3D volumes.

### 4.2 Interactive Canvas & Precision Micro-Markers
- High-performance pan, zoom (25% to 500%), contrast, brightness, and inverted tone filters.
- **Precision Micro-Markers:** Landmarks render with 3.5px–4px visible dots and 1px center hair-cross focal points for exact placement over cortical bone, paired with 14px–16px invisible touch targets.
- **Obstructed Cursor Elimination:** Automatically applies `cursor: none` during active marker dragging, removing the OS grabbing hand icon so clinicians have a 100% unobstructed view of anatomical bone margins.
- **Isotropic Coordinate Scaling:** Implemented native pixel viewBox scaling (`0 0 natW natH`), preventing oval marker distortion across widescreen and letterboxed displays.

### 4.3 7-Stage Calibration State Machine
- Interactive state machine: `idle` $\to$ `placing-point-1` $\to$ `reviewing-point-1` $\to$ `placing-point-2` $\to$ `reviewing-point-2` $\to$ `entering-distance` $\to$ `calibrated`.
- Full drag-to-adjust support for calibration reference points $P_1$ and $P_2$.
- Safe cancellation restoring previous calibration states.

### 4.4 AI-Assisted Landmark Localization (Phase 2)
- Fast, deterministic client-side heuristic landmark detector (`src/domain/ai/landmarkDetector.ts`).
- **Content-Aware ROI Letterbox Cropping:** Detects and clips pitch-black and noisy letterbox/pillarbox radiograph padding to place candidate landmarks accurately within the true active anatomy.
- **Clinician-in-the-Loop:** Displays proposed points as dashed halo rings, requiring explicit acceptance or manual fine-tuning before inclusion in the final diagnostic record.
- Overwrite safety confirmation guards against accidental overwriting of existing landmarks.

### 4.5 1-Page Clinical PDF / Print Export
- Dedicated `ClinicalReportModal.tsx` displaying clinic branding, patient ID, date, calibration scale, high-resolution radiograph with overlaid measurement lines, quantitative data table, and medical disclaimer.
- Single Source of Truth (`RadiographOverlay.tsx` + `RadiographCanvasContainer.tsx`) guarantees sub-pixel visual parity ($< 0.0001\Delta$) between workspace editing and printed PDF reports.
- Optimized `@media print` CSS enforcing an exact 1-page A4 / US Letter portrait output.

### 4.6 Internationalization (i18n) & Bulk Storage Management
- Instant, zero-reload runtime toggle between **English (EN)** and **Russian (RU)**.
- Local persistence via `localStorage` (metadata) and `IndexedDB` (high-res image blobs).
- Header **"Clear All" (`Удалить всё`)** bulk deletion action equipped with modal safety confirmation.

---

## 5. Quality Assurance & Test Verification

The application maintains a comprehensive automated test suite with **100% pass rate** across all critical domain calculations, state transitions, coordinate math, and UI components.

### Test Execution Summary:
- **Total Test Files:** 11 files
- **Total Tests:** 346 tests
- **Passing:** 346 / 346 (100%)
- **TypeScript Typecheck:** 0 errors (`tsc --noEmit` clean)
- **Production Bundle:** Vite build clean

```
 ✓ src/domain/mandibularAsymmetry.test.ts (169 tests)
 ✓ src/domain/coordinateTransform.test.ts (37 tests)
 ✓ src/store/studyStore.test.ts (41 tests)
 ✓ src/test/aiDetection.test.ts (10 tests)
 ✓ src/test/dicomParser.test.ts (10 tests)
 ✓ src/test/integration.test.ts (17 tests)
 ✓ src/test/persistence.test.ts (12 tests)
 ✓ src/test/reportExport.test.ts (6 tests)
 ✓ src/test/visualParityE2E.test.tsx (6 tests)
 ✓ src/test/studyManager.test.tsx (6 tests)
 ✓ src/test/phase2Enhancements.test.tsx (32 tests)
```

---

## 6. How to Run, Build & Test

### Prerequisites
- **Node.js:** 20+ (Node.js 22 recommended)
- **Package Manager:** npm

### Commands
```bash
# 1. Install dependencies
npm install

# 2. Start local development server (http://localhost:5173)
npm run dev

# 3. Run automated test suite
npm test

# 4. Run type checker
npm run typecheck

# 5. Build for production (outputs to dist/)
npm run build

# 6. Preview production build locally
npm run preview
```

---

## 7. Future Roadmap & Extensibility (Phase 3+)

1. **Deep Learning Landmark Detection:** Transition from heuristic ROI estimation to lightweight client-side ONNX Runtime / WebGL neural models (e.g., YOLOv8-pose or U-Net trained on annotated OPG datasets).
2. **Sigmoid Notch Decomposition:** Extend the simplified Habets proxy to full classical Habets tracing (Sigmoid Notch to Condyle vs. Notch to Gonion decomposition).
3. **PACS / DICOMweb Integration:** Optional secure bridge for querying and retrieving OPG studies directly from hospital PACS servers via DICOMweb (WADO-RS / QIDO-RS).
4. **Cloud Multi-Tenancy (Optional):** Optional backend adapter replacing local IndexedDB persistence with HIPAA-compliant cloud storage (PostgreSQL + S3 with client-side encryption).

---

## 8. Handover Sign-Off

| Role | Agent | Status | Notes |
|---|---|---|---|
| **Project Manager** | PMBot | ✅ APPROVED | Complete delivery, documentation & workflow alignment |
| **Orthodontic Lead** | OrthoBot | ✅ APPROVED | Clinical formulas, safety guardrails & i18n verified |
| **Research Lead** | ResearchBot | ✅ APPROVED | Habets formula citation & 2D caveats verified |
| **Lead Developer** | DevBot | ✅ APPROVED | Clean architecture, zero DOM in domain, build clean |
| **UI/UX Lead** | UXBot | ✅ APPROVED | AntiGravity light UI, micro-markers & PDF export verified |
| **Computer Vision** | VisionBot | ✅ APPROVED | ROI cropping & heuristic AI landmark engine verified |
| **Test Lead** | TestBot | ✅ APPROVED | 346/346 automated tests passing |
| **QA Lead** | QABot | ✅ APPROVED | Zero regressions, visual parity verified |

---
*Generated by PMBot for the Mandibular Asymmetry Analysis Project.*
