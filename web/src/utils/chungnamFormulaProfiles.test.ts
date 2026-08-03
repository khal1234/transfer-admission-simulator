import { describe, expect, it } from "vitest";
import rawExceptionData from "../data/편입_예외학과_통합.json";
import rawStandardData from "../data/편입_성적_통합.json";
import { convertRawToConv } from "./converter";
import {
  getChungnamAdmissionProfile,
  type ChungnamAdmissionProfileId,
} from "./chungnamFormulaProfiles";

type ScoreRecord = {
  대학명: string;
  연도: string;
  학과: string;
  최종합격_토익원점수: number | null;
  최종합격_학점원점수_100점만점: number | null;
};

const standard = rawStandardData as ScoreRecord[];
const exceptions = rawExceptionData as ScoreRecord[];

function profileCounts(year: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const record of standard) {
    if (record.대학명 !== "충남대학교" || record.연도 !== year) continue;
    const profile = getChungnamAdmissionProfile(year, record.학과);
    if (profile === null) throw new Error(`${year} ${record.학과} 공식이 없다`);
    counts[profile.id] = (counts[profile.id] ?? 0) + 1;
  }
  return counts;
}

function recordAt(year: string, department: string): ScoreRecord | undefined {
  return standard.find((record) => (
    record.대학명 === "충남대학교"
    && record.연도 === year
    && record.학과 === department
  ));
}

describe("충남대학교 연도·학과별 전형 프로필", () => {
  it("classifies every 2024 result row", () => {
    expect(profileCounts("2024")).toEqual({
      standard: 66,
      "hanmun-written": 1,
      "science-interview": 2,
      "coding-practical": 2,
      "food-written": 1,
      "vet-pharmacy-written": 1,
      "arts-practical": 9,
    });
  });

  it("classifies every 2025 result row", () => {
    expect(profileCounts("2025")).toEqual({
      standard: 68,
      "coding-practical": 2,
      "food-written": 1,
      "vet-pharmacy-written": 2,
      "arts-practical": 10,
    });
  });

  it("classifies every 2026 result row", () => {
    expect(profileCounts("2026")).toEqual({
      standard: 77,
      "coding-practical": 2,
      "food-written": 1,
      "vet-pharmacy-written": 2,
      "arts-practical": 12,
      "math-education-written": 1,
    });
  });

  it.each<[string, string, ChungnamAdmissionProfileId]>([
    ["2024", "국어국문학과", "standard"],
    ["2024", "한문학과", "hanmun-written"],
    ["2024", "화학과", "science-interview"],
    ["2024", "컴퓨터융합학부", "coding-practical"],
    ["2024", "식품공학과", "food-written"],
    ["2024", "약학과", "vet-pharmacy-written"],
    ["2024", "수학교육과", "math-education-written"],
    ["2025", "음악과(성악)", "arts-practical"],
    ["2026", "수학교육과", "math-education-written"],
  ])("applies %s %s as %s", (year, department, expected) => {
    expect(getChungnamAdmissionProfile(year, department)?.id).toBe(expected);
  });

  it("uses each 2024 English/GPA weight with the official lookup table", () => {
    expect(convertRawToConv("충남대학교", "2024", 985, 100, "국어국문학과"))
      .toEqual({ englishConv: 50, gpaConv: 10, indexSum: 60 });
    expect(convertRawToConv("충남대학교", "2024", 985, 100, "화학과"))
      .toEqual({ englishConv: 40, gpaConv: 20, indexSum: 60 });
    expect(convertRawToConv("충남대학교", "2024", 985, 100, "수학교육과"))
      .toEqual({ englishConv: 10, gpaConv: 30, indexSum: 40 });
    expect(convertRawToConv("충남대학교", "2024", 985, 100, "회화과(서양화)"))
      .toEqual({ englishConv: null, gpaConv: 20, indexSum: 20 });
  });

  it("uses recent special weights and returns no partial index for arts", () => {
    expect(convertRawToConv("충남대학교", "2025", 990, 100, "국어국문학과"))
      .toEqual({ englishConv: 60, gpaConv: null, indexSum: 60 });
    expect(convertRawToConv("충남대학교", "2025", 990, 100, "컴퓨터융합학부"))
      .toEqual({ englishConv: 20, gpaConv: null, indexSum: 20 });
    expect(convertRawToConv("충남대학교", "2025", 990, 100, "약학과"))
      .toEqual({ englishConv: 50, gpaConv: null, indexSum: 50 });
    expect(convertRawToConv("충남대학교", "2026", 990, 100, "수학교육과"))
      .toEqual({ englishConv: 10, gpaConv: null, indexSum: 10 });
    expect(convertRawToConv("충남대학교", "2026", 990, 100, "음악과(성악)"))
      .toEqual({ englishConv: null, gpaConv: null, indexSum: null });
  });

  it("stores profile-aware TOEIC and GPA reverse calculations", () => {
    expect(recordAt("2024", "화학과")?.최종합격_토익원점수).toBe(801.25);
    expect(recordAt("2024", "컴퓨터융합학부")?.최종합격_토익원점수).toBe(941.5);
    expect(recordAt("2024", "컴퓨터융합학부")?.최종합격_학점원점수_100점만점)
      .toBe(96.5);
    expect(recordAt("2025", "지질환경과학과")?.최종합격_토익원점수).toBe(645);
    expect(recordAt("2025", "컴퓨터융합학부")?.최종합격_토익원점수).toBe(956.75);
    expect(recordAt("2025", "약학과")?.최종합격_토익원점수).toBe(988.6);
    expect(recordAt("2026", "약학과")?.최종합격_토익원점수).toBe(990);
  });

  it("keeps all 260 Chungnam rows selectable", () => {
    expect(standard.filter((record) => record.대학명 === "충남대학교"))
      .toHaveLength(260);
    expect(exceptions.filter((record) => record.대학명 === "충남대학교"))
      .toHaveLength(0);
  });
});
