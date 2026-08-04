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
  (record) => record.대학명 === "강원대학교",
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

describe("강원대 공식 편입학 결과 ↔ 저장 데이터", () => {
  it("keeps all 256 recruited general-transfer rows by year", () => {
    expect(records).toHaveLength(256);
    expect(Object.fromEntries(
      ["2024", "2025", "2026"].map((year) => [
        year,
        records.filter((record) => record.연도 === year).length,
      ]),
    )).toEqual({ "2024": 85, "2025": 86, "2026": 85 });
  });

  it("marks every published average as a first-admit average", () => {
    expect(records.every((record) => record.합격자기준 === "최초")).toBe(true);
  });

  it("matches every official public-field count", () => {
    expect({
      recruit: publicCount("2024", "모집인원"),
      applied: publicCount("2024", "지원인원"),
      enrolled: publicCount("2024", "합격인원"),
      englishConv: publicCount("2024", "최종합격_토익환산점수"),
      englishRaw: publicCount("2024", "최종합격_토익원점수"),
      gpaConv: publicCount("2024", "최종합격_학점환산점수"),
      gpaRaw: publicCount("2024", "최종합격_학점원점수_100점만점"),
    }).toEqual({
      recruit: 85, applied: 85, enrolled: 85,
      englishConv: 65, englishRaw: 65, gpaConv: 65, gpaRaw: 65,
    });
    expect({
      recruit: publicCount("2025", "모집인원"),
      applied: publicCount("2025", "지원인원"),
      enrolled: publicCount("2025", "합격인원"),
      englishConv: publicCount("2025", "최종합격_토익환산점수"),
      englishRaw: publicCount("2025", "최종합격_토익원점수"),
      gpaConv: publicCount("2025", "최종합격_학점환산점수"),
      gpaRaw: publicCount("2025", "최종합격_학점원점수_100점만점"),
    }).toEqual({
      recruit: 86, applied: 84, enrolled: 74,
      englishConv: 59, englishRaw: 59, gpaConv: 58, gpaRaw: 58,
    });
    expect({
      recruit: publicCount("2026", "모집인원"),
      applied: publicCount("2026", "지원인원"),
      enrolled: publicCount("2026", "합격인원"),
      englishConv: publicCount("2026", "최종합격_토익환산점수"),
      englishRaw: publicCount("2026", "최종합격_토익원점수"),
      gpaConv: publicCount("2026", "최종합격_학점환산점수"),
      gpaRaw: publicCount("2026", "최종합격_학점원점수_100점만점"),
    }).toEqual({
      recruit: 85, applied: 85, enrolled: 85,
      englishConv: 0, englishRaw: 64, gpaConv: 0, gpaRaw: 2,
    });
  });

  it("matches representative official counts and averages", () => {
    expect(recordAt("2024", "경영·회계학부(경영학전공)")).toMatchObject({
      모집인원: 19,
      지원인원: 64,
      합격인원: 18,
      최종합격_토익환산점수: 83.76,
      최종합격_토익원점수: 829.22,
      최종합격_학점환산점수: 68.59,
      최종합격_학점원점수_100점만점: 91.45,
    });
    expect(recordAt("2025", "간호학과")).toMatchObject({
      모집인원: 7,
      지원인원: 64,
      합격인원: 7,
      최종합격_토익환산점수: 70.83,
      최종합격_토익원점수: 934.96,
      최종합격_학점환산점수: 70.75,
      최종합격_학점원점수_100점만점: 94.33,
    });
    expect(recordAt("2026", "생태조경디자인학과")).toMatchObject({
      모집인원: 5,
      지원인원: 8,
      합격인원: 4,
      최종합격_토익원점수: 724.01,
      최종합격_학점원점수_100점만점: 87.74,
    });
  });

  it("applies the verified profile to official raw averages", () => {
    expect(convertRawToConv(
      "강원대학교", "2024", 829.22, 91.45, "경영·회계학부(경영학전공)",
    )).toEqual({ englishConv: 83.76, gpaConv: 68.59, indexSum: 152.35 });
    expect(convertRawToConv(
      "강원대학교", "2025", 934.96, 94.33, "간호학과",
    )).toEqual({ englishConv: 70.83, gpaConv: 70.75, indexSum: 141.58 });
    expect(convertRawToConv(
      "강원대학교", "2026", 724.01, 87.74, "생태조경디자인학과",
    )).toEqual({ englishConv: 73.13, gpaConv: 43.87, indexSum: 117 });
  });
});
