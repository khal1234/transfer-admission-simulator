import { describe, expect, it } from "vitest";
import rawExceptionData from "../data/편입_예외학과_통합.json";
import rawStandardData from "../data/편입_성적_통합.json";
import { convertRawToConv } from "./converter";
import {
  getGangwonAdmissionProfile,
  type GangwonAdmissionProfileId,
} from "./gangwonFormulaProfiles";

type ScoreRecord = { 대학명: string; 연도: string; 학과: string };
const standard = rawStandardData as ScoreRecord[];
const exceptions = rawExceptionData as ScoreRecord[];

function profileCounts(year: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const record of standard) {
    if (record.대학명 !== "강원대학교" || record.연도 !== year) continue;
    const profile = getGangwonAdmissionProfile(year, record.학과);
    if (profile === null) throw new Error(`${year} ${record.학과} 공식이 없다`);
    counts[profile.id] = (counts[profile.id] ?? 0) + 1;
  }
  return counts;
}

describe("강원대학교 연도·학과별 전형 프로필", () => {
  it("classifies every official result row", () => {
    expect(profileCounts("2024")).toEqual({
      standard: 76,
      nursing: 1,
      veterinary: 1,
      pharmacy: 1,
      arts: 5,
      "agriculture-special": 1,
    });
    expect(profileCounts("2025")).toEqual({
      standard: 77,
      nursing: 1,
      veterinary: 1,
      pharmacy: 1,
      arts: 5,
      "agriculture-special": 1,
    });
    expect(profileCounts("2026")).toEqual({
      standard: 75,
      nursing: 1,
      veterinary: 1,
      pharmacy: 1,
      arts: 5,
      "agriculture-special": 1,
      "ecology-landscape": 1,
    });
  });

  it.each<[string, string, GangwonAdmissionProfileId]>([
    ["2024", "경영학전공", "standard"],
    ["2026", "간호학과", "nursing"],
    ["2025", "수의학과", "veterinary"],
    ["2024", "약학과", "pharmacy"],
    ["2026", "음악학과", "arts"],
    ["2024", "시설농업학전공", "agriculture-special"],
    ["2026", "스마트팜농산업학과", "agriculture-special"],
    ["2026", "생태조경디자인학과", "ecology-landscape"],
    ["2026", "체육교육과", "sports-education"],
  ])("applies %s %s as %s", (year, department, expected) => {
    expect(getGangwonAdmissionProfile(year, department)?.id).toBe(expected);
  });

  it("converts the same input with the selected year and department profile", () => {
    expect(convertRawToConv("강원대학교", "2024", 990, 100, "경영학전공"))
      .toEqual({ englishConv: 100, gpaConv: 75, indexSum: 175 });
    expect(convertRawToConv("강원대학교", "2026", 990, 100, "경영학전공"))
      .toEqual({ englishConv: 150, gpaConv: null, indexSum: 150 });
    expect(convertRawToConv("강원대학교", "2026", 990, 100, "생태조경디자인학과"))
      .toEqual({ englishConv: 100, gpaConv: 50, indexSum: 150 });
    expect(convertRawToConv("강원대학교", "2026", 990, 100, "스마트팜농산업학과"))
      .toEqual({ englishConv: null, gpaConv: 150, indexSum: 150 });
    expect(convertRawToConv("강원대학교", "2025", 990, 100, "간호학과"))
      .toEqual({ englishConv: 75, gpaConv: 75, indexSum: 150 });
    expect(convertRawToConv("강원대학교", "2024", 990, 100, "수의학과"))
      .toEqual({ englishConv: 100, gpaConv: null, indexSum: 100 });
    expect(convertRawToConv("강원대학교", "2025", 990, 100, "수의학과"))
      .toEqual({ englishConv: 30, gpaConv: null, indexSum: 30 });
    expect(convertRawToConv("강원대학교", "2025", 990, 100, "약학과"))
      .toEqual({ englishConv: 60, gpaConv: 40, indexSum: 100 });
    expect(convertRawToConv("강원대학교", "2026", 990, 100, "약학과"))
      .toEqual({ englishConv: 30, gpaConv: null, indexSum: 30 });
  });

  it("keeps every Gangwon result row selectable", () => {
    expect(standard.filter((record) => record.대학명 === "강원대학교"))
      .toHaveLength(256);
    expect(exceptions.filter((record) => record.대학명 === "강원대학교"))
      .toHaveLength(0);
  });
});
