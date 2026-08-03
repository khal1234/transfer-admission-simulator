import { describe, expect, it } from "vitest";
import rawExceptionData from "../data/편입_예외학과_통합.json";
import rawStandardData from "../data/편입_성적_통합.json";
import { convertRawToConv } from "./converter";
import {
  getChungbukAdmissionProfile,
  type ChungbukAdmissionProfileId,
} from "./chungbukFormulaProfiles";

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
    if (record.대학명 !== "충북대학교" || record.연도 !== year) continue;
    const profile = getChungbukAdmissionProfile(year, record.학과);
    if (profile === null) throw new Error(`${year} ${record.학과} 공식이 없다`);
    counts[profile.id] = (counts[profile.id] ?? 0) + 1;
  }
  return counts;
}

describe("충북대학교 연도·학과별 전형 프로필", () => {
  it("classifies every 2024 result row", () => {
    expect(profileCounts("2024")).toEqual({
      standard: 53,
      written: 3,
      practical: 1,
    });
  });

  it("classifies every 2025 result row", () => {
    expect(profileCounts("2025")).toEqual({ standard: 41, written: 4 });
  });

  it("classifies every 2026 result row", () => {
    expect(profileCounts("2026")).toEqual({
      standard: 45,
      written: 2,
      practical: 1,
    });
  });

  it.each<[string, string, ChungbukAdmissionProfileId]>([
    ["2024", "국어국문학과", "standard"],
    ["2024", "수의학과", "written"],
    ["2024", "의학과", "written"],
    ["2024", "건축학과", "practical"],
    ["2024", "조형예술학과(서양화전공)", "practical"],
    ["2025", "간호학과", "written"],
    ["2026", "약학과", "standard"],
    ["2026", "수의학과", "written"],
    ["2026", "미술학과(서양화전공)", "practical"],
  ])("applies %s %s as %s", (year, department, expected) => {
    expect(getChungbukAdmissionProfile(year, department)?.id).toBe(expected);
  });

  it("uses the official lookup table and each year's GPA rule", () => {
    expect(convertRawToConv("충북대학교", "2024", 980, 100, "수의학과"))
      .toEqual({ englishConv: 30, gpaConv: 30, indexSum: 60 });
    expect(convertRawToConv("충북대학교", "2025", 975, 100, "건축학과"))
      .toEqual({ englishConv: 29.5, gpaConv: 30, indexSum: 59.5 });
    expect(convertRawToConv("충북대학교", "2026", 980, 100, "간호학과"))
      .toEqual({ englishConv: 60, gpaConv: null, indexSum: 60 });
    expect(convertRawToConv("충북대학교", "2026", 375, 100, "건축학과"))
      .toEqual({ englishConv: 44.5, gpaConv: null, indexSum: 44.5 });
  });

  it("keeps all 150 Chungbuk result rows selectable", () => {
    expect(standard.filter((record) => record.대학명 === "충북대학교"))
      .toHaveLength(150);
    expect(exceptions.filter((record) => record.대학명 === "충북대학교"))
      .toHaveLength(0);
  });
});
