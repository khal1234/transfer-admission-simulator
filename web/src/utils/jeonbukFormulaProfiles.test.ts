import { describe, expect, it } from "vitest";
import rawExceptionData from "../data/편입_예외학과_통합.json";
import rawStandardData from "../data/편입_성적_통합.json";
import { convertRawToConv } from "./converter";
import {
  getJeonbukAdmissionProfile,
  getJeonbukToeicTableScore,
  type JeonbukAdmissionProfileId,
} from "./jeonbukFormulaProfiles";

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
    if (record.대학명 !== "전북대학교" || record.연도 !== year) continue;
    const profile = getJeonbukAdmissionProfile(year, record.학과);
    if (profile === null) throw new Error(`${year} ${record.학과} 공식이 없다`);
    counts[profile.id] = (counts[profile.id] ?? 0) + 1;
  }
  return counts;
}

describe("전북대학교 연도·학과별 전형 프로필", () => {
  it("classifies every 2024 result row", () => {
    expect(profileCounts("2024")).toEqual({
      standard: 80,
      arts: 4,
      sports: 1,
      veterinary: 1,
      "pharmacy-dentistry": 1,
    });
  });

  it("classifies every 2025 result row", () => {
    expect(profileCounts("2025")).toEqual({
      standard: 82,
      arts: 4,
      veterinary: 1,
      "pharmacy-dentistry": 2,
    });
  });

  it("classifies every 2026 result row", () => {
    expect(profileCounts("2026")).toEqual({
      standard: 80,
      arts: 5,
      sports: 1,
      veterinary: 1,
      "pharmacy-dentistry": 2,
    });
  });

  it.each<[string, string, JeonbukAdmissionProfileId]>([
    ["2024", "국어국문학과", "standard"],
    ["2024", "한국음악학과", "arts"],
    ["2024", "스포츠과학과", "sports"],
    ["2024", "수의학과", "veterinary"],
    ["2024", "약학과", "pharmacy-dentistry"],
    ["2025", "치의학과", "pharmacy-dentistry"],
    ["2025", "스포츠과학과", "standard"],
    ["2026", "한옥학과", "hanok"],
    ["2026", "무용학과", "arts"],
  ])("applies %s %s as %s", (year, department, expected) => {
    expect(getJeonbukAdmissionProfile(year, department)?.id).toBe(expected);
  });

  it("uses the exact official TOEIC bands", () => {
    expect(getJeonbukToeicTableScore(990)).toBe(100);
    expect(getJeonbukToeicTableScore(989)).toBeCloseTo(99.495, 6);
    expect(getJeonbukToeicTableScore(985)).toBeCloseTo(99.495, 6);
    expect(getJeonbukToeicTableScore(984)).toBeCloseTo(98.99, 6);
    expect(getJeonbukToeicTableScore(4)).toBeCloseTo(0.01, 6);
  });

  it("converts TOEIC and GPA with the selected profile weights", () => {
    expect(convertRawToConv("전북대학교", "2024", 985, 100, "수의학과"))
      .toEqual({ englishConv: 79.6, gpaConv: 20, indexSum: 99.6 });
    expect(convertRawToConv("전북대학교", "2025", 985, 100, "치의학과"))
      .toEqual({ englishConv: 59.7, gpaConv: 20, indexSum: 79.7 });
    expect(convertRawToConv("전북대학교", "2026", 985, 100, "스포츠과학과"))
      .toEqual({ englishConv: 49.75, gpaConv: 50, indexSum: 99.75 });
    expect(convertRawToConv("전북대학교", "2026", 985, 100, "미술학과"))
      .toEqual({ englishConv: null, gpaConv: 120, indexSum: 120 });
    expect(convertRawToConv("전북대학교", "2026", 985, 100, "한옥학과"))
      .toEqual({ englishConv: null, gpaConv: 100, indexSum: 100 });
  });

  it("keeps every Jeonbuk result row selectable", () => {
    expect(standard.filter((record) => record.대학명 === "전북대학교"))
      .toHaveLength(265);
    expect(exceptions.filter((record) => record.대학명 === "전북대학교"))
      .toHaveLength(0);
  });
});
