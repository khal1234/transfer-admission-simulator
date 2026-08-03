import { describe, expect, it } from "vitest";
import rawExceptionData from "../data/편입_예외학과_통합.json";
import rawStandardData from "../data/편입_성적_통합.json";
import { convertRawToConv } from "./converter";
import { getConversionFormula } from "./formulaRegistry";
import {
  getIncheonAdmissionProfile,
  type IncheonAdmissionProfileId,
} from "./incheonFormulaProfiles";

type ScoreRecord = {
  대학명: string;
  연도: string;
  학과: string;
};

const standard = rawStandardData as ScoreRecord[];
const exceptions = rawExceptionData as ScoreRecord[];

function profileCounts(year: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const record of standard) {
    if (record.대학명 !== "인천대학교" || record.연도 !== year) continue;
    const profile = getIncheonAdmissionProfile(year, record.학과);
    if (profile === null) throw new Error(`${year} ${record.학과} 공식이 없다`);
    counts[profile.id] = (counts[profile.id] ?? 0) + 1;
  }
  return counts;
}

describe("인천대학교 연도·학과별 전형 프로필", () => {
  it("classifies every 2024 result row", () => {
    expect(profileCounts("2024")).toEqual({ standard: 48, practical: 5 });
  });

  it("classifies every 2025 result row", () => {
    expect(profileCounts("2025")).toEqual({
      standard: 45,
      practical: 3,
      "movement-health": 1,
    });
  });

  it("classifies every 2026 result row", () => {
    expect(profileCounts("2026")).toEqual({
      standard: 46,
      practical: 3,
      "interview-only": 2,
      "movement-health": 1,
    });
  });

  it.each<[string, string, IncheonAdmissionProfileId]>([
    ["2024", "기계공학과", "standard"],
    ["2024", "디자인학부", "standard"],
    ["2024", "한국화전공", "practical"],
    ["2024", "운동건강학부", "practical"],
    ["2025", "운동건강학부", "movement-health"],
    ["2026", "스포츠과학부", "practical"],
    ["2026", "체육교육과", "practical"],
    ["2026", "한국화전공", "interview-only"],
  ])("applies %s %s as %s", (year, department, expected) => {
    expect(getIncheonAdmissionProfile(year, department)?.id).toBe(expected);
  });

  it("keeps the 60-point base only for standard departments", () => {
    expect(convertRawToConv("인천대학교", "2026", 495, 100, "디자인학부"))
      .toEqual({ englishConv: 90, gpaConv: null, indexSum: 90 });
    expect(convertRawToConv("인천대학교", "2026", 495, 100, "운동건강학부"))
      .toEqual({ englishConv: 30, gpaConv: null, indexSum: 30 });
  });

  it("marks all three official year formulas as verified", () => {
    for (const year of ["2024", "2025", "2026"]) {
      expect(getConversionFormula("인천대학교", year, "디자인학부"))
        .toMatchObject({
          confidence: "verified",
          provenance: "documented-for-year",
          reverseCalculationMode: "linear",
        });
    }
  });

  it("does not manufacture a score for English-free practical/interview profiles", () => {
    expect(convertRawToConv("인천대학교", "2026", 990, 100, "스포츠과학부"))
      .toEqual({ englishConv: null, gpaConv: null, indexSum: null });
    expect(convertRawToConv("인천대학교", "2026", 990, 100, "한국화전공"))
      .toEqual({ englishConv: null, gpaConv: null, indexSum: null });
  });

  it("keeps all 154 Incheon result rows selectable", () => {
    expect(standard.filter((record) => record.대학명 === "인천대학교"))
      .toHaveLength(154);
    expect(exceptions.filter((record) => record.대학명 === "인천대학교"))
      .toHaveLength(0);
  });
});
