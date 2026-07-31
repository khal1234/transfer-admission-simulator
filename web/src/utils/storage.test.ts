import { describe, expect, it, vi } from "vitest";
import {
  readSimulatorStorageSnapshot,
  STORAGE_KEYS,
  writeSimulatorStorageValue,
} from "./storage";

// 키 목록을 테스트에 베껴 두면 저장 항목을 하나 늘릴 때마다 여기가 깨진다.
// 이 테스트가 확인하려는 건 '전부 읽는가'이지 '여섯 개인가'가 아니다.
const ALL_KEYS = Object.values(STORAGE_KEYS);

describe("simulator storage boundary", () => {
  it("reads every simulator value from an available storage", () => {
    const values = new Map<string, string>(
      ALL_KEYS.map((key, index) => [key, `저장값${index}`]),
    );
    const snapshot = readSimulatorStorageSnapshot({
      getItem: (key) => values.get(key) ?? null,
      setItem: vi.fn(),
    });

    expect(snapshot.available).toBe(true);
    expect(snapshot.values).toEqual(Object.fromEntries(values));
  });

  it("returns safe empty values when storage is unavailable", () => {
    const snapshot = readSimulatorStorageSnapshot(null);

    expect(snapshot.available).toBe(false);
    expect(Object.keys(snapshot.values).sort()).toEqual([...ALL_KEYS].sort());
    expect(Object.values(snapshot.values)).toEqual(ALL_KEYS.map(() => null));
  });

  it("does not expose partial values after a read failure", () => {
    const snapshot = readSimulatorStorageSnapshot({
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: vi.fn(),
    });

    expect(snapshot.available).toBe(false);
    expect(Object.values(snapshot.values)).toEqual(ALL_KEYS.map(() => null));
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
