# Mandibular Asymmetry Analysis

A browser-based tool for 2D analysis of mandibular skeletal asymmetry from panoramic radiographs (OPG). Built with React 19, TypeScript, and Vite. No backend, no cloud — all computation runs locally in the browser.

## Features

- **5 anatomical landmarks**: Condylar right (CoR), Gonial right (GoR), Condylar left (CoL), Gonial left (GoL), and Menton (Me)
- **Habets asymmetry index**: Calculates side-to-side differences for condylar and gonial heights
- **Real-world measurements (mm)**: Interactive calibration workflow — mark a known reference distance on the image, enter its real-world value, and all subsequent measurements convert from pixels to millimeters
- **7-stage calibration state machine**: Explicit placing → reviewing → confirm workflow prevents accidental misplacement
- **Drag-to-adjust landmarks**: Click to place, drag to reposition
- **Visual overlay**: Canvas image layer with SVG landmark/line overlay
- **localStorage persistence**: Studies saved locally in the browser, no server needed
- **247 passing tests**: Domain logic fully unit-tested with Vitest

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 19, TypeScript |
| Build | Vite 8 |
| State | Zustand 5 |
| Styling | Tailwind CSS 4 |
| Testing | Vitest 3, Testing Library |
| Persistence | Browser localStorage |

## Getting Started

### Prerequisites

- Node.js 18+ (tested on Node 22)
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
npm test         # run all 247 tests once
npm run test:watch  # watch mode
npm run test:ui  # browser UI for tests
```

## How It Works

1. **Upload an OPG image** — drag-and-drop or file picker
2. **Calibrate** — mark a known anatomical distance on the image and enter its real-world measurement in mm. The 7-stage state machine guides you through placing point 1, confirming it, placing point 2, confirming it, and finalizing calibration
3. **Place 5 landmarks** — click each landmark position on the image (CoR, GoR, CoL, GoL, Me). Drag to adjust if needed
4. **View results** — the tool calculates:
   - Condylar height asymmetry (CoR–GoR vs CoL–GoL)
   - Gonial height asymmetry
   - Habets index values
   - All measurements in mm (after calibration)
5. **Save study** — studies persist in localStorage; reload the page and your work is still there

## Architecture

```
src/
  domain/           Pure calculation functions — NO React imports
    mandibularAsymmetry.ts   7 pure domain functions (distances, side diffs, Habets, tiers)
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
  persistence/       localStorage persistence layer
  test/              Test setup and utilities
```

### Design Principles

- **Domain layer is pure**: All clinical calculations live in `src/domain/` as pure functions with zero React dependencies — fully testable in isolation
- **Normalized coordinates**: Landmarks stored as normalized (0.0–1.0) coordinates, independent of image display size
- **Separate rendering layers**: Image on Canvas, landmarks/lines on SVG overlay — clean separation, no redraw conflicts
- **No calculation logic in UI**: Components only render; all math is in the domain layer

## Clinical Method

Based on the Habets method for mandibular asymmetry assessment from panoramic radiographs:

- **Condylar height**: Distance from condylion (Co) to gonion (Go) on each side
- **Gonial height**: Distance from gonion (Go) to menton (Me) on each side  
- **Asymmetry index**: `|Right - Left| / max(Right, Left) × 100`
- **Dominant side**: The side with the larger measurement

### Medical Disclaimer

This tool provides comparative measurements only. It does **not** produce diagnostic conclusions. 2D panoramic radiographs have inherent projection limitations. Always correlate with clinical examination and 3D imaging (CBCT) when indicated.

## Documentation

- `docs/clinical-protocol.md` — Clinical analysis protocol
- `docs/clinical-evidence.md` — Scientific evidence base (40 references)
- `docs/architecture.md` — Technical architecture
- `docs/ux-design.md` — UX design specification
- `docs/user-manual-calibration.md` — Calibration user manual

## License

Private project. All rights reserved.

## Status

MVP complete. Future phases:
- Phase 2: AI-assisted landmark detection
- DICOM auto-scale (automatic calibration from DICOM metadata)
- Lint configuration