import { describe, expect, it } from "vitest";
import rawStandardData from "../data/편입_성적_통합.json";

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
  (record) => record.대학명 === "경북대학교",
);

function recordAt(year: string, department: string): ScoreRecord {
  const record = records.find((candidate) => (
    candidate.연도 === year && candidate.학과 === department
  ));
  if (record === undefined) throw new Error(`${year} ${department} 저장행이 없다`);
  return record;
}

describe("경북대 공식 편입학 결과 ↔ 저장 데이터", () => {
  it("keeps all 254 comparable official result rows by year", () => {
    expect(records).toHaveLength(254);
    expect(Object.fromEntries(
      ["2024", "2025", "2026"].map((year) => [
        year,
        records.filter((record) => record.연도 === year).length,
      ]),
    )).toEqual({ "2024": 76, "2025": 73, "2026": 105 });
  });

  it("marks every published entrant average as final", () => {
    expect(records.every((record) => record.합격자기준 === "최종")).toBe(true);
  });

  it("stores all official public-score rows", () => {
    const publicScores = Object.fromEntries(
      ["2024", "2025", "2026"].map((year) => [
        year,
        records.filter((record) => (
          record.연도 === year
          && record.최종합격_토익환산점수 !== null
          && record.최종합격_학점환산점수 !== null
        )).length,
      ]),
    );
    expect(publicScores).toEqual({ "2024": 76, "2025": 73, "2026": 59 });
  });

  it("fills the six previously omitted reverse-calculated raw values", () => {
    expect(recordAt(
      "2024",
      "농업토목·생물산업공학부(농업토목공학전공)",
    )).toMatchObject({
      최종합격_토익원점수: 714.98,
      최종합격_학점원점수_100점만점: 85.05,
    });
    expect(recordAt(
      "2024",
      "농업토목·생물산업공학부(생물산업기계공학전공)",
    )).toMatchObject({
      최종합격_토익원점수: 518.36,
      최종합격_학점원점수_100점만점: 88,
    });
    expect(recordAt("2025", "생물학과")).toMatchObject({
      최종합격_토익원점수: 876.64,
      최종합격_학점원점수_100점만점: 93.1,
    });
  });

  it("uses the official displayed 2025 biology-education average", () => {
    expect(recordAt("2025", "생물교육과")).toMatchObject({
      최종합격_토익환산점수: 97.48,
      최종합격_토익원점수: 965.05,
    });
  });

  it("keeps representative official counts and averages", () => {
    expect(recordAt("2024", "국어국문학과")).toMatchObject({
      모집인원: 5,
      지원인원: 16,
      합격인원: 5,
      최종합격_토익환산점수: 90.3,
      최종합격_학점환산점수: 48.82,
    });
    expect(recordAt("2025", "경영학부")).toMatchObject({
      모집인원: 18,
      지원인원: 121,
      합격인원: 16,
      최종합격_토익환산점수: 94.85,
      최종합격_학점환산점수: 49.1,
    });
    expect(recordAt("2026", "국어국문학과")).toMatchObject({
      모집인원: 3,
      지원인원: 22,
      합격인원: 3,
      최종합격_토익환산점수: 83.84,
      최종합격_학점환산점수: 49.45,
    });
  });
});
