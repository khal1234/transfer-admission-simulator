import { describe, expect, it } from "vitest";
import rawStandardData from "../data/편입_성적_통합.json";
import { convertRawToConv } from "./converter";

type ScoreRecord = {
  대학명: string;
  연도: string;
  학과: string;
  모집인원: number | null;
  지원인원: number | null;
  합격인원: number | null;
  최종합격_토익환산점수: number | null;
  최종합격_토익원점수: number | null;
  최종합격_학점환산점수: number | null;
  최종합격_학점원점수_100점만점: number | null;
  합격자기준?: "최초" | "최종" | "확인불가";
};

const records = (rawStandardData as ScoreRecord[]).filter(
  (record) => record.대학명 === "부경대학교",
);

function recordAt(year: string, department: string): ScoreRecord {
  const record = records.find((candidate) => (
    candidate.연도 === year && candidate.학과 === department
  ));
  if (record === undefined) throw new Error(`${year} ${department} 저장행이 없다`);
  return record;
}

function publicCount(year: string, field: keyof ScoreRecord): number {
  return records.filter((record) => (
    record.연도 === year && record[field] !== null
  )).length;
}

describe("부경대 공식 편입학 결과 ↔ 저장 데이터", () => {
  it("keeps all 236 official support rows by year", () => {
    expect(records).toHaveLength(236);
    expect(Object.fromEntries(
      ["2024", "2025", "2026"].map((year) => [
        year,
        records.filter((record) => record.연도 === year).length,
      ]),
    )).toEqual({ "2024": 77, "2025": 77, "2026": 82 });
  });

  it("preserves the official final-enrollee criterion and 2024 exclusions", () => {
    expect(records.filter((record) => record.합격자기준 === "최종"))
      .toHaveLength(232);
    expect(records.filter((record) => record.합격자기준 === "확인불가"))
      .toHaveLength(4);
  });

  it.each([
    ["2024", [77, 77, 73, 60, 60, 60, 60]],
    ["2025", [77, 77, 77, 65, 65, 69, 69]],
    ["2026", [82, 82, 82, 65, 65, 66, 66]],
  ] as const)("matches every %s official public-field count", (year, expected) => {
    expect([
      publicCount(year, "모집인원"),
      publicCount(year, "지원인원"),
      publicCount(year, "합격인원"),
      publicCount(year, "최종합격_토익환산점수"),
      publicCount(year, "최종합격_토익원점수"),
      publicCount(year, "최종합격_학점환산점수"),
      publicCount(year, "최종합격_학점원점수_100점만점"),
    ]).toEqual(expected);
  });

  it("matches representative official counts and averages", () => {
    expect(recordAt("2024", "국어국문학과")).toMatchObject({
      모집인원: 3, 지원인원: 14, 합격인원: 3,
      최종합격_토익환산점수: 152.19,
      최종합격_토익원점수: 753.33,
      최종합격_학점환산점수: 97.71,
      최종합격_학점원점수_100점만점: 94.275,
    });
    expect(recordAt("2025", "경영학전공")).toMatchObject({
      모집인원: 11, 지원인원: 87, 합격인원: 11,
      최종합격_토익환산점수: 191.09,
      최종합격_토익원점수: 945.91,
      최종합격_학점환산점수: 97.66,
      최종합격_학점원점수_100점만점: 94.15,
    });
    expect(recordAt("2026", "패션디자인학과")).toMatchObject({
      모집인원: 5, 지원인원: 21, 합격인원: 4,
      최종합격_토익환산점수: 179.55,
      최종합격_토익원점수: 888.75,
      최종합격_학점환산점수: 94.57,
      최종합격_학점원점수_100점만점: 86.425,
    });
  });

  it("applies the verified profile to official raw averages", () => {
    expect(convertRawToConv(
      "부경대학교", "2024", 753.33, 94.275, "국어국문학과",
    )).toEqual({ englishConv: 152.1878, gpaConv: 97.71, indexSum: 249.8978 });
    expect(convertRawToConv(
      "부경대학교", "2025", 945.91, 94.15, "경영학전공",
    )).toEqual({ englishConv: 191.0929, gpaConv: 97.66, indexSum: 288.7529 });
    expect(convertRawToConv(
      "부경대학교", "2026", 888.75, 86.425, "패션디자인학과",
    )).toEqual({ englishConv: 179.5454, gpaConv: 94.57, indexSum: 274.1154 });
  });
});
