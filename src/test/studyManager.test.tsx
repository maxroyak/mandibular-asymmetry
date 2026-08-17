// ── StudyManager Component & Bulk Deletion Tests ──────────

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useStudyStore } from "../store/studyStore";
import { StudyManager } from "../components/StudyManager";

// Mock localStorage
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => storageMap.set(key, value),
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

// Mock imageStore
vi.mock("../persistence/imageStore", () => ({
  saveImage: vi.fn(async () => {}),
  loadImage: vi.fn(async () => null),
  deleteImage: vi.fn(async () => {}),
  hasIndexedDB: vi.fn(() => true),
  testIndexedDB: vi.fn(async () => true),
}));

describe("StudyManager — Clear All Bulk Deletion Workflow", () => {
  const TEST_IMG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";

  beforeEach(() => {
    storageMap.clear();
    useStudyStore.getState().newStudy();
    useStudyStore.setState({ language: "en" });
  });

  it("does not display Clear All button when there are no saved studies", () => {
    render(<StudyManager />);
    expect(screen.queryByText(/Clear All/i)).toBeNull();
  });

  it("displays Clear All button when saved studies exist", async () => {
    useStudyStore.getState().createStudy("patient-1", TEST_IMG, 1000, 800);
    await useStudyStore.getState().saveStudy();

    render(<StudyManager />);
    expect(screen.getByText(/Clear All/i)).toBeInTheDocument();
  });

  it("opens confirmation modal upon clicking Clear All button", async () => {
    useStudyStore.getState().createStudy("patient-1", TEST_IMG, 1000, 800);
    await useStudyStore.getState().saveStudy();

    render(<StudyManager />);

    const clearAllBtn = screen.getByText(/Clear All/i);
    fireEvent.click(clearAllBtn);

    // Modal title & warning
    expect(screen.getByText("Delete All Saved Studies?")).toBeInTheDocument();
    expect(screen.getByText("Are you sure? This action cannot be undone.")).toBeInTheDocument();
    expect(screen.getByText("Yes, Delete All")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("cancels deletion when clicking Cancel in confirmation modal", async () => {
    useStudyStore.getState().createStudy("patient-1", TEST_IMG, 1000, 800);
    await useStudyStore.getState().saveStudy();

    render(<StudyManager />);

    const clearAllBtn = screen.getByText(/Clear All/i);
    fireEvent.click(clearAllBtn);

    const cancelBtn = screen.getByText("Cancel");
    fireEvent.click(cancelBtn);

    // Modal should be closed and study count intact
    expect(screen.queryByText("Delete All Saved Studies?")).toBeNull();
    expect(useStudyStore.getState().studyList).toHaveLength(1);
  });

  it("confirms and bulk clears all studies when clicking Yes, Delete All", async () => {
    useStudyStore.getState().createStudy("patient-1", TEST_IMG, 1000, 800);
    await useStudyStore.getState().saveStudy();
    useStudyStore.getState().createStudy("patient-2", TEST_IMG, 1000, 800);
    await useStudyStore.getState().saveStudy();

    expect(useStudyStore.getState().studyList).toHaveLength(2);

    render(<StudyManager />);

    const clearAllBtn = screen.getByText(/Clear All/i);
    fireEvent.click(clearAllBtn);

    const confirmBtn = screen.getByText("Yes, Delete All");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(useStudyStore.getState().studyList).toHaveLength(0);
      expect(screen.queryByText(/Clear All/i)).toBeNull();
    });
  });
});
