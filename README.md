# Mandibular Asymmetry Analysis

A browser-based tool for 2D analysis of mandibular skeletal asymmetry from panoramic radiographs (OPG). Built with React 19, TypeScript, and Vite. No backend, no cloud — all computation runs locally in the browser.

> **Simplified method:** This MVP performs a simplified landmark-based mandibular asymmetry analysis using the Habets normalization formula. It does **not** reproduce the complete original Habets tracing protocol (which includes sigmoid notch decomposition). Only 5 landmarks are used: CoR, GoR, CoL, GoL, and Menton.

## Features

- **5 anatomical landmarks**: Condylar right (CoR), Gonial right (GoR), Condylar left (CoL), Gonial left (GoL), and Menton (Me)
- **Ramus length proxy** (Co–Go): Bilateral vertical measurement with Habets asymmetry index
- **Mandibular body length proxy** (Go–Me): Bilateral horizontal measurement with reliability caveat
- **Two asymmetry metrics**: Habets Asymmetry Index and Relative Difference (see formulas below)
- **Real-world measurements (mm)**: Interactive 7-stage calibration workflow — mark a known reference distance, enter its real-world value, and measurements convert from pixels to millimeters
- **Drag-to-adjust landmarks**: Click to place, drag to reposition
- **Visual overlay**: Canvas image layer with SVG landmark/line overlay
- **Local persistence**: Studies saved in the browser via localStorage (metadata) + IndexedDB (radiograph images). No server needed
- **Automated test suite**: Domain logic, persistence, and integration tests with Vitest

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 19, TypeScript 5.7 |
| Build | Vite 8 |
| State | Zustand 5 |
| Styling | Tailwind CSS 4 |
| Testing | Vitest 3, Testing Library |
| Linting | ESLint 9, typescript-eslint 8 |
| Persistence | Browser localStorage (metadata) + IndexedDB (images) |

## Getting Started

### Prerequisites

- Node.js 22+ (required by Vite 8)
- npm

### Install & Run

```bash
npm install
npm run dev      # start dev server (http://localhost:5173)
```

### Build for Production

```bash
npm run build    # type-check + bundle to dist/
npm run preview  # preview the production build locally
```

### Run Tests

```bash
npm test           # run all tests once
npm run test:watch # watch mode
npm run test:ui    # browser UI for tests
npm run lint       # run ESLint
npm run typecheck  # run TypeScript compiler (no emit)
```

## How It Works

1. **Upload an OPG image** — drag-and-drop or file picker
2. **Calibrate (optional)** — mark a known anatomical distance on the image and enter its real-world measurement in mm. The 7-stage state machine guides you through placing point 1, confirming it, placing point 2, confirming it, and finalizing calibration
3. **Place 5 landmarks** — click each landmark position on the image (CoR, GoR, CoL, GoL, Me). Drag to adjust if needed
4. **View results** — the tool calculates:
   - Ramus length proxy (CoR–GoR vs CoL–GoL) — vertical measurement
   - Mandibular body length proxy (GoR–Me vs GoL–Me) — horizontal measurement with reliability caveat
   - Habets Asymmetry Index and Relative Difference for each
   - All measurements in mm (after calibration)
   - Threshold classification for ramus measurements only (body length does not receive threshold classifications)
5. **Save study** — studies persist locally; reload the page and your work is still there

## Clinical Method

This tool implements a **simplified, landmark-based** method derived from the Habets approach for mandibular asymmetry assessment from panoramic radiographs.

### Measurements

| Measurement | Landmarks | Type | Note |
|-------------|-----------|------|------|
| **Ramus length proxy** | Co–Go (bilateral) | Vertical | Primary measurement; threshold classifications apply |
| **Mandibular body length proxy** | Go–Me (bilateral) | Horizontal | Secondary measurement; no threshold classification (horizontal measurements are less reliable on OPG) |

### Formulas

**Habets Asymmetry Index:**

```
|Right − Left| / (Right + Left) × 100
```

- Absolute (unsigned) value
- Range: 0% to +100%
- The standard metric used in research literature

**Relative Difference:**

```
|Right − Left| / max(Right, Left) × 100
```

- Absolute (unsigned) value
- Range: 0% to +100%
- Represents how much the smaller side differs from the larger side

> **Note:** These two formulas are mathematically distinct. The Relative Difference is not a fixed multiple of the Habets index.

### Threshold Classification (Ramus Length Proxy Only)

| Band | Habets Index (absolute) | Label |
|------|------------------------|-------|
| 1 | < 3% | Within typical range |
| 2 | 3–6% | Borderline |
| 3 | > 6% | Above technical error margin |

Threshold values are based on published literature and the known technical error margin of panoramic radiography, not on validated clinical outcomes. They are guidelines for interpretation, not diagnostic criteria.

**Body length measurements do not receive threshold classifications** because the thresholds were derived from vertical measurement data and do not apply to horizontal measurements, which have higher and more variable magnification on OPG.

### Calibration Limitations

- Calibration is **approximate** — it uses a user-marked reference distance to compute mm/pixel
- It does **not** eliminate panoramic distortion (non-uniform magnification across the image)
- Absolute mm values are estimates from a 2D projection and should not be used as precise anatomical values
- For precise measurements, use CBCT or 3D imaging

### Medical Disclaimer

This tool provides comparative measurements only. It does **not** produce diagnostic conclusions. 2D panoramic radiographs have inherent projection limitations. Always correlate with clinical examination and 3D imaging (CBCT) when indicated.

## Local Persistence

Studies are stored entirely in the browser:

- **Study metadata** (landmarks, calibration, measurements, timestamps) is stored in `localStorage`
- **Radiograph images** (base64 data URLs, which can be 1–5 MB each) are stored in `IndexedDB` to avoid exceeding localStorage's 5–10 MB limit
- **Data stays on the same browser/device** — no server, no cloud sync
- **Clearing browser data** (cache, site data, "clear all data") may remove saved studies
- The app is not designed for multi-device access or data sharing

### Migration

If you have existing studies from a previous version where images were stored in localStorage, they are automatically migrated to IndexedDB on first load. The metadata remains in localStorage; only the image data is moved.

## Architecture

```
src/
  domain/           Pure calculation functions — NO React imports
    mandibularAsymmetry.ts   Domain functions (distances, side diffs, Habets, tiers, summary)
    coordinateTransform.ts   Normalized ↔ pixel coordinate conversions
    types.ts                 Point, LandmarkName, LandmarkSet, Calibration, FullResults
  components/        React UI components
    ImageViewer.tsx          Canvas image + SVG overlay rendering
    LandmarkPalette.tsx      Landmark selection buttons
    CalibrationPanel.tsx     7-stage calibration workflow UI
    ResultsPanel.tsx         Asymmetry results display
    ImageUploadZone.tsx      Drag-and-drop image upload
    StudyManager.tsx         Study save/load/delete
  pages/
    AnalysisPage.tsx         Main analysis page layout
  store/             Zustand state stores
    studyStore.ts            Study state with auto-recalculation and debounced autosave
  persistence/       Persistence layer
    studyRepository.ts       localStorage metadata + IndexedDB image storage
    imageStore.ts            IndexedDB image store (base64 data URLs)
  test/              Test setup and utilities
    setup.ts                 Vitest setup (jest-dom matchers)
```

### Design Principles

- **Domain layer is pure**: All clinical calculations live in `src/domain/` as pure functions with zero React dependencies — fully testable in isolation
- **Normalized coordinates**: Landmarks stored as normalized (0.0–1.0) coordinates, independent of image display size
- **Separate rendering layers**: Image on Canvas, landmarks/lines on SVG overlay — clean separation, no redraw conflicts
- **No calculation logic in UI**: Components only render; all math is in the domain layer
- **Images in IndexedDB, metadata in localStorage**: Prevents localStorage quota exhaustion from large base64 images

## Documentation

- `docs/user-manual-landmarks.md` — Landmark & calibration placement user manual
- `docs/user-manual-calibration.md` — Calibration user manual
- `docs/clinical-protocol.md` — Clinical analysis protocol
- `docs/clinical-evidence.md` — Scientific evidence base (40 references)
- `docs/architecture.md` — Technical architecture
- `docs/ux-design.md` — UX design specification
- `docs/threshold-validation.md` — Threshold validation decision document

## CI

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every pull request and push to main/master:
- `npm ci` — install dependencies
- `npm run lint` — ESLint
- `npm test` — Vitest test suite
- `npm run build` — TypeScript compilation + Vite production build

## License

Private project. All rights reserved.

## Status

MVP complete. Future phases:
- Phase 2: AI-assisted landmark detection
- DICOM auto-scale (automatic calibration from DICOM metadata)