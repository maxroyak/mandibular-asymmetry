// ── Tests: Screen → Normalized Coordinate Transform ───────────────────
// Verifies the landmark dragging coordinate transformation at multiple zoom
// levels, with pan, with viewer offset, and with zero cumulative drift.
//
// Tests A–E from the spec, plus additional zoom levels and clamping tests.

import { describe, it, expect } from "vitest";
import {
  screenToNormalized,
  normalizedToScreen,
  computeFittedImageRect,
  type ContainerRect,
  type ViewerTransform,
  type ImageDimensions,
} from "./coordinateTransform";

// ── Shared fixtures ────────────────────────────────────────────────────

/** A 1000×600 container at page origin (0,0) with a 800×600 image. */
const BASE_RECT: ContainerRect = { left: 0, top: 0, width: 1000, height: 600 };
const BASE_IMAGE: ImageDimensions = { naturalWidth: 800, naturalHeight: 600 };
const NO_PAN: ViewerTransform = { zoom: 1, panX: 0, panY: 0 };

// With image 800×600 (AR 1.333) and container 1000×600 (AR 1.667):
// imageAR < containerAR → fit to height → displayedH=600, displayedW=800
// offset = ((1000-800)/2, 0) = (100, 0)
// So the fitted rect is { left:100, top:0, width:800, height:600 }

describe("coordinateTransform — computeFittedImageRect", () => {
  it("fits to height when image is taller (imageAR < containerAR)", () => {
    const fitted = computeFittedImageRect(BASE_RECT, BASE_IMAGE);
    expect(fitted.width).toBe(800);
    expect(fitted.height).toBe(600);
    expect(fitted.left).toBe(100); // (1000-800)/2
    expect(fitted.top).toBe(0);
  });

  it("fits to width when image is wider (imageAR > containerAR)", () => {
    // container 600×600, image 1200×600 → AR 2.0 > 1.0 → fit to width
    const rect: ContainerRect = { left: 0, top: 0, width: 600, height: 600 };
    const img: ImageDimensions = { naturalWidth: 1200, naturalHeight: 600 };
    const fitted = computeFittedImageRect(rect, img);
    expect(fitted.width).toBe(600);
    expect(fitted.height).toBe(300); // 600 / 2.0
    expect(fitted.left).toBe(0);
    expect(fitted.top).toBe(150); // (600-300)/2
  });

  it("fills container when aspect ratios match", () => {
    const rect: ContainerRect = { left: 0, top: 0, width: 800, height: 600 };
    const img: ImageDimensions = { naturalWidth: 800, naturalHeight: 600 };
    const fitted = computeFittedImageRect(rect, img);
    expect(fitted.width).toBe(800);
    expect(fitted.height).toBe(600);
    expect(fitted.left).toBe(0);
    expect(fitted.top).toBe(0);
  });
});

// ── Test A: 100% Zoom ──────────────────────────────────────────────────
// Pointer at (500,300) → (550,340): verify landmark ends at correct
// image coordinate.

describe("Test A — 100% zoom, no pan", () => {
  it("maps pointer at (500,300) to correct normalized coordinate", () => {
    // fitted rect: left=100, top=0, w=800, h=600
    // localX=500, localY=300 (rect at origin)
    // no pan, zoom=1 → unzoomed = (500, 300)
    // normX = (500-100)/800 = 0.5
    // normY = (300-0)/600   = 0.5
    const result = screenToNormalized(500, 300, BASE_RECT, NO_PAN, BASE_IMAGE);
    expect(result.x).toBeCloseTo(0.5, 10);
    expect(result.y).toBeCloseTo(0.5, 10);
  });

  it("maps pointer at (550,340) to correct normalized coordinate", () => {
    // normX = (550-100)/800 = 0.5625
    // normY = (340-0)/600   = 0.5666...
    const result = screenToNormalized(550, 340, BASE_RECT, NO_PAN, BASE_IMAGE);
    expect(result.x).toBeCloseTo(0.5625, 10);
    expect(result.y).toBeCloseTo(0.5666666667, 10);
  });

  it("drag from (500,300) to (550,340) moves landmark by (0.0625, 0.0667)", () => {
    const start = screenToNormalized(500, 300, BASE_RECT, NO_PAN, BASE_IMAGE);
    const end = screenToNormalized(550, 340, BASE_RECT, NO_PAN, BASE_IMAGE);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    // 50px / 800px = 0.0625, 40px / 600px = 0.0667
    expect(dx).toBeCloseTo(0.0625, 10);
    expect(dy).toBeCloseTo(0.0666666667, 10);
  });
});

// ── Test B: 200% Zoom ──────────────────────────────────────────────────
// 40px pointer movement, verify image-space movement accounts for zoom=2.
// At zoom=2, a 40px screen movement = 20px in pre-transform space.
// For x: 20px / 800px displayed = 0.025 normalized
// For y: 20px / 600px displayed = 0.0333... normalized

describe("Test B — 200% zoom, no pan", () => {
  const zoom2: ViewerTransform = { zoom: 2, panX: 0, panY: 0 };

  it("40px screen movement at zoom=2 → 0.025 normalized x movement", () => {
    // Start at center of fitted image: screen x = 100 + 400 = 500, y = 300
    const start = screenToNormalized(500, 300, BASE_RECT, zoom2, BASE_IMAGE);
    expect(start.x).toBeCloseTo(0.5, 10);
    expect(start.y).toBeCloseTo(0.5, 10);

    // Move 40px right in screen space
    const end = screenToNormalized(540, 300, BASE_RECT, zoom2, BASE_IMAGE);
    // At zoom=2: unzoomed movement = 40/2 = 20px
    // normX change = 20/800 = 0.025
    expect(end.x - start.x).toBeCloseTo(0.025, 10);
  });

  it("40px screen movement at zoom=2 → 0.0333 normalized y movement", () => {
    const start = screenToNormalized(500, 300, BASE_RECT, zoom2, BASE_IMAGE);
    const end = screenToNormalized(500, 340, BASE_RECT, zoom2, BASE_IMAGE);
    // At zoom=2: unzoomed y movement = 40/2 = 20px
    // normY change = 20/600 = 0.0333...
    expect(end.y - start.y).toBeCloseTo(0.0333333333, 10);
  });

  it("screen movement at zoom=2 is half the normalized movement at zoom=1", () => {
    const start1 = screenToNormalized(500, 300, BASE_RECT, NO_PAN, BASE_IMAGE);
    const end1 = screenToNormalized(540, 340, BASE_RECT, NO_PAN, BASE_IMAGE);
    const start2 = screenToNormalized(500, 300, BASE_RECT, zoom2, BASE_IMAGE);
    const end2 = screenToNormalized(540, 340, BASE_RECT, zoom2, BASE_IMAGE);

    const dx1 = end1.x - start1.x;
    const dx2 = end2.x - start2.x;
    const dy1 = end1.y - start1.y;
    const dy2 = end2.y - start2.y;

    expect(dx2).toBeCloseTo(dx1 / 2, 10);
    expect(dy2).toBeCloseTo(dy1 / 2, 10);
  });
});

// ── Test C: Zoom + Pan ─────────────────────────────────────────────────
// zoom=2, panX=150, panY=-40, verify landmark stays under pointer.
// Uses round-trip: normalizedToScreen → screenToNormalized should be identity.

describe("Test C — Zoom + Pan (landmark stays under pointer)", () => {
  const transform: ViewerTransform = { zoom: 2, panX: 150, panY: -40 };

  it("round-trip: normalizedToScreen → screenToNormalized is identity", () => {
    const testPoints = [
      { x: 0.0, y: 0.0 },
      { x: 0.5, y: 0.5 },
      { x: 1.0, y: 1.0 },
      { x: 0.25, y: 0.75 },
      { x: 0.123, y: 0.456 },
    ];

    for (const p of testPoints) {
      const screen = normalizedToScreen(p.x, p.y, BASE_RECT, transform, BASE_IMAGE);
      const back = screenToNormalized(screen.clientX, screen.clientY, BASE_RECT, transform, BASE_IMAGE);
      expect(back.x).toBeCloseTo(p.x, 10);
      expect(back.y).toBeCloseTo(p.y, 10);
    }
  });

  it("at zoom=2, pan=(150,-40): pointer at image center maps to (0.5, 0.5)", () => {
    // Compute where the center of the image (0.5, 0.5) appears on screen
    const screen = normalizedToScreen(0.5, 0.5, BASE_RECT, transform, BASE_IMAGE);
    // Now convert back — should get (0.5, 0.5)
    const result = screenToNormalized(screen.clientX, screen.clientY, BASE_RECT, transform, BASE_IMAGE);
    expect(result.x).toBeCloseTo(0.5, 10);
    expect(result.y).toBeCloseTo(0.5, 10);
  });

  it("landmark at (0.3, 0.7) stays under pointer after pan+zoom", () => {
    const targetNorm = { x: 0.3, y: 0.7 };
    const screen = normalizedToScreen(targetNorm.x, targetNorm.y, BASE_RECT, transform, BASE_IMAGE);
    const result = screenToNormalized(screen.clientX, screen.clientY, BASE_RECT, transform, BASE_IMAGE);
    expect(result.x).toBeCloseTo(targetNorm.x, 10);
    expect(result.y).toBeCloseTo(targetNorm.y, 10);
  });
});

// ── Test D: Repeated Movement — Zero Cumulative Drift ──────────────────
// 100 consecutive pointermove events, verify that the final position equals
// the direct calculation from the final pointer position (no drift).

describe("Test D — Repeated movement, zero cumulative drift", () => {
  it("100 pointermove events: final position = direct calculation", () => {
    // Simulate dragging from (500, 300) to (700, 400) in 100 steps
    // The component computes position directly from pointer on each move
    // (no delta accumulation), so the result after 100 moves should equal
    // a single direct call with the final position.
    const transform: ViewerTransform = { zoom: 1.5, panX: 30, panY: -20 };
    const startX = 500;
    const startY = 300;
    const endX = 700;
    const endY = 400;
    const steps = 100;

    // Simulate 100 pointermove events — each computes from current pointer
    let lastNorm = screenToNormalized(startX, startY, BASE_RECT, transform, BASE_IMAGE);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const px = startX + (endX - startX) * t;
      const py = startY + (endY - startY) * t;
      lastNorm = screenToNormalized(px, py, BASE_RECT, transform, BASE_IMAGE);
    }

    // Direct calculation from final position
    const direct = screenToNormalized(endX, endY, BASE_RECT, transform, BASE_IMAGE);

    expect(lastNorm.x).toBeCloseTo(direct.x, 10);
    expect(lastNorm.y).toBeCloseTo(direct.y, 10);
  });

  it("100 pointermove events at zoom=3: zero drift", () => {
    const transform: ViewerTransform = { zoom: 3, panX: 100, panY: 50 };
    const startX = 600;
    const startY = 350;
    const endX = 650;
    const endY = 380;
    const steps = 100;

    let lastNorm = screenToNormalized(startX, startY, BASE_RECT, transform, BASE_IMAGE);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const px = startX + (endX - startX) * t;
      const py = startY + (endY - startY) * t;
      lastNorm = screenToNormalized(px, py, BASE_RECT, transform, BASE_IMAGE);
    }

    const direct = screenToNormalized(endX, endY, BASE_RECT, transform, BASE_IMAGE);
    expect(lastNorm.x).toBeCloseTo(direct.x, 10);
    expect(lastNorm.y).toBeCloseTo(direct.y, 10);
  });

  it("zigzag path of 200 moves: final = direct (no drift from back-and-forth)", () => {
    const transform: ViewerTransform = { zoom: 0.75, panX: -10, panY: 20 };
    let px = 500;
    let py = 300;
    let lastNorm = screenToNormalized(px, py, BASE_RECT, transform, BASE_IMAGE);

    // Zigzag: move right, down, left, down, repeat
    for (let i = 0; i < 50; i++) {
      px += 10; lastNorm = screenToNormalized(px, py, BASE_RECT, transform, BASE_IMAGE);
      py += 5;  lastNorm = screenToNormalized(px, py, BASE_RECT, transform, BASE_IMAGE);
      px -= 10; lastNorm = screenToNormalized(px, py, BASE_RECT, transform, BASE_IMAGE);
      py += 5;  lastNorm = screenToNormalized(px, py, BASE_RECT, transform, BASE_IMAGE);
    }

    // Final position after 200 moves
    const direct = screenToNormalized(px, py, BASE_RECT, transform, BASE_IMAGE);
    expect(lastNorm.x).toBeCloseTo(direct.x, 10);
    expect(lastNorm.y).toBeCloseTo(direct.y, 10);
  });
});

// ── Test E: Viewer Offset ──────────────────────────────────────────────
// Viewer at left=220, top=140, dragging still accurate.

describe("Test E — Viewer offset (left=220, top=140)", () => {
  const offsetRect: ContainerRect = { left: 220, top: 140, width: 1000, height: 600 };

  it("pointer at (720, 440) maps to same normalized as (500,300) at origin", () => {
    // 720 - 220 = 500, 440 - 140 = 300 → same local coords as BASE
    const withOffset = screenToNormalized(720, 440, offsetRect, NO_PAN, BASE_IMAGE);
    const atOrigin = screenToNormalized(500, 300, BASE_RECT, NO_PAN, BASE_IMAGE);
    expect(withOffset.x).toBeCloseTo(atOrigin.x, 10);
    expect(withOffset.y).toBeCloseTo(atOrigin.y, 10);
  });

  it("drag with viewer offset + zoom=2 + pan: round-trip identity", () => {
    const transform: ViewerTransform = { zoom: 2, panX: 50, panY: -30 };
    const testPoints = [
      { x: 0.1, y: 0.1 },
      { x: 0.5, y: 0.5 },
      { x: 0.9, y: 0.9 },
    ];

    for (const p of testPoints) {
      const screen = normalizedToScreen(p.x, p.y, offsetRect, transform, BASE_IMAGE);
      const back = screenToNormalized(screen.clientX, screen.clientY, offsetRect, transform, BASE_IMAGE);
      expect(back.x).toBeCloseTo(p.x, 10);
      expect(back.y).toBeCloseTo(p.y, 10);
    }
  });

  it("40px movement with viewer offset produces same normalized delta as at origin", () => {
    const transform: ViewerTransform = { zoom: 1, panX: 0, panY: 0 };
    const s1 = screenToNormalized(720, 440, offsetRect, transform, BASE_IMAGE);
    const s2 = screenToNormalized(760, 440, offsetRect, transform, BASE_IMAGE);
    const o1 = screenToNormalized(500, 300, BASE_RECT, transform, BASE_IMAGE);
    const o2 = screenToNormalized(540, 300, BASE_RECT, transform, BASE_IMAGE);
    expect(s2.x - s1.x).toBeCloseTo(o2.x - o1.x, 10);
    expect(s2.y - s1.y).toBeCloseTo(o2.y - o1.y, 10);
  });
});

// ── Additional Zoom Levels: 50%, 75%, 150%, 300% ──────────────────────

describe("Additional zoom levels", () => {
  // At zoom < 1, the image is scaled down, so screen movement → larger
  // normalized movement. At zoom > 1, screen movement → smaller normalized.

  it("50% zoom: 40px screen → 0.1 normalized x (doubled vs 100%)", () => {
    const transform: ViewerTransform = { zoom: 0.5, panX: 0, panY: 0 };
    // Center of fitted image on screen at zoom=0.5:
    // fitted center = (100+400, 300) = (500, 300)
    // At zoom=0.5 about container center (500,300):
    //   screen = center + (fitted_center - center) * 0.5 = (500, 300) → still (500,300)
    const start = screenToNormalized(500, 300, BASE_RECT, transform, BASE_IMAGE);
    expect(start.x).toBeCloseTo(0.5, 10);
    expect(start.y).toBeCloseTo(0.5, 10);

    // 40px right: unzoomed = 40/0.5 = 80px → 80/800 = 0.1
    const end = screenToNormalized(540, 300, BASE_RECT, transform, BASE_IMAGE);
    expect(end.x - start.x).toBeCloseTo(0.1, 10);
  });

  it("75% zoom: 40px screen → 0.0667 normalized x", () => {
    const transform: ViewerTransform = { zoom: 0.75, panX: 0, panY: 0 };
    const start = screenToNormalized(500, 300, BASE_RECT, transform, BASE_IMAGE);
    // 40px / 0.75 = 53.333px unzoomed → 53.333/800 = 0.06667
    const end = screenToNormalized(540, 300, BASE_RECT, transform, BASE_IMAGE);
    expect(end.x - start.x).toBeCloseTo(0.0666666667, 10);
  });

  it("150% zoom: 40px screen → 0.0333 normalized x", () => {
    const transform: ViewerTransform = { zoom: 1.5, panX: 0, panY: 0 };
    const start = screenToNormalized(500, 300, BASE_RECT, transform, BASE_IMAGE);
    // 40px / 1.5 = 26.667px unzoomed → 26.667/800 = 0.03333
    const end = screenToNormalized(540, 300, BASE_RECT, transform, BASE_IMAGE);
    expect(end.x - start.x).toBeCloseTo(0.0333333333, 10);
  });

  it("300% zoom: 40px screen → 0.01667 normalized x", () => {
    const transform: ViewerTransform = { zoom: 3, panX: 0, panY: 0 };
    const start = screenToNormalized(500, 300, BASE_RECT, transform, BASE_IMAGE);
    // 40px / 3 = 13.333px unzoomed → 13.333/800 = 0.016667
    const end = screenToNormalized(540, 300, BASE_RECT, transform, BASE_IMAGE);
    expect(end.x - start.x).toBeCloseTo(0.0166666667, 10);
  });

  it("zoom inversely scales normalized movement: zoom × deltaNorm ≈ constant", () => {
    // For a fixed 40px screen movement, zoom * (deltaNorm * displayedW) should
    // equal 40 (the unzoomed pixel movement is screen_px / zoom).
    const screenDelta = 40;
    const displayedW = 800; // for our fixture
    for (const zoom of [0.5, 0.75, 1.0, 1.5, 2.0, 3.0]) {
      const transform: ViewerTransform = { zoom, panX: 0, panY: 0 };
      const start = screenToNormalized(500, 300, BASE_RECT, transform, BASE_IMAGE);
      const end = screenToNormalized(500 + screenDelta, 300, BASE_RECT, transform, BASE_IMAGE);
      const deltaNorm = end.x - start.x;
      const unzoomedPx = deltaNorm * displayedW;
      // unzoomedPx * zoom should equal screenDelta
      expect(unzoomedPx * zoom).toBeCloseTo(screenDelta, 8);
    }
  });
});

// ── Clamping Tests ─────────────────────────────────────────────────────

describe("Clamping to [0, 1]", () => {
  it("pointer far left of image → clamped to x=0", () => {
    // At zoom=1, no pan: fitted left=100, so anything left of 100 → normX < 0
    const result = screenToNormalized(0, 300, BASE_RECT, NO_PAN, BASE_IMAGE);
    expect(result.x).toBe(0);
  });

  it("pointer far right of image → clamped to x=1", () => {
    // fitted right = 100 + 800 = 900, so anything right of 900 → normX > 1
    const result = screenToNormalized(1000, 300, BASE_RECT, NO_PAN, BASE_IMAGE);
    expect(result.x).toBe(1);
  });

  it("pointer above image → clamped to y=0", () => {
    // fitted top=0, so anything above 0 → normY < 0
    const result = screenToNormalized(500, -100, BASE_RECT, NO_PAN, BASE_IMAGE);
    expect(result.y).toBe(0);
  });

  it("pointer below image → clamped to y=1", () => {
    // fitted bottom = 0 + 600 = 600 = rect.height, so anything below → normY > 1
    const result = screenToNormalized(500, 700, BASE_RECT, NO_PAN, BASE_IMAGE);
    expect(result.y).toBe(1);
  });

  it("pointer in letterbox area (left of image) → clamped to x=0", () => {
    // Letterbox is between x=0 and x=100 (fitted left=100)
    const result = screenToNormalized(50, 300, BASE_RECT, NO_PAN, BASE_IMAGE);
    expect(result.x).toBe(0);
  });

  it("pointer in letterbox area (right of image) → clamped to x=1", () => {
    // Letterbox is between x=900 and x=1000 (fitted right=900)
    const result = screenToNormalized(950, 300, BASE_RECT, NO_PAN, BASE_IMAGE);
    expect(result.x).toBe(1);
  });

  it("clamping works at high zoom with pan", () => {
    // At zoom=3, pan large enough that image extends beyond container
    const transform: ViewerTransform = { zoom: 3, panX: 500, panY: 500 };
    // Pointer at far edge should still clamp
    const result = screenToNormalized(0, 0, BASE_RECT, transform, BASE_IMAGE);
    expect(result.x).toBeGreaterThanOrEqual(0);
    expect(result.x).toBeLessThanOrEqual(1);
    expect(result.y).toBeGreaterThanOrEqual(0);
    expect(result.y).toBeLessThanOrEqual(1);
  });

  it("clamping works with vertical letterbox (wider image)", () => {
    // container 600×600, image 1200×600 → letterbox top/bottom
    const rect: ContainerRect = { left: 0, top: 0, width: 600, height: 600 };
    const img: ImageDimensions = { naturalWidth: 1200, naturalHeight: 600 };
    // fitted: w=600, h=300, left=0, top=150
    // Pointer at (300, 0) → in letterbox above image → y < 0 → clamped to 0
    const result = screenToNormalized(300, 0, rect, NO_PAN, img);
    expect(result.y).toBe(0);
    // Pointer at (300, 600) → below image → clamped to 1
    const result2 = screenToNormalized(300, 600, rect, NO_PAN, img);
    expect(result2.y).toBe(1);
  });
});

// ── Round-Trip Consistency ──────────────────────────────────────────────

describe("Round-trip consistency (normalizedToScreen ↔ screenToNormalized)", () => {
  it("identity round-trip across multiple zoom/pan combinations", () => {
    const transforms: ViewerTransform[] = [
      { zoom: 1, panX: 0, panY: 0 },
      { zoom: 2, panX: 0, panY: 0 },
      { zoom: 0.5, panX: 0, panY: 0 },
      { zoom: 1.5, panX: 100, panY: -50 },
      { zoom: 3, panX: -200, panY: 300 },
      { zoom: 0.75, panX: 50, panY: 50 },
    ];

    const testPoints = [
      { x: 0.0, y: 0.0 },
      { x: 0.25, y: 0.25 },
      { x: 0.5, y: 0.5 },
      { x: 0.75, y: 0.75 },
      { x: 1.0, y: 1.0 },
      { x: 0.123, y: 0.789 },
    ];

    for (const t of transforms) {
      for (const p of testPoints) {
        const screen = normalizedToScreen(p.x, p.y, BASE_RECT, t, BASE_IMAGE);
        const back = screenToNormalized(screen.clientX, screen.clientY, BASE_RECT, t, BASE_IMAGE);
        expect(back.x).toBeCloseTo(p.x, 10);
        expect(back.y).toBeCloseTo(p.y, 10);
      }
    }
  });

  it("round-trip with viewer offset", () => {
    const offsetRect: ContainerRect = { left: 220, top: 140, width: 1000, height: 600 };
    const transform: ViewerTransform = { zoom: 2, panX: 100, panY: -80 };

    for (const p of [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.5 }, { x: 0.9, y: 0.9 }]) {
      const screen = normalizedToScreen(p.x, p.y, offsetRect, transform, BASE_IMAGE);
      const back = screenToNormalized(screen.clientX, screen.clientY, offsetRect, transform, BASE_IMAGE);
      expect(back.x).toBeCloseTo(p.x, 10);
      expect(back.y).toBeCloseTo(p.y, 10);
    }
  });
});

// ── Edge Cases ─────────────────────────────────────────────────────────

describe("Edge cases", () => {
  it("zero-size container returns (0,0)", () => {
    const rect: ContainerRect = { left: 0, top: 0, width: 0, height: 0 };
    const result = screenToNormalized(500, 300, rect, NO_PAN, BASE_IMAGE);
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it("falls back to container dimensions when image dimensions are 0", () => {
    // image naturalWidth/Height = 0 → uses rect dimensions → fills container
    const img: ImageDimensions = { naturalWidth: 0, naturalHeight: 0 };
    const result = screenToNormalized(500, 300, BASE_RECT, NO_PAN, img);
    // With fallback: image = container → fitted = full container
    // normX = 500/1000 = 0.5, normY = 300/600 = 0.5
    expect(result.x).toBeCloseTo(0.5, 10);
    expect(result.y).toBeCloseTo(0.5, 10);
  });

  it("square image in square container: no letterboxing", () => {
    const rect: ContainerRect = { left: 0, top: 0, width: 600, height: 600 };
    const img: ImageDimensions = { naturalWidth: 600, naturalHeight: 600 };
    const result = screenToNormalized(300, 300, rect, NO_PAN, img);
    expect(result.x).toBeCloseTo(0.5, 10);
    expect(result.y).toBeCloseTo(0.5, 10);
  });

  it("very small zoom (0.1) still produces valid normalized coords", () => {
    const transform: ViewerTransform = { zoom: 0.1, panX: 0, panY: 0 };
    const result = screenToNormalized(500, 300, BASE_RECT, transform, BASE_IMAGE);
    expect(result.x).toBeGreaterThanOrEqual(0);
    expect(result.x).toBeLessThanOrEqual(1);
    expect(result.y).toBeGreaterThanOrEqual(0);
    expect(result.y).toBeLessThanOrEqual(1);
  });
});