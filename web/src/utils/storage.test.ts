import { describe, expect, it, vi } from "vitest";
import {
  readSimulatorStorageSnapshot,
  STORAGE_KEYS,
  writeSimulatorStorageValue,
} from "./storage";

describe("simulator storage boundary", () => {
  it("reads every simulator value from an available storage", () => {
    const values = new Map<string, string>([
      [STORAGE_KEYS.toeic, "900"],
      [STORAGE_KEYS.gpaType, "4.5"],
      [STORAGE_KEYS.gpaRaw, "4.1"],
      [STORAGE_KEYS.gpa100, "95.43"],
      [STORAGE_KEYS.targets, "[]"],
    ]);
    const snapshot = readSimulatorStorageSnapshot({
      getItem: (key) => values.get(key) ?? null,
      setItem: vi.fn(),
    });

    expect(snapshot.available).toBe(true);
    expect(snapshot.values).toEqual({
      [STORAGE_KEYS.toeic]: "900",
      [STORAGE_KEYS.gpaType]: "4.5",
      [STORAGE_KEYS.gpaRaw]: "4.1",
      [STORAGE_KEYS.gpa100]: "95.43",
      [STORAGE_KEYS.targets]: "[]",
    });
  });

  it("returns safe empty values when storage is unavailable", () => {
    const snapshot = readSimulatorStorageSnapshot(null);

    expect(snapshot.available).toBe(false);
    expect(Object.values(snapshot.values)).toEqual([null, null, null, null, null]);
  });

  it("does not expose partial values after a read failure", () => {
    const snapshot = readSimulatorStorageSnapshot({
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: vi.fn(),
    });

    expect(snapshot.available).toBe(false);
    expect(Object.values(snapshot.values)).toEqual([null, null, null, null, null]);
  });

  it("reports successful writes", () => {
    const setItem = vi.fn();

    expect(writeSimulatorStorageValue(
      STORAGE_KEYS.toeic,
      "905",
      { getItem: vi.fn(), setItem },
    )).toBe(true);
    expect(setItem).toHaveBeenCalledWith(STORAGE_KEYS.toeic, "905");
  });

  it("reports quota or permission write failures", () => {
    expect(writeSimulatorStorageValue(
      STORAGE_KEYS.targets,
      "[]",
      {
        getItem: vi.fn(),
        setItem: () => {
          throw new Error("quota exceeded");
        },
      },
    )).toBe(false);
  });
});
