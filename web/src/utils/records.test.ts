import { describe, expect, it } from "vitest";
import type { DepartmentRecord } from "./converter";
import {
  getLatestComparableRecord,
  getLatestRecord,
  isComparableRecord,
} from "./records";

function createRecord(
  overrides: Partial<DepartmentRecord> = {}
): DepartmentRecord {
  return {
    대학명: "부산대학교",
    연도: "2026",
    학과: "기계공학부",
    학과_원본명: "기계공학부",
    모집인원: 10,
    지원인원: 30,
    합격인원: 8,
    최종합격_토익환산점수: 25,
    최종합격_토익원점수: 825,
    최종합격_학점환산점수: 27,
    최종합격_학점원점수_100점만점: 90,
    ...overrides,
  };
}

describe("isComparableRecord", () => {
  it("accepts an English-only record without a GPA score", () => {
    const record = createRecord({
      대학명: "인천대학교",
      최종합격_토익환산점수: 110,
      최종합격_학점환산점수: null,
      최종합격_학점원점수_100점만점: null,
    });

    expect(isComparableRecord(record)).toBe(true);
  });

  it("rejects a zero score when nobody was accepted", () => {
    const record = createRecord({
      합격인원: 0,
      최종합격_토익환산점수: 0,
      최종합격_토익원점수: 0,
      최종합격_학점환산점수: 0,
      최종합격_학점원점수_100점만점: 0,
    });

    expect(isComparableRecord(record)).toBe(false);
  });

  it("rejects a record without enough score data", () => {
    const record = createRecord({
      최종합격_토익환산점수: null,
      최종합격_토익원점수: null,
      최종합격_학점환산점수: null,
      최종합격_학점원점수_100점만점: null,
    });

    expect(isComparableRecord(record)).toBe(false);
  });
});

describe("getLatestComparableRecord", () => {
  it("falls back to the latest older record that can be compared", () => {
    const unavailable2026 = createRecord({
      연도: "2026",
      최종합격_토익환산점수: null,
      최종합격_토익원점수: null,
      최종합격_학점환산점수: null,
      최종합격_학점원점수_100점만점: null,
    });
    const comparable2025 = createRecord({ 연도: "2025" });
    const comparable2024 = createRecord({ 연도: "2024" });

    expect(
      getLatestComparableRecord([
        comparable2024,
        unavailable2026,
        comparable2025,
      ])
    ).toBe(comparable2025);
  });

  it("returns undefined when no record can be compared", () => {
    const unavailable = createRecord({
      최종합격_토익환산점수: null,
      최종합격_토익원점수: null,
      최종합격_학점환산점수: null,
      최종합격_학점원점수_100점만점: null,
    });

    expect(getLatestComparableRecord([unavailable])).toBeUndefined();
  });
});

describe("getLatestRecord", () => {
  it("keeps the latest record available for display even when it cannot be compared", () => {
    const unavailable2026 = createRecord({
      연도: "2026",
      최종합격_토익환산점수: null,
      최종합격_토익원점수: null,
      최종합격_학점환산점수: null,
      최종합격_학점원점수_100점만점: null,
    });
    const comparable2025 = createRecord({ 연도: "2025" });

    expect(getLatestRecord([comparable2025, unavailable2026])).toBe(
      unavailable2026
    );
  });
});
