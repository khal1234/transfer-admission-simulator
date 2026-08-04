import { describe, expect, it } from "vitest";
import rawExceptionData from "../data/편입_예외학과_통합.json";
import rawStandardData from "../data/편입_성적_통합.json";
import { convertRawToConv } from "./converter";
import {
  getChonnamAdmissionProfile,
  type ChonnamAdmissionProfileId,
} from "./chonnamFormulaProfiles";

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
    if (record.대학명 !== "전남대학교" || record.연도 !== year) continue;
    const profile = getChonnamAdmissionProfile(year, record.학과);
    if (profile === null) throw new Error(`${year} ${record.학과} 공식이 없다`);
    counts[profile.id] = (counts[profile.id] ?? 0) + 1;
  }
  return counts;
}

describe("전남대학교 연도·학과별 전형 프로필", () => {
  it("classifies every 2024 result row", () => {
    expect(profileCounts("2024")).toEqual({
      standard: 85,
      "veterinary-stage": 1,
      pharmacy: 1,
      arts: 9,
      yeosu: 33,
    });
  });

  it("classifies every 2025 result row", () => {
    expect(profileCounts("2025")).toEqual({
      standard: 86,
      "veterinary-stage": 1,
      pharmacy: 1,
      arts: 10,
      yeosu: 31,
    });
  });

  it("classifies every 2026 result row", () => {
    expect(profileCounts("2026")).toEqual({
      standard: 78,
      "nursing-2026": 1,
      "veterinary-2026": 1,
      pharmacy: 1,
      arts: 11,
      "design-2026": 1,
      yeosu: 32,
    });
  });

  it.each<[string, string, ChonnamAdmissionProfileId]>([
    ["2024", "경영학부", "standard"],
    ["2024", "수의학과", "veterinary-stage"],
    ["2025", "수의학과", "veterinary-stage"],
    ["2026", "수의학과", "veterinary-2026"],
    ["2026", "간호학과", "nursing-2026"],
    ["2026", "디자인학과", "design-2026"],
    ["2025", "약학부", "pharmacy"],
    ["2025", "체육교육과", "arts"],
    ["2024", "건축디자인학과", "yeosu"],
    ["2024", "이론전공", "standard"],
    ["2025", "이론전공", "standard"],
    ["2026", "이론전공", "standard"],
  ])("applies %s %s as %s", (year, department, expected) => {
    expect(getChonnamAdmissionProfile(year, department)?.id).toBe(expected);
  });

  it("converts TOEIC and GPA with the selected profile weights", () => {
    expect(convertRawToConv("전남대학교", "2024", 990, 100, "수의학과"))
      .toEqual({ englishConv: 400, gpaConv: 200, indexSum: 600 });
    expect(convertRawToConv("전남대학교", "2026", 990, 100, "수의학과"))
      .toEqual({ englishConv: 300, gpaConv: 100, indexSum: 400 });
    expect(convertRawToConv("전남대학교", "2025", 990, 100, "약학부"))
      .toEqual({ englishConv: 300, gpaConv: 200, indexSum: 500 });
    expect(convertRawToConv("전남대학교", "2026", 990, 100, "디자인학과"))
      .toEqual({ englishConv: null, gpaConv: 200, indexSum: 200 });
    expect(convertRawToConv("전남대학교", "2026", 990, 100, "건축디자인학과"))
      .toEqual({ englishConv: null, gpaConv: 600, indexSum: 600 });
  });

  it("keeps every Chonnam result row selectable", () => {
    expect(standard.filter((record) => record.대학명 === "전남대학교"))
      .toHaveLength(383);
    expect(exceptions.filter((record) => record.대학명 === "전남대학교"))
      .toHaveLength(0);
  });

  it("documents only the single-score GPA conversion", () => {
    const profile = getChonnamAdmissionProfile("2026", "간호학과");
    expect(profile?.gpaFormulaText).toBe("전적대성적 반영점수 = 백분율 × 2");
    expect(profile?.gpaFormulaText).not.toContain("전적대가 여러");
    expect(profile?.gpaFormulaText).not.toContain("연계");
  });
});
