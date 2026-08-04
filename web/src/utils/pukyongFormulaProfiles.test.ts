import { describe, expect, it } from "vitest";
import rawExceptionData from "../data/편입_예외학과_통합.json";
import rawStandardData from "../data/편입_성적_통합.json";
import { convertRawToConv } from "./converter";
import {
  getPukyongAdmissionProfile,
  type PukyongAdmissionProfileId,
} from "./pukyongFormulaProfiles";

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
    if (record.대학명 !== "부경대학교" || record.연도 !== year) continue;
    const profile = getPukyongAdmissionProfile(year, record.학과);
    if (profile === null) throw new Error(`${year} ${record.학과} 공식이 없다`);
    counts[profile.id] = (counts[profile.id] ?? 0) + 1;
  }
  return counts;
}

describe("부경대학교 연도·학과별 전형 프로필", () => {
  it("classifies every 2024 result row", () => {
    expect(profileCounts("2024")).toEqual({
      interview: 59,
      "no-interview": 11,
      practical: 3,
      "future-convergence": 4,
    });
  });

  it("classifies every 2025 result row", () => {
    expect(profileCounts("2025")).toEqual({
      interview: 54,
      "no-interview": 16,
      practical: 3,
      "future-convergence": 4,
    });
  });

  it("classifies every 2026 result row", () => {
    expect(profileCounts("2026")).toEqual({
      interview: 56,
      "no-interview": 19,
      practical: 3,
      "future-convergence": 4,
    });
  });

  it.each<[string, string, PukyongAdmissionProfileId]>([
    ["2024", "국어국문학과", "interview"],
    ["2024", "패션디자인학과", "no-interview"],
    ["2025", "디스플레이반도체공학전공", "no-interview"],
    ["2026", "수해양산업교육과", "no-interview"],
    ["2026", "시각디자인전공", "practical"],
    ["2024", "스마트기계모빌리티전공", "future-convergence"],
    ["2026", "기계조선공조공학전공", "future-convergence"],
  ])("applies %s %s as %s", (year, department, expected) => {
    expect(getPukyongAdmissionProfile(year, department)?.id).toBe(expected);
  });

  it("uses official weights and truncates at the fifth decimal place", () => {
    expect(convertRawToConv("부경대학교", "2026", 985, 90, "국어국문학과"))
      .toEqual({ englishConv: 198.9898, gpaConv: 96, indexSum: 294.9898 });
    expect(convertRawToConv("부경대학교", "2026", 985, 90, "시각디자인전공"))
      .toEqual({ englishConv: 99.4949, gpaConv: 96, indexSum: 195.4949 });
    expect(convertRawToConv("부경대학교", "2026", 985, 90, "기계조선공조공학전공"))
      .toEqual({ englishConv: null, gpaConv: 96, indexSum: 96 });
  });

  it("keeps every Pukyong result row selectable", () => {
    expect(standard.filter((record) => record.대학명 === "부경대학교"))
      .toHaveLength(236);
    expect(exceptions.filter((record) => record.대학명 === "부경대학교"))
      .toHaveLength(0);
  });
});
