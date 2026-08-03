import { describe, expect, it } from "vitest";
import rawExceptionData from "../data/편입_예외학과_통합.json";
import rawStandardData from "../data/편입_성적_통합.json";
import { convertRawToConv } from "./converter";
import {
  getKyungbukAdmissionProfile,
  type KyungbukAdmissionProfileId,
} from "./kyungbukFormulaProfiles";

type ScoreRecord = {
  대학명: string;
  연도: string;
  학과: string;
  최종합격_토익원점수: number | null;
};

const standard = rawStandardData as ScoreRecord[];
const exceptions = rawExceptionData as ScoreRecord[];

function profileCounts(year: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const record of standard) {
    if (record.대학명 !== "경북대학교" || record.연도 !== year) continue;
    const profile = getKyungbukAdmissionProfile(year, record.학과);
    if (profile === null) throw new Error(`${year} ${record.학과} 공식이 없다`);
    counts[profile.id] = (counts[profile.id] ?? 0) + 1;
  }
  return counts;
}

function toeicRaw(year: string, department: string): number | null | undefined {
  return standard.find((record) => (
    record.대학명 === "경북대학교"
    && record.연도 === year
    && record.학과 === department
  ))?.최종합격_토익원점수;
}

describe("경북대학교 학과별 전형 프로필", () => {
  it("matches every 2024 result row to general, arts, or sports", () => {
    expect(profileCounts("2024")).toEqual({
      general: 74,
      arts: 1,
      sports: 1,
    });
  });

  it("matches every 2025 result row to general, arts, or sports", () => {
    expect(profileCounts("2025")).toEqual({
      general: 70,
      sports: 2,
      arts: 1,
    });
  });

  it("matches every 2026 result row to general, arts, or sports", () => {
    expect(profileCounts("2026")).toEqual({
      general: 98,
      arts: 4,
      sports: 3,
    });
  });

  it.each<[string, string, KyungbukAdmissionProfileId]>([
    ["2024", "경영학부", "general"],
    ["2024", "디자인학과", "arts"],
    ["2024", "체육학부(체육학전공)", "sports"],
    ["2025", "체육교육과", "sports"],
    ["2026", "성악전공", "arts"],
    ["2026", "기악전공(가야금)", "arts"],
    ["2026", "한국화전공", "arts"],
    ["2026", "체육학부(건강운동관리전공)", "sports"],
  ])("applies %s %s as %s", (year, department, profileId) => {
    expect(getKyungbukAdmissionProfile(year, department)?.id).toBe(profileId);
  });

  it("uses 100 English points for general and 50 for arts and sports", () => {
    expect(convertRawToConv("경북대학교", "2026", 990, 100, "경영학부"))
      .toEqual({ englishConv: 100, gpaConv: 50, indexSum: 150 });
    expect(convertRawToConv("경북대학교", "2026", 990, 100, "디자인학과"))
      .toEqual({ englishConv: 50, gpaConv: 50, indexSum: 100 });
    expect(convertRawToConv("경북대학교", "2026", 990, 100, "체육교육과"))
      .toEqual({ englishConv: 50, gpaConv: 50, indexSum: 100 });
  });

  it("stores all eight TOEIC reverse-calculation corrections", () => {
    expect(toeicRaw("2024", "디자인학과")).toBe(732.4);
    expect(toeicRaw("2024", "체육학부(체육학전공)")).toBe(330.07);
    expect(toeicRaw("2025", "체육교육과")).toBe(842.49);
    expect(toeicRaw("2025", "디자인학과")).toBe(558.76);
    expect(toeicRaw("2025", "체육학부(체육학전공)")).toBe(256.61);
    expect(toeicRaw("2026", "체육교육과")).toBe(792.59);
    expect(toeicRaw("2026", "체육학부(건강운동관리전공)")).toBe(432.63);
    expect(toeicRaw("2026", "디자인학과")).toBe(811.8);
  });

  it("keeps all 254 KNU result rows selectable after formula support", () => {
    expect(standard.filter((record) => record.대학명 === "경북대학교"))
      .toHaveLength(254);
    expect(exceptions.filter((record) => record.대학명 === "경북대학교"))
      .toHaveLength(0);
  });
});
