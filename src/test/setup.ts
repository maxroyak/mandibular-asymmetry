import "@testing-library/jest-dom";

// ── Test environment setup ──────────────────────────────────
// Polyfill ResizeObserver for JSDOM
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}