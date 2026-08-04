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
  (record) => record.대학명 === "충북대학교",
);

function recordAt(year: string, department: string): ScoreRecord {
  const record = records.find((candidate) => (
    candidate.연도 === year && candidate.학과 === department
  ));
  if (record === undefined) throw new Error(`${year} ${department} 저장행이 없다`);
  return record;
}

describe("충북대 공식 편입학 결과 ↔ 저장 데이터", () => {
  it("keeps all 150 official public-score rows by year", () => {
    expect(records).toHaveLength(150);
    expect(Object.fromEntries(
      ["2024", "2025", "2026"].map((year) => [
        year,
        records.filter((record) => record.연도 === year).length,
      ]),
    )).toEqual({ "2024": 57, "2025": 45, "2026": 48 });
  });

  it("marks every published average as a first-admit average", () => {
    expect(records.every((record) => record.합격자기준 === "최초")).toBe(true);
  });

  it("matches the official public-score row counts", () => {
    const english = Object.fromEntries(
      ["2024", "2025", "2026"].map((year) => [
        year,
        records.filter((record) => (
          record.연도 === year
          && record.최종합격_토익환산점수 !== null
        )).length,
      ]),
    );
    const gpa = Object.fromEntries(
      ["2024", "2025", "2026"].map((year) => [
        year,
        records.filter((record) => (
          record.연도 === year
          && record.최종합격_학점환산점수 !== null
        )).length,
      ]),
    );

    expect(english).toEqual({ "2024": 57, "2025": 45, "2026": 48 });
    expect(gpa).toEqual({ "2024": 57, "2025": 45, "2026": 0 });
  });

  it("fills the four missing 2025 electronics and software counts", () => {
    expect(recordAt("2025", "전자공학전공")).toMatchObject({
      모집인원: 7, 지원인원: 52, 합격인원: 7,
    });
    expect(recordAt("2025", "반도체공학전공")).toMatchObject({
      모집인원: 9, 지원인원: 46, 합격인원: 8,
    });
    expect(recordAt("2025", "인공지능전공")).toMatchObject({
      모집인원: 7, 지원인원: 34, 합격인원: 7,
    });
    expect(recordAt("2025", "소프트웨어전공")).toMatchObject({
      모집인원: 7, 지원인원: 48, 합격인원: 7,
    });
  });

  it("keeps representative official counts and converted averages", () => {
    expect(recordAt("2024", "국어국문학과")).toMatchObject({
      모집인원: 5,
      지원인원: 16,
      합격인원: 4,
      최종합격_토익환산점수: 26.6,
      최종합격_학점환산점수: 27.64,
    });
    expect(recordAt("2026", "영어영문학과")).toMatchObject({
      모집인원: 4,
      지원인원: 34,
      합격인원: 3,
      최종합격_토익환산점수: 59,
      최종합격_토익원점수: 947.5,
    });
    expect(recordAt("2026", "물리학과").합격인원).toBeNull();
  });
});
