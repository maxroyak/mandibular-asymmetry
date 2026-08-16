# Mandibular Asymmetry Analysis — Project Context

## Product

A web-based clinical module for 2D analysis of mandibular skeletal asymmetry
from panoramic radiographs (OPG / panoramic X-ray).

The clinician uploads a panoramic radiograph, places anatomical landmarks
manually, and obtains quantitative comparison of right and left mandibular
ramus and body measurements, including percentage differences and a
structured clinical interpretation.

This is a **measurement and clinical decision-support tool**, NOT an
autonomous diagnostic system.

## Tech Stack (Planned)

- React 19 + TypeScript
- Vite 8
- Canvas or SVG overlay for radiograph measurement rendering
- Zustand or lightweight state manager
- Vitest for unit tests
- Playwright for E2E
- localStorage for MVP study persistence (architecture must allow backend later)

## Architecture Rules

- Domain layer (`src/domain/`) — pure calculation functions only, NO React imports
- UI layer (`src/components/`, `src/pages/`) — React components calling domain functions
- Calculation logic must NEVER live in UI components
- UI components must NEVER contain calculation formulas
- Landmarks stored in normalized coordinates (0.0–1.0), NOT screen pixels
- Radiograph image and measurement overlay must be separate rendering layers

## Domain Module

The clinical calculation engine lives in `src/domain/mandibularAsymmetry.ts`.

Pure functions:
- calculateDistance(pointA, pointB)
- calculateSideDifference(right, left)
- calculateRelativeDifference(right, left)
- calculateAsymmetryIndex(right, left)
- determineDominantSide(right, left)
- classifyAsymmetry(value, thresholds)
- generateClinicalSummary(results)

The UI must not calculate clinical metrics directly.

## Key Data Types

```ts
type Point = { x: number; y: number };  // normalized 0.0–1.0

type LandmarkName = "CoR" | "GoR" | "CoL" | "GoL" | "Me";

type LandmarkSet = Partial<Record<LandmarkName, Point>>;

type Calibration = {
  pixelDistance: number;
  realDistanceMm: number;
  mmPerPixel: number;
};

type SideMeasurement = {
  right: number;
  left: number;
  difference: number;
  absoluteDifference: number;
  relativeDifferencePercent: number;
  asymmetryIndexPercent: number;
  dominantSide: "right" | "left" | "equal";
};
```

## Study Structure

```ts
type Study = {
  studyId: string;
  patientId: string;
  imageData: string;  // base64 or object URL
  landmarks: LandmarkSet;
  calibration: Calibration | null;
  measurements: StudyMeasurements;
  interpretation: string;
  createdAt: string;
  updatedAt: string;
};
```

## Calibration Modes

- Mode A (No calibration): measure in pixels, calculate relative differences, do NOT report pixel values as mm
- Mode B (Calibrated): clinician marks two points with known real distance, system computes mm_per_pixel

## Medical Safety Rules

The application must NOT:
- Write diagnostic conclusions from a single OPG
- Use wording like "The patient has right ramus hypoplasia"

The application MUST:
- Use comparative language: "right ramus height is X% smaller than left"
- Always state 2D projection limitations
- Recommend clinical correlation and 3D imaging when indicated

## MVP Scope (First Release)

1. OPG upload
2. Image viewer (zoom, pan, fit-to-screen, brightness, contrast, reset)
3. Manual landmark placement
4. Ramus height measurement
5. Mandibular body length measurement
6. Right/left difference + percentage asymmetry
7. Calibration (optional)
8. Measurement overlay on radiograph
9. Short structured clinical interpretation
10. Study persistence (localStorage)
11. Unit tests
12. QA gate

## NOT in MVP

- AI landmark detection (Phase 2)
- Autonomous diagnosis
- CBCT / 3D analysis
- Full cephalometric analysis
- Tooth segmentation
- Cloud infrastructure
- PACS / DICOM integration

## Execution Order

1. ResearchBot — scientific review of methods
2. OrthoBot — clinical protocol from research results
3. ArchitectBot — software architecture design
4. UXBot — clinical workflow / interface design
5. DevBot — MVP implementation
6. TestBot — test suite
7. QABot — independent final verification

## Clinical Formula Change Protocol

Any change to a clinical formula must follow:

ResearchBot → OrthoBot → PMBot → TestBot → QABot

## Git Rules

- Repository must remain PRIVATE
- Conventional Commits: feat:, fix:, refactor:, test:, docs:, chore:
- Never commit: secrets, .env, node_modules, dist, worklog.md, TASKS.md, DECISIONS.md, tasks/

## Persistence

- localStorage acceptable for MVP
- Architecture must allow backend to be added later
- Navigation must not reset study data
- Landmark edits must trigger immediate recalculation (no manual "Recalculate" button)