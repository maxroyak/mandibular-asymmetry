// ── Coordinate Transform: Screen → Normalized Image Space ─────────────
// Pure functions that convert pointer (clientX, clientY) coordinates into
// normalized image coordinates [0,1] accounting for:
//   - viewer container offset on the page
//   - pan translate (panX, panY)
//   - zoom scale about container center
//   - object-contain letterboxing (image may not fill the container)
//
// This module mirrors the math in ImageViewer.tsx::screenToNormalized so the
// algorithm can be unit-tested without a DOM. The ImageViewer component
// should keep its inline copy in sync with these functions.
//
// Pure: no React imports, no side effects, no DOM access.

import type { Point } from "./types";

/** Container rectangle in CSS pixels (viewport coordinates). */
export interface ContainerRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Viewer transform state. */
export interface ViewerTransform {
  zoom: number;
  panX: number;
  panY: number;
}

/** Natural (intrinsic) image dimensions in pixels. */
export interface ImageDimensions {
  naturalWidth: number;
  naturalHeight: number;
}

/**
 * Compute the displayed image rectangle inside the container when the image
 * is rendered with `object-contain` (fit entirely, centered, letterboxed).
 *
 * Returns { left, top, width, height } in container-local CSS pixels.
 */
export function computeFittedImageRect(
  rect: ContainerRect,
  image: ImageDimensions
): { left: number; top: number; width: number; height: number } {
  const imgW = image.naturalWidth || rect.width;
  const imgH = image.naturalHeight || rect.height;
  const containerAR = rect.width / rect.height;
  const imageAR = imgW / imgH;

  let displayedW: number;
  let displayedH: number;
  if (imageAR > containerAR) {
    // Image wider than container → fit to width, letterbox top/bottom
    displayedW = rect.width;
    displayedH = rect.width / imageAR;
  } else {
    // Image taller than (or equal to) container → fit to height, letterbox left/right
    displayedH = rect.height;
    displayedW = rect.height * imageAR;
  }

  const left = (rect.width - displayedW) / 2;
  const top = (rect.height - displayedH) / 2;

  return { left, top, width: displayedW, height: displayedH };
}

/**
 * Convert a pointer position (clientX, clientY in viewport coordinates) to
 * normalized image coordinates [0,1], clamped.
 *
 * Inverse transform chain:
 *   1. Subtract container rect → local (container-space) coordinates
 *   2. Subtract pan → unpanned
 *   3. Invert zoom about container center → pre-transform container space
 *   4. Map through fitted image rect (object-contain letterboxing) → image pixel space
 *   5. Normalize by displayed image dimensions → [0,1]
 *   6. Clamp to [0,1]
 */
export function screenToNormalized(
  clientX: number,
  clientY: number,
  rect: ContainerRect,
  viewer: ViewerTransform,
  image: ImageDimensions
): Point {
  if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };

  // 1. Viewer-local coordinates
  const localX = clientX - rect.left;
  const localY = clientY - rect.top;

  // 2. Undo pan
  const pannedX = localX - viewer.panX;
  const pannedY = localY - viewer.panY;

  // 3. Undo zoom about center
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const unzoomedX = cx + (pannedX - cx) / viewer.zoom;
  const unzoomedY = cy + (pannedY - cy) / viewer.zoom;

  // 4. Fitted image rect (object-contain letterboxing)
  const fitted = computeFittedImageRect(rect, image);

  // 5. Normalize to [0,1]
  const normX = (unzoomedX - fitted.left) / fitted.width;
  const normY = (unzoomedY - fitted.top) / fitted.height;

  // 6. Clamp
  return {
    x: Math.max(0, Math.min(1, normX)),
    y: Math.max(0, Math.min(1, normY)),
  };
}

/**
 * Forward transform: normalized image coordinates → screen (clientX, clientY).
 * Useful for verifying round-trip consistency and for computing where a
 * landmark should appear on screen at a given zoom/pan.
 *
 * This is the mathematical inverse of screenToNormalized (without clamping).
 */
export function normalizedToScreen(
  normX: number,
  normY: number,
  rect: ContainerRect,
  viewer: ViewerTransform,
  image: ImageDimensions
): { clientX: number; clientY: number } {
  if (rect.width === 0 || rect.height === 0) return { clientX: 0, clientY: 0 };

  const fitted = computeFittedImageRect(rect, image);

  // 5. Image pixel space (pre-transform container space)
  const unzoomedX = fitted.left + normX * fitted.width;
  const unzoomedY = fitted.top + normY * fitted.height;

  // 4. Apply zoom about center
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const zoomedX = cx + (unzoomedX - cx) * viewer.zoom;
  const zoomedY = cy + (unzoomedY - cy) * viewer.zoom;

  // 3. Apply pan
  const localX = zoomedX + viewer.panX;
  const localY = zoomedY + viewer.panY;

  // 1→ screen coordinates
  return {
    clientX: localX + rect.left,
    clientY: localY + rect.top,
  };
}