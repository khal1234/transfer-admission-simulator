import { describe, expect, it } from "vitest";
import rawStandardData from "../data/편입_성적_통합.json";
import { convertRawToConv } from "./converter";
import { getConversionFormula } from "./formulaRegistry";

type ScoreRecord = { 대학명: string; 연도: string; 학과: string };
const standard = rawStandardData as ScoreRecord[];
const supported = new Set([
  "강원대학교",
  "경북대학교",
  "부경대학교",
  "부산대학교",
  "인천대학교",
  "전남대학교",
  "전북대학교",
  "충남대학교",
  "충북대학교",
]);

const expectedAtMaximum = [
  ["강원대학교", "2024", 100, 75, 175],
  ["강원대학교", "2025", 100, 75, 175],
  ["강원대학교", "2026", 150, null, 150],
  ["경북대학교", "2024", 100, 50, 150],
  ["경북대학교", "2025", 100, 50, 150],
  ["경북대학교", "2026", 100, 50, 150],
  ["부경대학교", "2024", 200, 100, 300],
  ["부경대학교", "2025", 200, 100, 300],
  ["부경대학교", "2026", 200, 100, 300],
  ["부산대학교", "2024", 30, 30, 60],
  ["부산대학교", "2025", 30, 30, 60],
  ["부산대학교", "2026", 30, 30, 60],
  ["인천대학교", "2024", 120, null, 120],
  ["인천대학교", "2025", 120, null, 120],
  ["인천대학교", "2026", 120, null, 120],
  ["전남대학교", "2024", 400, 200, 600],
  ["전남대학교", "2025", 400, 200, 600],
  ["전남대학교", "2026", 400, 200, 600],
  ["전북대학교", "2024", 80, 60, 140],
  ["전북대학교", "2025", 80, 60, 140],
  ["전북대학교", "2026", 80, 60, 140],
  ["충남대학교", "2024", 50, 10, 60],
  ["충남대학교", "2025", 60, null, 60],
  ["충남대학교", "2026", 60, null, 60],
  ["충북대학교", "2024", 30, 30, 60],
  ["충북대학교", "2025", 30, 30, 60],
  ["충북대학교", "2026", 60, null, 60],
] as const;

const expectedForEnteredScore = [
  ["강원대학교", "2024", 85.86, 67.5, 153.36],
  ["강원대학교", "2025", 85.86, 67.5, 153.36],
  ["강원대학교", "2026", 128.79, null, 128.79],
  ["경북대학교", "2024", 85.86, 48, 133.86],
  ["경북대학교", "2025", 85.86, 48, 133.86],
  ["경북대학교", "2026", 85.86, 48, 133.86],
  ["부경대학교", "2024", 171.7171, 96, 267.7171],
  ["부경대학교", "2025", 171.7171, 96, 267.7171],
  ["부경대학교", "2026", 171.7171, 96, 267.7171],
  ["부산대학교", "2024", 25.76, 27, 52.76],
  ["부산대학교", "2025", 25.76, 27, 52.76],
  ["부산대학교", "2026", 25.76, 27, 52.76],
  ["인천대학교", "2024", 111.52, null, 111.52],
  ["인천대학교", "2025", 111.52, null, 111.52],
  ["인천대학교", "2026", 111.52, null, 111.52],
  ["전남대학교", "2024", 343.43, 180, 523.43],
  ["전남대학교", "2025", 343.43, 180, 523.43],
  ["전남대학교", "2026", 343.43, 180, 523.43],
  ["전북대학교", "2024", 68.69, 54, 122.69],
  ["전북대학교", "2025", 68.69, 54, 122.69],
  ["전북대학교", "2026", 68.69, 54, 122.69],
  ["충남대학교", "2024", 43, 9, 52],
  ["충남대학교", "2025", 43.2, null, 43.2],
  ["충남대학교", "2026", 43.2, null, 43.2],
  ["충북대학교", "2024", 26.5, 28, 54.5],
  ["충북대학교", "2025", 26.5, 28, 54.5],
  ["충북대학교", "2026", 56.5, null, 56.5],
] as const;

describe("전체 대학 연도별 환산 경로", () => {
  it("resolves a year-specific documented profile for every selectable row", () => {
    const rows = standard.filter((record) => supported.has(record.대학명));
    expect(rows).toHaveLength(2194);
    for (const record of rows) {
      const formula = getConversionFormula(record.대학명, record.연도, record.학과);
      expect(formula, `${record.대학명} ${record.연도} ${record.학과}`).not.toBeNull();
      expect(formula?.provenance).toBe("documented-for-year");
      expect(formula?.admissionProfile?.sourcePage).toContain(record.연도);
    }
  });

  it.each(expectedAtMaximum)(
    "%s %s uses its own yearly formula for an entered score",
    (university, year, englishConv, gpaConv, indexSum) => {
      expect(convertRawToConv(university, year, 990, 100)).toEqual({
        englishConv,
        gpaConv,
        indexSum,
      });
    },
  );

  it.each(expectedForEnteredScore)(
    "%s %s converts an entered TOEIC 850 / GPA 90 with that year's rule",
    (university, year, englishConv, gpaConv, indexSum) => {
      expect(convertRawToConv(university, year, 850, 90)).toEqual({
        englishConv,
        gpaConv,
        indexSum,
      });
    },
  );
});
