# Software Architecture: Mandibular Asymmetry Analysis MVP

> **Author:** DevBot
> **Date:** 2026-08-16
> **Status:** DRAFT — Architecture design for MVP implementation
> **Clinical basis:** docs/clinical-protocol.md (OrthoBot, APPROVED)
> **Evidence base:** docs/clinical-evidence.md (ResearchBot, 40 references)
> **Project context:** agents/PROJECT_CONTEXT.md

---

## Table of Contents

1. [Overview & Design Principles](#1-overview--design-principles)
2. [Project Setup & Build Configuration](#2-project-setup--build-configuration)
3. [Directory Structure](#3-directory-structure)
4. [State Management (Zustand)](#4-state-management-zustand)
5. [Rendering Strategy: Image Layer + Overlay Layer](#5-rendering-strategy-image-layer--overlay-layer)
6. [Normalized Coordinate System](#6-normalized-coordinate-system)
7. [Study Persistence (localStorage)](#7-study-persistence-localstorage)
8. [Component Tree](#8-component-tree)
9. [Domain Module Interface](#9-domain-module-interface)
10. [Calibration Implementation](#10-calibration-implementation)
11. [Image Viewer Interaction Model](#11-image-viewer-interaction-model)
12. [Data Flow: Landmark Edit → Recalculation](#12-data-flow-landmark-edit--recalculation)
13. [Testing Strategy](#13-testing-strategy)
14. [Future Extensibility](#14-future-extensibility)

---

## 1. Overview & Design Principles

### 1.1 Purpose

A web-based clinical module for 2D analysis of mandibular skeletal asymmetry
from panoramic radiographs (OPG). The clinician uploads an OPG, places 5
anatomical landmarks, and obtains quantitative bilateral comparison of ramus
height and mandibular body length with percentage asymmetry metrics and a
structured clinical interpretation.

### 1.2 Architecture Layers

```
┌─────────────────────────────────────────────────────┐
│  UI Layer (src/components/, src/pages/)             │
│  React components — render state, capture input     │
│  NO calculation logic                               │
├─────────────────────────────────────────────────────┤
│  State Layer (src/store/)                           │
│  Zustand store — holds study state, triggers        │
│  recalculation on landmark edits                    │
├─────────────────────────────────────────────────────┤
│  Domain Layer (src/domain/)                         │
│  Pure functions — all clinical calculations         │
│  NO React imports, NO side effects                  │
├─────────────────────────────────────────────────────┤
│  Persistence Layer (src/persistence/)               │
│  localStorage adapter — save/load studies            │
│  Swappable for future backend API                   │
└─────────────────────────────────────────────────────┘
```

### 1.3 Key Architectural Rules (from PROJECT_CONTEXT.md)

| Rule | Enforcement |
|------|-------------|
| Domain layer is pure | No React imports in `src/domain/`; unit-testable in isolation |
| UI never calculates | Components call domain functions; no formulas in components |
| Normalized coordinates | Landmarks stored as `{x: 0.0–1.0, y: 0.0–1.0}`, never screen pixels |
| Separate rendering layers | Image (bottom) and overlay (top) are independent layers |
| Immediate recalculation | Landmark edits trigger recalculation automatically — no "Recalculate" button |
| Navigation-safe persistence | Study data survives view navigation; no data loss on route change |

---

## 2. Project Setup & Build Configuration

### 2.1 Technology Stack

| Tool | Version | Purpose |
|------|---------|---------|
| React | 19.x | UI framework |
| TypeScript | 5.7+ | Type safety |
| Vite | 8.x | Build tool / dev server |
| Zustand | 5.x | State management |
| Tailwind CSS | 4.x | Styling |
| Vitest | 3.x | Unit testing |
| Playwright | 1.49+ | E2E testing (TestBot/QABot) |

### 2.2 package.json

```json
{
  "name": "mandibular-asymmetry",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^5.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "typescript": "^5.7.0",
    "vite": "^8.0.0",
    "vitest": "^3.0.0",
    "@vitest/ui": "^3.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "jsdom": "^25.0.0",
    "eslint": "^9.0.0",
    "@eslint/js": "^9.0.0",
    "typescript-eslint": "^8.0.0",
    "eslint-plugin-react-hooks": "^5.0.0"
  }
}
```

> **Note:** No routing library in MVP. The app is a single-view application
> (upload → analyze → results in one page). If multi-page navigation is added
> later, `react-router` or `@tanstack/router` can be introduced — the store
> design ensures study data survives navigation regardless.

### 2.3 vite.config.ts

**vite.config.ts:**
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
```

**vitest.config.ts:**
```typescript
/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
```

> Vitest configuration is in a separate `vitest.config.ts` using
> `vitest/config`'s `defineConfig`, which extends Vite's config with the
> `test` field. Vite's own `defineConfig` does not include the `test`
> property, so a separate config file is the clean approach.

### 2.4 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@domain/*": ["./src/domain/*"],
      "@components/*": ["./src/components/*"],
      "@store/*": ["./src/store/*"],
      "@persistence/*": ["./src/persistence/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 2.5 tsconfig.node.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "allowImportingTsExtensions": true
  },
  "include": ["vite.config.ts"]
}
```

### 2.6 Tailwind CSS Setup (v4)

Tailwind CSS v4 uses a Vite plugin and a single CSS import — no
`tailwind.config.js` needed for the MVP.

**src/styles/index.css:**
```css
@import "tailwindcss";

/* Custom theme tokens can be added here via @theme */
@theme {
  --color-ramus: #2563eb;
  --color-body: #7c3aed;
  --color-warning: #f59e0b;
  --color-danger: #dc2626;
}
```

**src/main.tsx** imports `./styles/index.css` at the top.

---

## 3. Directory Structure

```
mandibular-asymmetry/
├── agents/                    # Agent instructions (not shipped)
├── docs/                      # Documentation
│   ├── architecture.md        # This file
│   ├── clinical-protocol.md   # OrthoBot's approved protocol
│   └── clinical-evidence.md   # ResearchBot's evidence review
├── src/
│   ├── domain/                # Pure calculation functions
│   │   ├── mandibularAsymmetry.ts   # 7 pure functions
│   │   └── types.ts           # Shared domain types (Point, LandmarkName, etc.)
│   ├── store/                 # Zustand state management
│   │   └── studyStore.ts      # Study store with recalculation
│   ├── persistence/           # localStorage adapter
│   │   └── studyRepository.ts  # save/load/delete studies
│   ├── components/            # Reusable UI components
│   │   ├── imageViewer/       # Image viewer + overlay
│   │   │   ├── ImageViewer.tsx       # Container: image + canvas layers
│   │   │   ├── ImageLayer.tsx        # Bottom layer: radiograph image
│   │   │   ├── OverlayLayer.tsx      # Top layer: landmarks + measurements (SVG)
│   │   │   └── useImageTransform.ts  # Hook: zoom, pan, brightness, contrast
│   │   ├── landmarks/         # Landmark placement UI
│   │   │   ├── LandmarkPalette.tsx   # Landmark selector buttons
│   │   │   ├── LandmarkMarker.tsx    # Individual landmark SVG marker
│   │   │   └── MeasurementLine.tsx   # SVG line between landmark pairs
│   │   ├── results/           # Measurement results display
│   │   │   ├── MetricsTable.tsx      # Habets + relative difference table
│   │   │   ├── ClinicalSummary.tsx   # Structured interpretation text
│   │   │   ├── ThresholdBadge.tsx    # Tier classification badge
│   │   │   └── CalibrationPanel.tsx  # Mode A/B calibration controls
│   │   └── common/            # Shared UI (buttons, warnings, etc.)
│   │       ├── LimitationNotice.tsx  # Mandatory limitation statements
│   │       └── WarningBanner.tsx     # Body length reliability warning
│   ├── pages/                 # Page-level views
│   │   └── AnalysisPage.tsx   # Main page: upload → analyze → results
│   ├── styles/
│   │   └── index.css          # Tailwind import + theme tokens
│   ├── test/                  # Test setup and utilities
│   │   ├── setup.ts            # Vitest setup (jest-dom matchers)
│   │   └── fixtures.ts        # Test landmark sets, mock studies
│   ├── App.tsx                # Root component
│   ├── main.tsx               # Entry point
│   └── vite-env.d.ts          # Vite type declarations
├── index.html
├── package.json
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── .gitignore
└── README.md
```

### 3.1 Import Path Aliases

| Alias | Maps To |
|-------|---------|
| `@/*` | `./src/*` |
| `@domain/*` | `./src/domain/*` |
| `@components/*` | `./src/components/*` |
| `@store/*` | `./src/store/*` |
| `@persistence/*` | `./src/persistence/*` |

---

## 4. State Management (Zustand)

### 4.1 Why Zustand

- **Minimal boilerplate** — no providers, reducers, or context trees
- **Direct store access** — components subscribe to slices, avoiding
  unnecessary re-renders
- **Middleware support** — `subscribeWithSelector` for persistence triggers,
  `devtools` for debugging
- **No React context required** — store is a standalone module, testable in
  isolation

### 4.2 Store Design: `src/store/studyStore.ts`

```typescript
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

// ── State Shape ──────────────────────────────────────────

interface StudyState {
  // ── Study metadata ──
  studyId: string | null;
  patientId: string;
  createdAt: string;
  updatedAt: string;

  // ── Image ──
  imageDataUrl: string | null;     // base64 or object URL
  imageNaturalWidth: number;       // original image width (px)
  imageNaturalHeight: number;      // original image height (px)

  // ── Landmarks (normalized 0.0–1.0) ──
  landmarks: LandmarkSet;          // Partial<Record<LandmarkName, Point>>

  // ── Active landmark (for placement) ──
  activeLandmark: LandmarkName | null;

  // ── Calibration ──
  calibration: Calibration | null;
  calibrationPoints: [Point, Point] | null;  // two marked points
  calibrationMode: "A" | "B";                 // A = uncalibrated, B = calibrated

  // ── Computed measurements (derived from landmarks) ──
  measurements: StudyMeasurements | null;

  // ── Image viewer transform ──
  viewer: {
    zoom: number;        // 1.0 = fit-to-screen
    panX: number;        // pan offset in screen px
    panY: number;
    brightness: number;  // 1.0 = normal
    contrast: number;    // 1.0 = normal
  };

  // ── Persistence status ──
  isSaved: boolean;
  lastSavedAt: string | null;
}

// ── Actions ─────────────────────────────────────────────

interface StudyActions {
  // Study lifecycle
  createStudy: (patientId: string, imageDataUrl: string, width: number, height: number) => void;
  loadStudy: (studyId: string) => void;
  saveStudy: () => void;
  deleteStudy: (studyId: string) => void;

  // Landmark operations
  setLandmark: (name: LandmarkName, point: Point) => void;   // triggers recalc
  moveLandmark: (name: LandmarkName, point: Point) => void;  // triggers recalc
  deleteLandmark: (name: LandmarkName) => void;               // triggers recalc
  setActiveLandmark: (name: LandmarkName | null) => void;

  // Calibration
  setCalibrationPoint: (index: 0 | 1, point: Point) => void;
  setCalibrationDistance: (mm: number) => void;
  clearCalibration: () => void;

  // Viewer transform
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setBrightness: (value: number) => void;
  setContrast: (value: number) => void;
  resetViewer: () => void;

  // Internal: recalculate measurements from landmarks
  recalculate: () => void;
}
```

### 4.3 Recalculation Trigger

Every landmark mutation (`setLandmark`, `moveLandmark`, `deleteLandmark`)
calls `recalculate()` before returning. This implements the
"immediate recalculation" requirement — no manual "Recalculate" button.

```typescript
setLandmark: (name, point) =>
  set((state) => {
    const landmarks = { ...state.landmarks, [name]: point };
    const measurements = computeMeasurements(landmarks, state.calibration, state.imageNaturalWidth, state.imageNaturalHeight);
    return { landmarks, measurements, isSaved: false, updatedAt: new Date().toISOString() };
  }),
```

The `computeMeasurements` function is a **thin orchestration wrapper** in the
store module that calls the domain functions — it contains NO clinical logic
itself, only sequencing of domain function calls.

### 4.4 Persistence Subscription

```typescript
// Auto-save to localStorage on landmark or calibration changes (debounced)
useStudyStore.subscribe(
  (state) => state.landmarks,
  (landmarks) => {
    if (landmarks) {
      debounceSave();
    }
  }
);
```

Auto-save is debounced (500ms) to avoid excessive localStorage writes during
drag operations. A manual "Save" button also exists for explicit saves.

---

## 5. Rendering Strategy: Image Layer + Overlay Layer

### 5.1 Two-Layer Architecture

```
┌─────────────────────────────────────────┐
│  Overlay Layer (SVG)                   │  ← z-index: 10
│  - Landmark markers (circles)          │
│  - Measurement lines                    │
│  - Labels (CoR, GoR, etc.)             │
│  - Calibration line (Mode B)           │
│  - Transparent except for drawn items  │
├─────────────────────────────────────────┤
│  Image Layer (Canvas/IMG)              │  ← z-index: 1
│  - Radiograph image                    │
│  - Brightness/contrast CSS filters     │
│  - Pan/zoom transform                  │
└─────────────────────────────────────────┘
│  Container (relative positioned)      │
│  - Captures mouse events               │
│  - Converts screen px → normalized     │
└─────────────────────────────────────────┘
```

### 5.2 Why SVG for the Overlay (Not Canvas)

| Criterion | SVG | Canvas |
|-----------|-----|--------|
| Interaction (click/drag landmarks) | Native DOM events per element | Manual hit-testing |
| Accessibility | Screen-reader friendly (ARIA) | Not accessible |
| React integration | JSX elements render naturally | Requires imperative draw calls |
| Performance (5–10 elements) | Excellent | Overkill — canvas shines for 1000+ elements |
| Debugging | Browser DevTools inspector | Opaque pixel buffer |

**Decision: SVG for the overlay layer.** The overlay contains at most ~15
drawn elements (5 landmarks + 4 measurement lines + labels + calibration
line), well within SVG's sweet spot.

### 5.3 Image Layer Implementation

The image is rendered as an `<img>` element (or `<canvas>` if pixel-level
brightness/contrast is needed — CSS filters on `<img>` are simpler and
sufficient for MVP).

```jsx
<div className="relative overflow-hidden" ref={containerRef}>
  {/* Image layer */}
  <img
    src={imageDataUrl}
    alt="Panoramic radiograph"
    className="absolute inset-0 w-full h-full object-contain"
    style={{
      filter: `brightness(${viewer.brightness}) contrast(${viewer.contrast})`,
      transform: `translate(${viewer.panX}px, ${viewer.panY}px) scale(${viewer.zoom})`,
      transformOrigin: "center",
    }}
    onLoad={handleImageLoad}
  />

  {/* Overlay layer */}
  <svg
    className="absolute inset-0 w-full h-full"
    viewBox="0 0 1 1"
    preserveAspectRatio="xMidYMid meet"
    onClick={handleOverlayClick}
  >
    {/* Measurement lines */}
    <MeasurementLine from={landmarks.CoR} to={landmarks.GoR} color="ramus" />
    {/* Landmark markers */}
    <LandmarkMarker name="CoR" point={landmarks.CoR} />
  </svg>
</div>
```

### 5.4 Coordinate Transformation

Mouse clicks arrive in screen pixels. The container's bounding rect maps
these to normalized coordinates:

```typescript
function screenToNormalized(
  clientX: number,
  clientY: number,
  rect: DOMRect
): Point {
  return {
    x: (clientX - rect.left) / rect.width,
    y: (clientY - rect.top) / rect.height,
  };
}
```

This normalized point is stored in the store. The SVG `viewBox="0 0 1 1"`
renders normalized coordinates directly — no pixel math needed in the overlay.

---

## 6. Normalized Coordinate System

### 6.1 Why Normalized Coordinates

| Problem with pixel coordinates | Normalized solution |
|--------------------------------|---------------------|
| Resizing the window shifts landmarks | `{x: 0.5, y: 0.3}` is always center-left |
| Different image sizes break landmarks | Stored relative to image dimensions |
| Zoom/pan changes pixel positions | Normalized coords are zoom/pan-invariant |
| Persisted studies break on different displays | Normalized coords are display-independent |

### 6.2 Definition

```typescript
type Point = { x: number; y: number };
// x: 0.0 = left edge, 1.0 = right edge
// y: 0.0 = top edge, 1.0 = bottom edge
```

### 6.3 Conversion: Normalized ↔ Screen Pixels

```typescript
// Normalized → screen pixels (for rendering on canvas or DOM positioning)
function normalizedToScreen(point: Point, rect: DOMRect): Point {
  return {
    x: point.x * rect.width,
    y: point.y * rect.height,
  };
}

// Screen pixels → normalized (for storing landmark positions)
function screenToNormalized(x: number, y: number, rect: DOMRect): Point {
  return {
    x: clamp(x / rect.width, 0, 1),
    y: clamp(y / rect.height, 0, 1),
  };
}

// Normalized → image pixels (for calibration pixel distance)
function normalizedToImagePixels(
  point: Point,
  imageWidth: number,
  imageHeight: number
): Point {
  return {
    x: point.x * imageWidth,
    y: point.y * imageHeight,
  };
}
```

### 6.4 Distance Calculation in Normalized Space

The domain function `calculateDistance(A, B)` operates in normalized space:

```
distance = √((A.x − B.x)² + (A.y − B.y)²)
```

Result is in normalized units (0.0–1.414, the diagonal of a unit square).

For Mode B (calibrated), the conversion to mm requires the image's natural
pixel dimensions:

```
distance_px = distance_normalized × imageNaturalWidth
             (assuming uniform aspect — if not, use the dominant axis)
distance_mm = distance_px × mmPerPixel
```

> **Aspect ratio note:** OPG images may not be square. The normalized space
> uses the image's aspect ratio implicitly — `x` is normalized to width, `y`
> to height. For distance calculations, we convert to image pixels using the
> natural dimensions, then apply `mmPerPixel`. This preserves correct
> Euclidean distances regardless of display size. The store passes
> `imageNaturalWidth` and `imageNaturalHeight` to the domain orchestration
> function for this conversion.

---

## 7. Study Persistence (localStorage)

### 7.1 Storage Schema

```typescript
// localStorage key: "ma.studies" → JSON array of Study objects
// localStorage key: "ma.currentStudyId" → string (active study)

interface StoredStudy {
  studyId: string;
  patientId: string;
  imageDataUrl: string;       // base64-encoded image
  imageNaturalWidth: number;
  imageNaturalHeight: number;
  landmarks: LandmarkSet;     // normalized coordinates
  calibration: Calibration | null;
  calibrationPoints: [Point, Point] | null;
  measurements: StudyMeasurements;
  interpretation: string;     // generated clinical summary text
  createdAt: string;          // ISO 8601
  updatedAt: string;           // ISO 8601
}
```

### 7.2 Repository Interface

```typescript
// src/persistence/studyRepository.ts

interface StudyRepository {
  getAll(): StoredStudy[];
  getById(studyId: string): StoredStudy | null;
  save(study: StoredStudy): void;
  remove(studyId: string): void;
  getCurrentStudyId(): string | null;
  setCurrentStudyId(studyId: string | null): void;
}

// MVP implementation: LocalStorageStudyRepository
// Future: ApiStudyRepository (same interface, different backend)
```

### 7.3 localStorage Limits & Considerations

| Concern | Mitigation |
|---------|-----------|
| 5–10MB per-origin limit | Compress images before storing; warn if image > 2MB |
| Base64 bloats size ~33% | Accept for MVP; future: IndexedDB for binary blobs |
| Synchronous API blocks main thread | Debounce saves; off-load to `requestIdleCallback` |
| No query capability | MVP has < 100 studies; linear scan is acceptable |
| Private browsing may disable localStorage | Graceful degradation: warn "storage unavailable" |

### 7.4 Image Storage Strategy

```
Upload flow:
1. User selects OPG image file
2. FileReader.readAsDataURL → base64 string
3. If size > 2MB, downscale via canvas (max dimension 2000px)
4. Store base64 in store.imageDataUrl
5. On save, persist to localStorage
```

### 7.5 Navigation Safety

The Zustand store lives at module scope — it is NOT tied to React component
lifecycle. Navigating between views (if routes are added) does not unmount
the store. The only way to clear study data is an explicit "New Study" or
"Delete Study" action.

---

## 8. Component Tree

```
App
└── AnalysisPage                        # Main single-page view
    ├── ImageUploadZone                 # Drag-drop or file picker (shown when no image)
    ├── ImageViewer                     # Container: image + overlay + controls
    │   ├── ImageLayer                   #   <img> with CSS filters + transform
    │   ├── OverlayLayer                 #   <svg viewBox="0 0 1 1">
    │   │   ├── MeasurementLine          #     CoR→GoR, CoL→GoL, GoR→Me, GoL→Me
    │   │   ├── LandmarkMarker           #     Circle + label for each placed landmark
    │   │   └── CalibrationLine          #     Two-point calibration line (Mode B)
    │   └── ViewerToolbar                 #   Zoom, pan, brightness, contrast, reset buttons
    ├── LandmarkPalette                  # Buttons to select active landmark for placement
    ├── CalibrationPanel                 # Mode A/B toggle, calibration point placement, mm input
    ├── ResultsPanel                     # Shown when ≥ required landmarks placed
    │   ├── MetricsTable                  #   Habets index + relative difference (both measurements)
    │   ├── ThresholdBadge               #   Tier classification badge per measurement
    │   ├── ClinicalSummary              #   Structured interpretation text (from domain)
    │   └── LimitationNotice              #   Mandatory limitation statements
    ├── StudyManager                     # Save, load, new, delete study
    └── WarningBanner                    # Body length reliability warning (persistent)
```

### 8.1 Component Responsibilities

| Component | Responsibility | Reads from Store | Writes to Store |
|-----------|---------------|------------------|-----------------|
| `AnalysisPage` | Layout orchestration, view state | all | — |
| `ImageUploadZone` | File selection, image load | `imageDataUrl` | `createStudy` |
| `ImageViewer` | Container for layers, mouse event delegation | `viewer`, `landmarks` | `setLandmark` (via click) |
| `ImageLayer` | Render image with CSS filters | `imageDataUrl`, `viewer` | — |
| `OverlayLayer` | Render SVG landmarks, lines, labels | `landmarks`, `calibrationPoints` | `setLandmark` (via drag) |
| `ViewerToolbar` | Zoom/pan/brightness/contrast controls | `viewer` | `setZoom`, `setPan`, etc. |
| `LandmarkPalette` | Select active landmark for placement | `activeLandmark`, `landmarks` | `setActiveLandmark` |
| `CalibrationPanel` | Calibration mode toggle, mm input | `calibration`, `calibrationMode` | `setCalibrationPoint`, `setCalibrationDistance` |
| `MetricsTable` | Display Habets + relative difference | `measurements` | — |
| `ThresholdBadge` | Display tier classification | `measurements` | — |
| `ClinicalSummary` | Render interpretation text | `measurements` | — |
| `LimitationNotice` | Mandatory limitation statements | — | — |
| `StudyManager` | Save/load/delete studies | `studyId`, `isSaved` | `saveStudy`, `loadStudy`, `deleteStudy` |

### 8.2 Rendering Rules

- **No calculation in components.** `MetricsTable` receives computed values
  from `measurements` in the store; it does not call `calculateAsymmetryIndex`
  directly.
- **`ClinicalSummary` receives the pre-generated text** from
  `measurements.interpretation` (produced by `generateClinicalSummary` in the
  domain layer). It only renders it.
- **`OverlayLayer` reads landmark positions** and renders SVG elements. It
  does not compute distances — it draws lines between stored points.

---

## 9. Domain Module Interface

### 9.1 Location

`src/domain/mandibularAsymmetry.ts` — pure functions, zero React imports.

### 9.2 Types (`src/domain/types.ts`)

```typescript
// ── Core Types ───────────────────────────────────────────

/** Normalized point: x and y in range [0.0, 1.0] */
type Point = { x: number; y: number };

/** The 5 anatomical landmarks */
type LandmarkName = "CoR" | "GoR" | "CoL" | "GoL" | "Me";

/** Partial set of placed landmarks */
type LandmarkSet = Partial<Record<LandmarkName, Point>>;

/** Calibration data (Mode B) */
interface Calibration {
  pixelDistance: number;    // distance between calibration points in image px
  realDistanceMm: number;   // known real-world distance
  mmPerPixel: number;       // computed: realDistanceMm / pixelDistance
}

/** Dominant side determination */
type DominantSide = "right" | "left" | "equal";

/** Asymmetry classification tiers */
type AsymmetryTier =
  | "within_typical_range"
  | "borderline"
  | "above_technical_error_margin";

/** Side difference result */
interface SideDifference {
  difference: number;          // R − L (signed)
  absoluteDifference: number;   // |R − L|
}

/** Complete measurement for one anatomical measurement (ramus or body) */
interface MeasurementResult {
  right: number;                       // right-side distance (normalized or mm)
  left: number;                        // left-side distance
  difference: number;                  // R − L
  absoluteDifference: number;          // |R − L|
  relativeDifferencePercent: number;   // |R−L| / ((R+L)/2) × 100
  asymmetryIndexPercent: number;       // (R−L) / (R+L) × 100 (signed)
  dominantSide: DominantSide;
  classification: AsymmetryTier;
  rightMm: number | null;              // null in Mode A
  leftMm: number | null;              // null in Mode A
}

/** All measurements for a study */
interface StudyMeasurements {
  ramusHeight: MeasurementResult | null;   // null if landmarks incomplete
  bodyLength: MeasurementResult | null;
}

/** Full results for clinical summary generation */
interface FullResults {
  ramusHeight: MeasurementResult | null;
  bodyLength: MeasurementResult | null;
  calibration: Calibration | null;
  calibrationMode: "A" | "B";
}
```

### 9.3 Function Signatures

```typescript
// ── 7 Pure Functions (matching clinical protocol §11) ──

/**
 * Euclidean distance between two normalized points.
 * @returns distance in normalized units (0.0–1.414)
 */
function calculateDistance(a: Point, b: Point): number;

/**
 * Signed and absolute difference between right and left measurements.
 * @param right - right-side measurement value
 * @param left  - left-side measurement value
 * @returns { difference: R−L, absoluteDifference: |R−L| }
 */
function calculateSideDifference(right: number, left: number): SideDifference;

/**
 * Relative difference: |R−L| / ((R+L)/2) × 100
 * Always positive. Rounded to 1 decimal place.
 * @returns percentage (0% to 200%)
 */
function calculateRelativeDifference(right: number, left: number): number;

/**
 * Habets Asymmetry Index: (R−L) / (R+L) × 100
 * Signed (positive = right greater). Rounded to 1 decimal place.
 * @returns percentage (−100% to +100%)
 */
function calculateAsymmetryIndex(right: number, left: number): number;

/**
 * Determine which side is larger.
 * "equal" if relative difference ≤ 0.5%.
 * @returns "right" | "left" | "equal"
 */
function determineDominantSide(right: number, left: number): DominantSide;

/**
 * Classify asymmetry by tier using absolute Habets index.
 * [0, 3) → within_typical_range
 * [3, 6] → borderline
 * (6, ∞) → above_technical_error_margin
 * @param habetsAbsValue - absolute value of Habets index (|AI|)
 * @returns tier classification
 */
function classifyAsymmetry(habetsAbsValue: number): AsymmetryTier;

/**
 * Generate the full structured clinical summary text.
 * Includes: limitation header, ramus analysis, body analysis,
 * absolute measurements (if Mode B), mandatory limitations footer.
 * @param results - full results object
 * @returns structured clinical text per protocol §8.1
 */
function generateClinicalSummary(results: FullResults): string;
```

### 9.4 Store-Level Orchestration (NOT a domain function)

The store calls domain functions in sequence. This orchestration lives in
the store module, not in the domain module, because it depends on store
state (landmark availability, calibration):

```typescript
// src/store/studyStore.ts (excerpt)

function computeMeasurements(
  landmarks: LandmarkSet,
  calibration: Calibration | null,
  imageWidth: number,
  imageHeight: number
): StudyMeasurements {
  // Ramus height: requires CoR, GoR, CoL, GoL
  const ramusHeight = computeSingleMeasurement(
    landmarks.CoR, landmarks.GoR,
    landmarks.CoL, landmarks.GoL,
    calibration, imageWidth, imageHeight
  );

  // Body length: requires GoR, Me, GoL, Me
  const bodyLength = computeSingleMeasurement(
    landmarks.GoR, landmarks.Me,
    landmarks.GoL, landmarks.Me,
    calibration, imageWidth, imageHeight
  );

  return { ramusHeight, bodyLength };
}

function computeSingleMeasurement(
  rightA: Point | undefined, rightB: Point | undefined,
  leftA: Point | undefined, leftB: Point | undefined,
  calibration: Calibration | null,
  imageWidth: number, imageHeight: number
): MeasurementResult | null {
  if (!rightA || !rightB || !leftA || !leftB) return null;

  const rightNorm = calculateDistance(rightA, rightB);
  const leftNorm = calculateDistance(leftA, leftB);

  const habets = calculateAsymmetryIndex(rightNorm, leftNorm);
  const relDiff = calculateRelativeDifference(rightNorm, leftNorm);
  const dominant = determineDominantSide(rightNorm, leftNorm);
  const tier = classifyAsymmetry(Math.abs(habets));
  const diff = calculateSideDifference(rightNorm, leftNorm);

  // Mode B: convert to mm
  let rightMm: number | null = null;
  let leftMm: number | null = null;
  if (calibration) {
    // Convert normalized → image pixels → mm
    rightMm = round(rightNorm * imageWidth * calibration.mmPerPixel, 1);
    leftMm = round(leftNorm * imageWidth * calibration.mmPerPixel, 1);
  }

  return {
    right: rightNorm,
    left: leftNorm,
    difference: diff.difference,
    absoluteDifference: diff.absoluteDifference,
    relativeDifferencePercent: relDiff,
    asymmetryIndexPercent: habets,
    dominantSide: dominant,
    classification: tier,
    rightMm,
    leftMm,
  };
}
```

> **Important:** `computeMeasurements` and `computeSingleMeasurement` are
> **store-level helpers**, NOT domain functions. They sequence domain calls.
> All clinical logic lives inside the 7 pure domain functions. These helpers
> contain only wiring (reading landmark availability, passing values).

---

## 10. Calibration Implementation

### 10.1 Two Modes

| Mode | Trigger | Effect |
|------|---------|--------|
| **Mode A** (default) | App start, or "Clear Calibration" | Relative % only; no mm display |
| **Mode B** | Clinician marks 2 points + enters known mm | All Mode A values + absolute mm |

### 10.2 Calibration Flow

```
1. Clinician toggles "Calibration Mode" in CalibrationPanel
2. Store sets calibrationMode = "B", activeLandmark = null
3. Clinician clicks two points on the image
   → setCalibrationPoint(0, point)
   → setCalibrationPoint(1, point)
4. Clinician enters known real-world distance (mm)
   → setCalibrationDistance(mm)
5. Store computes:
   pixelDistance = calculateDistance(calibrationPoints[0], calibrationPoints[1]) × imageNaturalWidth
   mmPerPixel = realDistanceMm / pixelDistance
   calibration = { pixelDistance, realDistanceMm, mmPerPixel }
6. Store calls recalculate() → all measurements now include mm values
7. Results panel shows Mode B display (mm + %)
```

### 10.3 Calibration Formula

```
mmPerPixel = realDistanceMm / (normalizedDistance × imageNaturalWidth)
```

Where `normalizedDistance` is the Euclidean distance between the two
calibration points in normalized coordinates (0.0–1.0), and
`imageNaturalWidth` converts it to image pixels.

### 10.4 Pixel Distance Calculation

The calibration points are stored in normalized coordinates. To compute the
pixel distance:

```typescript
const normDist = calculateDistance(calibrationPoints[0], calibrationPoints[1]);
const pixelDist = normDist * imageNaturalWidth;  // assume x-axis dominant
// More precise: convert each point to pixels, then Euclidean
const p0px = { x: calibrationPoints[0].x * imageWidth, y: calibrationPoints[0].y * imageHeight };
const p1px = { x: calibrationPoints[1].x * imageWidth, y: calibrationPoints[1].y * imageHeight };
const pixelDist = Math.sqrt((p0px.x - p1px.x)**2 + (p0px.y - p1px.y)**2);
```

The precise version (convert to pixels first, then Euclidean) is used to
handle non-square images correctly.

### 10.5 Mode Switching

- **A → B:** Clinician activates calibration, marks points, enters distance.
  Store sets `calibration` and `calibrationMode = "B"`.
- **B → A:** Clinician clicks "Clear Calibration." Store sets
  `calibration = null`, `calibrationMode = "A"`, `calibrationPoints = null`.
  Triggers `recalculate()` — mm values become null.

### 10.6 Calibration Validation

| Edge Case | Handling |
|----------|----------|
| `pixelDistance = 0` (same point twice) | Display error: "Calibration points must be different" |
| `realDistanceMm ≤ 0` | Display error: "Distance must be positive" |
| Only 1 calibration point placed | Do not compute; wait for second point |
| Calibration points outside image bounds | Clamp to [0, 1] in normalized space |

---

## 11. Image Viewer Interaction Model

### 11.1 Controls

| Control | Input | Effect |
|---------|-------|--------|
| Zoom | Mouse wheel, +/- buttons, pinch (touch) | `viewer.zoom *= 1.1` per tick; range [0.5, 5.0] |
| Pan | Mouse drag on image (when not placing landmarks) | `viewer.panX/Y += delta` |
| Fit to screen | Button | `zoom = 1, panX = 0, panY = 0` |
| Brightness | Slider | `viewer.brightness` range [0.3, 2.0], default 1.0 |
| Contrast | Slider | `viewer.contrast` range [0.3, 2.0], default 1.0 |
| Reset all | Button | Reset zoom, pan, brightness, contrast to defaults |

### 11.2 Interaction Mode Switching

The viewer has two interaction modes, toggled by context:

| Mode | Trigger | Behavior |
|------|---------|----------|
| **Place landmark** | `activeLandmark` is set | Click on image → place landmark → clear active |
| **Pan/zoom** | `activeLandmark` is null | Drag to pan, wheel to zoom |

When a landmark is selected in `LandmarkPalette`, clicking the image places
that landmark. When no landmark is active, the viewer enters pan/zoom mode.

### 11.3 Landmark Drag

Placed landmarks can be dragged to reposition:

```
mousedown on LandmarkMarker → enter drag mode
mousemove → update landmark position (normalized) → recalculate
mouseup → exit drag mode → debounced save
```

During drag, `moveLandmark` is called on every `mousemove` — recalculation
happens in real time, updating the results panel live. This satisfies the
"landmark edits trigger immediate recalculation" requirement.

### 11.4 Zoom Implementation

Zoom is applied via CSS `transform: scale()` on the image layer. The SVG
overlay uses `viewBox="0 0 1 1"` which automatically scales with the
container — no separate zoom logic needed for the overlay.

To keep landmarks aligned with the image during zoom/pan:

```
Image:   transform: translate(panX, panY) scale(zoom)
Overlay: viewBox is 0-1, container clips overflow
         → overlay scales with container, NOT with zoom
```

> **Design decision:** The overlay does NOT zoom/pan separately — it is
> positioned over the same container as the image. When the image zooms, the
> container clips, and the overlay (which fills the container) shows
> landmarks in the same relative position. Both layers use the same
> coordinate space (normalized 0–1 mapped to the container rect). The image
> is `object-contain` within the container, so its visible area matches the
> overlay's coordinate space.
>
> **Alternative considered:** Apply the same CSS transform to the SVG
> overlay. This would zoom landmarks with the image but requires syncing
> transforms. The simpler approach (container clips, overlay fills
> container) keeps landmarks at their normalized positions and is
> sufficient for the MVP where zoom is used for visual inspection, not
> landmark placement precision. If sub-pixel landmark placement at high
> zoom is needed, the transform-sync approach can be adopted — the
> architecture supports it by applying the same transform to both layers.

### 11.5 Brightness/Contrast

CSS `filter` on the `<img>` element:

```css
filter: brightness(var(--brightness)) contrast(var(--contrast));
```

No canvas pixel manipulation needed. CSS filters are GPU-accelerated and
performant.

---

## 12. Data Flow: Landmark Edit → Recalculation

```
User drags landmark
    │
    ▼
OverlayLayer: mousemove handler
    │
    ▼
screenToNormalized(clientX, clientY, containerRect) → Point
    │
    ▼
studyStore.moveLandmark(name, point)
    │
    ├─→ updates state.landmarks
    ├─→ calls computeMeasurements(landmarks, calibration, width, height)
    │       ├─→ calculateDistance (×4: CoR-GoR, CoL-GoL, GoR-Me, GoL-Me)
    │       ├─→ calculateSideDifference (×2)
    │       ├─→ calculateAsymmetryIndex (×2)
    │       ├─→ calculateRelativeDifference (×2)
    │       ├─→ determineDominantSide (×2)
    │       ├─→ classifyAsymmetry (×2)
    │       └─→ mm conversion (if calibrated)
    ├─→ updates state.measurements
    ├─→ generateClinicalSummary(results) → state.interpretation
    └─→ sets isSaved = false
    │
    ▼
Zustand notifies subscribers
    │
    ├─→ OverlayLayer re-renders (new landmark position + lines)
    ├─→ MetricsTable re-renders (new values)
    ├─→ ClinicalSummary re-renders (new text)
    └─→ ThresholdBadge re-renders (new tier)
    │
    ▼
Debounced auto-save (500ms after last edit)
    │
    ▼
studyRepository.save(study) → localStorage
```

### 12.1 Performance

- 7 domain function calls × 2 measurements = ~14 function calls per
  recalculation. All are pure arithmetic — sub-millisecond.
- React re-renders are scoped: Zustand selectors ensure only components
  reading `measurements` re-render, not the entire tree.
- During drag, `mousemove` fires ~60fps. Recalculation + selective
  re-render is well within budget.

---

## 13. Testing Strategy

### 13.1 Domain Layer (TestBot's primary target)

| Function | Test Cases |
|----------|-----------|
| `calculateDistance` | Known distances, zero distance, diagonal max |
| `calculateSideDifference` | Positive, negative, zero |
| `calculateRelativeDifference` | Symmetric (0%), known ratios, 2× Habets relationship |
| `calculateAsymmetryIndex` | Right greater (positive), left greater (negative), zero |
| `determineDominantSide` | Right, left, equal (≤0.5%), edge boundaries |
| `classifyAsymmetry` | All 3 tiers, boundary values (2.99, 3.0, 6.0, 6.01) |
| `generateClinicalSummary` | Mode A, Mode B, equal values, incomplete landmarks |

### 13.2 Edge Cases (from protocol §11.4)

| Case | Expected |
|------|---------|
| R + L = 0 | 0% for all; dominantSide = "equal"; tier = "within_typical_range" |
| Missing landmarks | `MeasurementResult = null`; UI shows "incomplete" |
| Calibration pixelDistance = 0 | Error; no mmPerPixel computed |
| Negative values | Guard with absolute value |

### 13.3 UI Tests

- Landmark placement: click → landmark appears at click position (normalized)
- Landmark drag: drag → landmark moves → results update
- Calibration flow: mark 2 points → enter mm → mm values appear
- Mode switch: A → B → A: mm values appear then disappear
- Persistence: save → reload page → study restored

### 13.4 Test Utilities

```typescript
// src/test/fixtures.ts
export const MOCK_LANDMARKS: LandmarkSet = {
  CoR: { x: 0.25, y: 0.20 },
  GoR: { x: 0.30, y: 0.70 },
  CoL: { x: 0.75, y: 0.20 },
  GoL: { x: 0.70, y: 0.70 },
  Me:  { x: 0.50, y: 0.85 },
};

export const MOCK_CALIBRATION: Calibration = {
  pixelDistance: 500,
  realDistanceMm: 40,
  mmPerPixel: 0.08,
};
```

---

## 14. Future Extensibility

### 14.1 Backend Integration

The `StudyRepository` interface (§7.2) abstracts persistence. Swapping
`LocalStorageStudyRepository` for `ApiStudyRepository` requires:

1. Implement the same interface with `fetch` calls
2. Update the store's import
3. No component changes needed

### 14.2 AI Landmark Detection (Phase 2)

Add `src/ai/landmarkDetection.ts` that produces a `LandmarkSet` from an
image. The store gains a `detectLandmarks()` action that calls the AI module
and populates landmarks. Domain layer and UI remain unchanged.

### 14.3 Additional Measurements

New measurements (e.g., condylar height, total mandibular length) require:
1. New landmark types in `LandmarkName` (e.g., `"SnR"`, `"SnL"`)
2. New domain function calls in `computeMeasurements`
3. New UI display sections

The domain functions themselves do not change — they are generic
(distance, asymmetry, classification).

### 14.4 Multi-Image Studies

The `StoredStudy` schema can be extended with an `images: Image[]` array
instead of a single `imageDataUrl`. The store would track an
`activeImageIndex`. Domain layer is unaffected.

### 14.5 Routing

If multi-page navigation is needed (e.g., study list, settings), add
`react-router`. The Zustand store is module-scoped and survives route
changes. Components subscribe to the store, not to route params, so
navigation does not reset study data.

---

## Appendix A: Type Summary

All types defined in `src/domain/types.ts`:

```typescript
type Point = { x: number; y: number };
type LandmarkName = "CoR" | "GoR" | "CoL" | "GoL" | "Me";
type LandmarkSet = Partial<Record<LandmarkName, Point>>;
type DominantSide = "right" | "left" | "equal";
type AsymmetryTier = "within_typical_range" | "borderline" | "above_technical_error_margin";

interface Calibration {
  pixelDistance: number;
  realDistanceMm: number;
  mmPerPixel: number;
}

interface SideDifference {
  difference: number;
  absoluteDifference: number;
}

interface MeasurementResult {
  right: number;
  left: number;
  difference: number;
  absoluteDifference: number;
  relativeDifferencePercent: number;
  asymmetryIndexPercent: number;
  dominantSide: DominantSide;
  classification: AsymmetryTier;
  rightMm: number | null;
  leftMm: number | null;
}

interface StudyMeasurements {
  ramusHeight: MeasurementResult | null;
  bodyLength: MeasurementResult | null;
}

interface FullResults {
  ramusHeight: MeasurementResult | null;
  bodyLength: MeasurementResult | null;
  calibration: Calibration | null;
  calibrationMode: "A" | "B";
}
```

## Appendix B: File Creation Checklist

Files to create during implementation (NOT in this architecture phase):

- [x] `package.json` ✓ (setup phase)
- [x] `vite.config.ts` ✓ (setup phase)
- [x] `vitest.config.ts` ✓ (setup phase)
- [x] `tsconfig.json` ✓ (setup phase)
- [x] `tsconfig.node.json` ✓ (setup phase)
- [x] `src/styles/index.css` ✓ (setup phase)
- [x] `index.html` ✓ (setup phase)
- [ ] `src/main.tsx` (implementation phase)
- [ ] `src/App.tsx` (implementation phase)
- [ ] `src/domain/types.ts` (implementation phase)
- [ ] `src/domain/mandibularAsymmetry.ts` (implementation phase)
- [ ] `src/store/studyStore.ts` (implementation phase)
- [ ] `src/persistence/studyRepository.ts` (implementation phase)
- [ ] `src/components/**` (implementation phase)
- [ ] `src/pages/AnalysisPage.tsx` (implementation phase)
- [ ] `src/test/setup.ts` (implementation phase)
- [ ] `src/test/fixtures.ts` (implementation phase)

---

> **Architecture principle:** Keep the domain pure, the store thin, and the
> UI dumb. Every calculation flows through the 7 domain functions. Every
> state mutation flows through the Zustand store. Every pixel-to-anatomy
> mapping flows through normalized coordinates. This separation ensures
> clinical correctness, testability, and future extensibility.