import { describe, expect, it } from "vitest";
import rawStandardData from "../data/편입_성적_통합.json";
import {
  calculateAcceptedScoreBreakdown,
  type DepartmentRecord,
} from "./converter";

const records = (rawStandardData as DepartmentRecord[]).filter(
  (record) => record.대학명 === "인천대학교",
);

function recordAt(year: string, department: string): DepartmentRecord {
  const record = records.find((candidate) => (
    candidate.연도 === year && candidate.학과 === department
  ));
  if (record === undefined) throw new Error(`${year} ${department} 저장행이 없다`);
  return record;
}

describe("인천대 공식 편입학 결과 ↔ 저장 데이터", () => {
  it("keeps all 154 official general-transfer rows by year", () => {
    expect(records).toHaveLength(154);
    expect(Object.fromEntries(
      ["2024", "2025", "2026"].map((year) => [
        year,
        records.filter((record) => record.연도 === year).length,
      ]),
    )).toEqual({ "2024": 53, "2025": 49, "2026": 52 });
  });

  it("keeps the official public TOEIC-average counts", () => {
    expect(Object.fromEntries(
      ["2024", "2025", "2026"].map((year) => [
        year,
        records.filter((record) => (
          record.연도 === year
          && record.최종합격_토익원점수 !== null
        )).length,
      ]),
    )).toEqual({ "2024": 45, "2025": 46, "2026": 47 });
  });

  it("stores final-admit raw TOEIC averages without inventing unpublished fields", () => {
    expect(records.every((record) => record.합격자기준 === "최종")).toBe(true);
    expect(records.every((record) => record.모집인원 !== null)).toBe(true);
    expect(records.every((record) => record.지원인원 !== null)).toBe(true);
    expect(records.every((record) => record.합격인원 === null)).toBe(true);
    expect(records.every(
      (record) => record.최종합격_토익환산점수 === null,
    )).toBe(true);
    expect(records.every(
      (record) => record.최종합격_학점환산점수 === null
        && record.최종합격_학점원점수_100점만점 === null,
    )).toBe(true);
  });

  it("matches representative official counts and TOEIC averages", () => {
    expect(recordAt("2024", "영어영문학과")).toMatchObject({
      모집인원: 8, 지원인원: 33, 최종합격_토익원점수: 899,
    });
    expect(recordAt("2025", "국어국문학과")).toMatchObject({
      모집인원: 5, 지원인원: 33, 최종합격_토익원점수: 734,
    });
    expect(recordAt("2025", "운동건강학부")).toMatchObject({
      모집인원: 5, 지원인원: 20, 최종합격_토익원점수: 735,
    });
    expect(recordAt("2026", "영어영문학과")).toMatchObject({
      모집인원: 10, 지원인원: 63, 최종합격_토익원점수: 937.5,
    });
    expect(recordAt("2026", "디자인학부")).toMatchObject({
      모집인원: 6, 지원인원: 41, 최종합격_토익원점수: 882.5,
    });
  });

  it("applies the saved yearly and department formulas to official averages", () => {
    expect(calculateAcceptedScoreBreakdown(
      recordAt("2024", "영어영문학과"),
    )).toEqual({ englishConv: 114.48, gpaConv: null, indexSum: 114.48 });
    expect(calculateAcceptedScoreBreakdown(
      recordAt("2025", "운동건강학부"),
    )).toEqual({ englishConv: 44.55, gpaConv: null, indexSum: 44.55 });
    expect(calculateAcceptedScoreBreakdown(
      recordAt("2026", "디자인학부"),
    )).toEqual({ englishConv: 113.48, gpaConv: null, indexSum: 113.48 });
  });
});
