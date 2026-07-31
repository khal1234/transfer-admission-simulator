import { describe, expect, it } from "vitest";
import type { ConversionResult, DepartmentRecord } from "./converter";
import {
  getComparisonYearNotice,
  pickBasisRecord,
} from "./comparisonBasis";

function createRecord(
  overrides: Partial<DepartmentRecord> = {},
): DepartmentRecord {
  return {
    대학명: "강원대학교",
    연도: "2026",
    학과: "기계공학과",
    학과_원본명: "기계공학과",
    모집인원: 10,
    지원인원: 30,
    합격인원: 8,
    최종합격_토익환산점수: 100,
    최종합격_토익원점수: 825,
    최종합격_학점환산점수: null,
    최종합격_학점원점수_100점만점: null,
    ...overrides,
  };
}

function createScore(diff: number): ConversionResult {
  return {
    englishConv: 100,
    gpaConv: null,
    myIndexSum: 100,
    acceptedIndexSum: 100 - diff,
    diff,
    status: diff >= 0 ? "safe" : "risk",
  };
}

describe("pickBasisRecord", () => {
  it("uses the newest comparable record for the latest basis", () => {
    const record2026 = createRecord();
    const record2025 = createRecord({ 연도: "2025" });
    const history = new Map([
      [record2026.연도, record2026],
      [record2025.연도, record2025],
    ]);

    expect(pickBasisRecord([
      { year: "2026", score: createScore(-2) },
      { year: "2025", score: createScore(3) },
    ], history, "latest")).toBe(record2026);
  });

  it("normalizes gaps when yearly index-score maxima differ", () => {
    const record2026 = createRecord(); // 지표합 만점 150
    const record2025 = createRecord({ 연도: "2025" }); // 지표합 만점 175
    const history = new Map([
      [record2026.연도, record2026],
      [record2025.연도, record2025],
    ]);
    const comparisons = [
      { year: "2026", score: createScore(9) },
      { year: "2025", score: createScore(10) },
    ];

    expect(pickBasisRecord(comparisons, history, "lowest")).toBe(record2026);
    expect(pickBasisRecord(comparisons, history, "highest")).toBe(record2025);
  });
});

describe("getComparisonYearNotice", () => {
  it("does not call an intentional historical basis a missing-data fallback", () => {
    const latest = createRecord();
    const selected = createRecord({ 연도: "2024" });

    expect(getComparisonYearNotice("lowest", selected, latest)).toBeNull();
  });

  it("explains a real fallback from an unavailable latest record", () => {
    const latest = createRecord({
      최종합격_토익환산점수: null,
      최종합격_토익원점수: null,
    });
    const fallback = createRecord({ 연도: "2025" });

    expect(getComparisonYearNotice("latest", fallback, latest)).toBe(
      "2026에는 비교 가능한 합격 평균이 없어 최신 유효 자료인 2025 평균을 사용합니다.",
    );
  });
});
