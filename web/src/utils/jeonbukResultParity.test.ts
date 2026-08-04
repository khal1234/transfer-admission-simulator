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
  최종합격_토익원점수: number | null;
  최종합격_학점원점수_100점만점: number | null;
  합격자기준?: "최초" | "최종" | "확인불가";
};

const records = (rawStandardData as ScoreRecord[]).filter(
  (record) => record.대학명 === "전북대학교",
);

function recordAt(year: string, department: string): ScoreRecord {
  const record = records.find((candidate) => (
    candidate.연도 === year && candidate.학과 === department
  ));
  if (record === undefined) throw new Error(`${year} ${department} 저장행이 없다`);
  return record;
}

describe("전북대 공식 편입학 결과 ↔ 저장 데이터", () => {
  it("keeps all 265 official general-transfer rows by year", () => {
    expect(records).toHaveLength(265);
    expect(Object.fromEntries(
      ["2024", "2025", "2026"].map((year) => [
        year,
        records.filter((record) => record.연도 === year).length,
      ]),
    )).toEqual({ "2024": 87, "2025": 89, "2026": 89 });
  });

  it("marks every published average as a final-enrollee average", () => {
    expect(records.every((record) => record.합격자기준 === "최종")).toBe(true);
  });

  it("matches the official public-score row counts", () => {
    const english = Object.fromEntries(
      ["2024", "2025", "2026"].map((year) => [
        year,
        records.filter((record) => (
          record.연도 === year && record.최종합격_토익원점수 !== null
        )).length,
      ]),
    );
    const gpa = Object.fromEntries(
      ["2024", "2025", "2026"].map((year) => [
        year,
        records.filter((record) => (
          record.연도 === year
          && record.최종합격_학점원점수_100점만점 !== null
        )).length,
      ]),
    );

    expect(english).toEqual({ "2024": 68, "2025": 67, "2026": 65 });
    expect(gpa).toEqual({ "2024": 70, "2025": 69, "2026": 67 });
  });

  it("matches representative official counts and raw averages", () => {
    expect(recordAt("2024", "건축공학과")).toMatchObject({
      모집인원: 9,
      지원인원: 26,
      합격인원: 9,
      최종합격_토익원점수: 722.22,
      최종합격_학점원점수_100점만점: 90.61,
    });
    expect(recordAt("2025", "경영학과")).toMatchObject({
      모집인원: 20,
      지원인원: 70,
      합격인원: 19,
      최종합격_토익원점수: 738.16,
      최종합격_학점원점수_100점만점: 91.93,
    });
    expect(recordAt("2026", "아동학과")).toMatchObject({
      모집인원: 2,
      지원인원: 8,
      합격인원: 2,
      최종합격_토익원점수: 765,
      최종합격_학점원점수_100점만점: 88.92,
    });
  });

  it("applies the verified yearly formula to official averages", () => {
    expect(convertRawToConv(
      "전북대학교", "2024", 722.22, 90.61, "건축공학과",
    )).toEqual({ englishConv: 58.18, gpaConv: 54.37, indexSum: 112.55 });
    expect(convertRawToConv(
      "전북대학교", "2025", 738.16, 91.93, "경영학과",
    )).toEqual({ englishConv: 59.4, gpaConv: 55.16, indexSum: 114.56 });
    expect(convertRawToConv(
      "전북대학교", "2026", 765, 88.92, "아동학과",
    )).toEqual({ englishConv: 61.82, gpaConv: 53.35, indexSum: 115.17 });
  });
});
