import { describe, expect, it } from "vitest";
import rawStandardData from "../data/편입_성적_통합.json";

type ScoreRecord = {
  대학명: string;
  연도: string;
  학과: string;
  최종합격_토익환산점수: number | null;
  최종합격_토익원점수: number | null;
  최종합격_학점환산점수: number | null;
  최종합격_학점원점수_100점만점: number | null;
  합격자기준?: "최초" | "최종" | "확인불가";
};

const records = (rawStandardData as ScoreRecord[]).filter(
  (record) => record.대학명 === "충남대학교",
);

function recordAt(year: string, department: string): ScoreRecord {
  const record = records.find((candidate) => (
    candidate.연도 === year && candidate.학과 === department
  ));
  if (record === undefined) throw new Error(`${year} ${department} 저장행이 없다`);
  return record;
}

describe("충남대 공식 편입학 결과 ↔ 저장 데이터", () => {
  it("keeps all 260 comparable stored rows by year", () => {
    expect(records).toHaveLength(260);
    expect(Object.fromEntries(
      ["2024", "2025", "2026"].map((year) => [
        year,
        records.filter((record) => record.연도 === year).length,
      ]),
    )).toEqual({ "2024": 82, "2025": 83, "2026": 95 });
  });

  it("marks every published average as a first-admit average", () => {
    expect(records.every((record) => record.합격자기준 === "최초")).toBe(true);
  });

  it("contains every officially published public-score row", () => {
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

    expect(english).toEqual({ "2024": 58, "2025": 57, "2026": 54 });
    expect(gpa).toEqual({ "2024": 59, "2025": 0, "2026": 0 });
  });

  it("uses Excel's displayed 2025 environmental-engineering average", () => {
    expect(recordAt("2025", "환경공학과")).toMatchObject({
      최종합격_토익환산점수: 40.28,
      최종합격_토익원점수: 825.67,
    });
  });

  it("keeps representative official converted averages", () => {
    expect(recordAt("2024", "국어국문학과")).toMatchObject({
      최종합격_토익환산점수: 43.07,
      최종합격_학점환산점수: 9.04,
      최종합격_학점원점수_100점만점: 90.4,
    });
    expect(recordAt("2025", "국제학부")).toMatchObject({
      최종합격_토익환산점수: 46.6,
    });
    expect(recordAt("2026", "국어국문학과")).toMatchObject({
      최종합격_토익환산점수: 48.6,
    });
  });
});
