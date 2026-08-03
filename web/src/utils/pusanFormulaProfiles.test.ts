import { describe, expect, it } from "vitest";
import rawExceptionData from "../data/편입_예외학과_통합.json";
import rawStandardData from "../data/편입_성적_통합.json";
import { convertRawToConv } from "./converter";
import {
  getPusanAdmissionProfile,
  type PusanAdmissionProfileId,
} from "./pusanFormulaProfiles";

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
    if (record.대학명 !== "부산대학교" || record.연도 !== year) continue;
    const profile = getPusanAdmissionProfile(year, record.학과);
    if (profile === null) throw new Error(`${year} ${record.학과} 공식이 없다`);
    counts[profile.id] = (counts[profile.id] ?? 0) + 1;
  }
  return counts;
}

describe("부산대학교 학과별 전형 프로필", () => {
  it("matches every 2024 result row to the official six structures", () => {
    expect(profileCounts("2024")).toEqual({
      interview: 26,
      "document-interview": 17,
      written: 36,
      sports: 1,
      practical: 6,
      "biomedical-written": 3,
    });
  });

  it("matches every 2025 result row to the official three regular structures", () => {
    expect(profileCounts("2025")).toEqual({
      interview: 42,
      "document-interview": 15,
      practical: 2,
    });
  });

  it("matches every 2026 result row to the official three structures", () => {
    expect(profileCounts("2026")).toEqual({
      interview: 57,
      "document-interview": 24,
      practical: 7,
    });
  });

  it.each<[string, string, PusanAdmissionProfileId]>([
    ["2024", "기계공학부", "written"],
    ["2024", "스포츠과학과", "sports"],
    ["2024", "정보컴퓨터공학부", "biomedical-written"],
    ["2024", "디자인학과(시각디자인전공)", "interview"],
    ["2025", "디자인학과(애니메이션전공)", "document-interview"],
    ["2025", "조형학과(도예전공)", "practical"],
    ["2025", "발전공학과", "contract"],
    ["2026", "약학부", "document-interview"],
    ["2026", "음악학과(작곡전공)", "practical"],
  ])("applies %s %s as %s", (year, department, profileId) => {
    expect(getPusanAdmissionProfile(year, department)?.id).toBe(profileId);
  });

  it("uses each selected department's English and GPA weights", () => {
    expect(convertRawToConv("부산대학교", "2024", 990, 100, "기계공학부"))
      .toEqual({ englishConv: 30, gpaConv: 20, indexSum: 50 });
    expect(convertRawToConv("부산대학교", "2024", 990, 100, "정보컴퓨터공학부"))
      .toEqual({ englishConv: 20, gpaConv: 20, indexSum: 40 });
    expect(convertRawToConv("부산대학교", "2026", 990, 100, "음악학과(작곡전공)"))
      .toEqual({ englishConv: 30, gpaConv: 20, indexSum: 50 });
    expect(convertRawToConv("부산대학교", "2026", 990, 100, "약학부"))
      .toEqual({ englishConv: 30, gpaConv: 30, indexSum: 60 });
  });

  it("calculates the 2025 contract department without requiring TOEIC", () => {
    expect(convertRawToConv("부산대학교", "2025", null, 100, "발전공학과"))
      .toEqual({ englishConv: null, gpaConv: 30, indexSum: 30 });
  });

  it("keeps all 236 Pusan result rows selectable after formula support", () => {
    expect(standard.filter((record) => record.대학명 === "부산대학교"))
      .toHaveLength(236);
    expect(exceptions.filter((record) => record.대학명 === "부산대학교"))
      .toHaveLength(0);
  });
});
