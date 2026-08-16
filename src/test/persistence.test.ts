// ── Persistence Tests ───────────────────────────────────────
// Tests for the studyRepository persistence layer:
// - Save study with image reference (not full base64 in localStorage)
// - Load study restores landmarks and calibration
// - Delete study removes from storage
// - Storage quota error handling
// - Migration from legacy localStorage format

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  studyRepository,
  type StoredStudy,
} from "../persistence/studyRepository";

// ── localStorage mock ──
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, value); },
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null,
  get length() { return storageMap.size; },
};
Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  configurable: true,
  writable: true,
});

// ── Mock imageStore module ──
// We mock the imageStore so we can test the IndexedDB integration
// without a real IndexedDB implementation in jsdom.
const mockImageStore = new Map<string, { imageDataUrl: string; width: number; height: number }>();

vi.mock("../persistence/imageStore", () => ({
  saveImage: vi.fn(async (studyId: string, imageDataUrl: string, width: number, height: number) => {
    mockImageStore.set(studyId, { imageDataUrl, width, height });
  }),
  loadImage: vi.fn(async (studyId: string) => {
    const record = mockImageStore.get(studyId);
    if (!record) return null;
    return { studyId, ...record };
  }),
  deleteImage: vi.fn(async (studyId: string) => {
    mockImageStore.delete(studyId);
  }),
  hasIndexedDB: vi.fn(() => true),
  testIndexedDB: vi.fn(async () => true),
}));

// ── Test helpers ──

function createTestStudy(overrides: Partial<StoredStudy> = {}): StoredStudy {
  return {
    studyId: "test-study-001",
    patientId: "patient-001",
    imageNaturalWidth: 1000,
    imageNaturalHeight: 800,
    landmarks: {
      CoR: { x: 0.1, y: 0.1 },
      GoR: { x: 0.1, y: 0.9 },
      CoL: { x: 0.9, y: 0.1 },
      GoL: { x: 0.9, y: 0.9 },
      Me: { x: 0.5, y: 0.5 },
    },
    calibration: {
      pixelDistance: 100,
      realDistanceMm: 20,
      mmPerPixel: 0.2,
    },
    calibrationPoints: { point1: { x: 0.1, y: 0.5 }, point2: { x: 0.2, y: 0.5 } },
    measurements: { ramusHeight: null, bodyLength: null },
    interpretation: "Test interpretation",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const TEST_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";

// ── Tests ──

describe("Persistence — studyRepository", () => {
  beforeEach(() => {
    storageMap.clear();
    mockImageStore.clear();
    studyRepository.clearLastError();
    // Reset migration flag
    storageMap.delete("ma.imagesMigrated");
  });

  describe("save study with image reference", () => {
    it("saves study metadata to localStorage without imageDataUrl", async () => {
      const study = createTestStudy();
      await studyRepository.save(study, TEST_IMAGE);

      const raw = storageMap.get("ma.studies");
      expect(raw).toBeDefined();
      const stored = JSON.parse(raw!);
      expect(stored).toHaveLength(1);
      expect(stored[0].studyId).toBe("test-study-001");
      // imageDataUrl should NOT be in localStorage
      expect(stored[0].imageDataUrl).toBeUndefined();
      // Metadata should be present
      expect(stored[0].landmarks.CoR).toEqual({ x: 0.1, y: 0.1 });
      expect(stored[0].calibration).not.toBeNull();
    });

    it("stores image in IndexedDB (mocked), not in localStorage", async () => {
      const study = createTestStudy();
      await studyRepository.save(study, TEST_IMAGE);

      // Image should be in the mock imageStore
      expect(mockImageStore.has("test-study-001")).toBe(true);
      const img = mockImageStore.get("test-study-001")!;
      expect(img.imageDataUrl).toBe(TEST_IMAGE);
      expect(img.width).toBe(1000);
      expect(img.height).toBe(800);
    });

    it("can save multiple studies", async () => {
      const study1 = createTestStudy({ studyId: "s1" });
      const study2 = createTestStudy({ studyId: "s2" });
      await studyRepository.save(study1, TEST_IMAGE);
      await studyRepository.save(study2, TEST_IMAGE);

      const all = studyRepository.getAll();
      expect(all).toHaveLength(2);
      expect(mockImageStore.size).toBe(2);
    });
  });

  describe("load study restores landmarks and calibration", () => {
    it("getById returns study metadata from localStorage", async () => {
      const study = createTestStudy();
      await studyRepository.save(study, TEST_IMAGE);

      const loaded = studyRepository.getById("test-study-001");
      expect(loaded).not.toBeNull();
      expect(loaded!.studyId).toBe("test-study-001");
      expect(loaded!.patientId).toBe("patient-001");
      expect(loaded!.landmarks.CoR).toEqual({ x: 0.1, y: 0.1 });
      expect(loaded!.landmarks.GoL).toEqual({ x: 0.9, y: 0.9 });
      expect(loaded!.calibration).not.toBeNull();
      expect(loaded!.calibration!.mmPerPixel).toBe(0.2);
      expect(loaded!.calibrationPoints).not.toBeNull();
      expect(loaded!.calibrationPoints!.point1).toEqual({ x: 0.1, y: 0.5 });
    });

    it("getImage returns image data from IndexedDB", async () => {
      const study = createTestStudy();
      await studyRepository.save(study, TEST_IMAGE);

      const image = await studyRepository.getImage("test-study-001");
      expect(image).toBe(TEST_IMAGE);
    });

    it("getImage returns null for non-existent study", async () => {
      const image = await studyRepository.getImage("nonexistent");
      expect(image).toBeNull();
    });

    it("getById returns null for non-existent study", () => {
      const loaded = studyRepository.getById("nonexistent");
      expect(loaded).toBeNull();
    });
  });

  describe("delete study removes from storage", () => {
    it("removes study metadata from localStorage", async () => {
      const study = createTestStudy();
      await studyRepository.save(study, TEST_IMAGE);
      expect(studyRepository.getAll()).toHaveLength(1);

      await studyRepository.remove("test-study-001");
      expect(studyRepository.getAll()).toHaveLength(0);
    });

    it("removes image from IndexedDB", async () => {
      const study = createTestStudy();
      await studyRepository.save(study, TEST_IMAGE);
      expect(mockImageStore.has("test-study-001")).toBe(true);

      await studyRepository.remove("test-study-001");
      expect(mockImageStore.has("test-study-001")).toBe(false);
    });

    it("delete is idempotent — no error on non-existent study", async () => {
      await expect(studyRepository.remove("nonexistent")).resolves.not.toThrow();
    });
  });

  describe("storage quota error handling", () => {
    it("sets lastError when localStorage.setItem throws QuotaExceededError", async () => {
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = (key: string, _val: string) => {
        if (key === "ma.studies") {
          const err = new Error("Quota exceeded");
          err.name = "QuotaExceededError";
          throw err;
        }
        storageMap.set(key, _val);
      };

      const study = createTestStudy();
      await studyRepository.save(study, TEST_IMAGE);

      // Should have set an error
      expect(studyRepository.getLastError()).not.toBeNull();
      expect(studyRepository.getLastError()).toContain("Storage limit exceeded");

      // Restore
      localStorageMock.setItem = originalSetItem;
      studyRepository.clearLastError();
    });

    it("clearLastError resets the error state", async () => {
      // Set an error by triggering quota exceeded
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = (_key: string, _value: string) => {
        const err = new Error("Quota exceeded");
        err.name = "QuotaExceededError";
        throw err;
      };

      const study = createTestStudy();
      await studyRepository.save(study, TEST_IMAGE);
      expect(studyRepository.getLastError()).not.toBeNull();

      studyRepository.clearLastError();
      expect(studyRepository.getLastError()).toBeNull();

      localStorageMock.setItem = originalSetItem;
    });
  });

  describe("migration from legacy localStorage format", () => {
    it("migrates legacy imageDataUrl from localStorage to IndexedDB", async () => {
      // Simulate legacy data: study with imageDataUrl embedded in localStorage
      const legacyStudy = createTestStudy();
      (legacyStudy as unknown as Record<string, unknown>).imageDataUrl = TEST_IMAGE;

      storageMap.set("ma.studies", JSON.stringify([legacyStudy]));

      // Run migration
      await studyRepository.migrateLegacyImages();

      // Image should now be in IndexedDB
      expect(mockImageStore.has("test-study-001")).toBe(true);
      expect(mockImageStore.get("test-study-001")!.imageDataUrl).toBe(TEST_IMAGE);

      // localStorage should no longer have imageDataUrl
      const stored = JSON.parse(storageMap.get("ma.studies")!);
      expect(stored[0].imageDataUrl).toBeUndefined();

      // Migration flag should be set
      expect(storageMap.get("ma.imagesMigrated")).toBe("true");
    });

    it("migration is idempotent — second call is a no-op", async () => {
      // Set up legacy data
      const legacyStudy = createTestStudy();
      (legacyStudy as unknown as Record<string, unknown>).imageDataUrl = TEST_IMAGE;
      storageMap.set("ma.studies", JSON.stringify([legacyStudy]));

      // First migration
      await studyRepository.migrateLegacyImages();
      expect(mockImageStore.has("test-study-001")).toBe(true);

      // Clear mock to verify no new writes
      mockImageStore.clear();

      // Second migration — should be no-op since flag is set
      await studyRepository.migrateLegacyImages();
      expect(mockImageStore.size).toBe(0);
    });

    it("migration handles empty localStorage gracefully", async () => {
      await expect(studyRepository.migrateLegacyImages()).resolves.not.toThrow();
      expect(storageMap.get("ma.imagesMigrated")).toBe("true");
    });

    it("migration handles multiple legacy studies", async () => {
      const legacy1 = createTestStudy({ studyId: "legacy-1" });
      const legacy2 = createTestStudy({ studyId: "legacy-2" });
      (legacy1 as unknown as Record<string, unknown>).imageDataUrl = "data:image/png;base64,aaa";
      (legacy2 as unknown as Record<string, unknown>).imageDataUrl = "data:image/png;base64,bbb";

      storageMap.set("ma.studies", JSON.stringify([legacy1, legacy2]));

      await studyRepository.migrateLegacyImages();

      expect(mockImageStore.has("legacy-1")).toBe(true);
      expect(mockImageStore.has("legacy-2")).toBe(true);
      expect(mockImageStore.get("legacy-1")!.imageDataUrl).toBe("data:image/png;base64,aaa");
      expect(mockImageStore.get("legacy-2")!.imageDataUrl).toBe("data:image/png;base64,bbb");

      // Both should be stripped from localStorage
      const stored = JSON.parse(storageMap.get("ma.studies")!);
      expect(stored[0].imageDataUrl).toBeUndefined();
      expect(stored[1].imageDataUrl).toBeUndefined();
    });
  });

  describe("current study ID", () => {
    it("setCurrentStudyId stores and getCurrentStudyId retrieves", () => {
      studyRepository.setCurrentStudyId("study-123");
      expect(studyRepository.getCurrentStudyId()).toBe("study-123");
    });

    it("setCurrentStudyId(null) removes the stored ID", () => {
      studyRepository.setCurrentStudyId("study-123");
      studyRepository.setCurrentStudyId(null);
      expect(studyRepository.getCurrentStudyId()).toBeNull();
    });
  });

  describe("getAll", () => {
    it("returns empty array when no studies exist", () => {
      expect(studyRepository.getAll()).toEqual([]);
    });

    it("returns all stored studies", async () => {
      await studyRepository.save(createTestStudy({ studyId: "a" }), TEST_IMAGE);
      await studyRepository.save(createTestStudy({ studyId: "b" }), TEST_IMAGE);
      const all = studyRepository.getAll();
      expect(all).toHaveLength(2);
      expect(all.map((s) => s.studyId).sort()).toEqual(["a", "b"]);
    });

    it("returns empty array on corrupted JSON", () => {
      storageMap.set("ma.studies", "not valid json{{{");
      expect(studyRepository.getAll()).toEqual([]);
    });

    it("returns empty array on non-array JSON", () => {
      storageMap.set("ma.studies", '{"not": "an array"}');
      expect(studyRepository.getAll()).toEqual([]);
    });
  });
});