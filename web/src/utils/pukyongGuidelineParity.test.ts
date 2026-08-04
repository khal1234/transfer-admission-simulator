import { describe, expect, it } from "vitest";
import rawExceptionData from "../data/편입_예외학과_통합.json";
import rawFormulaData from "../data/편입_환산공식_통합.json";
import rawStandardData from "../data/편입_성적_통합.json";

type ScoreRecord = {
  대학명: string;
  연도: string;
  학과: string;
  모집인원: number | null;
  지원인원: number | null;
  합격인원: number | null;
  최종합격_학점환산점수: number | null;
  최종합격_학점원점수_100점만점: number | null;
};

type FormulaRecord = {
  대학명: string;
  연도: string;
  총점: number | null;
  배점: { 공인영어: number | null; 면접구술: number | null; 전적대성적: number | null };
  비고: string;
  전적대성적_환산공식: {
    수식원문: string;
    기본점수?: number | null;
    비례계수?: number | null;
  };
};

const standard = rawStandardData as ScoreRecord[];
const exceptions = rawExceptionData as ScoreRecord[];
const formulas = rawFormulaData as FormulaRecord[];

function getRecord(year: string, department: string): ScoreRecord {
  const record = standard.find((candidate) => (
    candidate.대학명 === "부경대학교"
      && candidate.연도 === year
      && candidate.학과 === department
  ));
  if (record === undefined) throw new Error(`${year} ${department} 저장행이 없다`);
  return record;
}

describe("부경대 모집요강·공식 결과 ↔ 저장 데이터", () => {
  it("stores the corrected GPA formula for all three years", () => {
    const records = formulas.filter((record) => record.대학명 === "부경대학교");
    expect(records).toHaveLength(3);
    for (const record of records) {
      expect(record).toMatchObject({
        총점: 500,
        배점: { 공인영어: 200, 면접구술: 200, 전적대성적: 100 },
        전적대성적_환산공식: {
          수식원문: "전적대학성적점수 = 60 + 0.4 × 백분위",
          기본점수: 60,
          비례계수: 40,
        },
      });
      expect(record.비고).toContain("소수점 다섯째 자리에서 절사");
      expect(record.비고).toContain("패션디자인학과");
    }
  });

  it("derives all 195 raw percentiles from the published converted GPA", () => {
    const rows = standard.filter((record) => (
      record.대학명 === "부경대학교"
        && record.최종합격_학점환산점수 !== null
    ));
    expect(rows).toHaveLength(195);
    for (const record of rows) {
      const converted = record.최종합격_학점환산점수!;
      expect(record.최종합격_학점원점수_100점만점)
        .toBe(Math.round(((converted - 60) / 0.4) * 1000) / 1000);
    }
  });

  it("adds the four 2024 future-convergence units from the official workbook", () => {
    expect(getRecord("2024", "평생교육·상담학전공")).toMatchObject({
      모집인원: 10, 지원인원: 25, 합격인원: null,
    });
    expect(getRecord("2024", "경찰범죄심리학전공")).toMatchObject({
      모집인원: 4, 지원인원: 8, 합격인원: null,
    });
    expect(getRecord("2024", "스마트기계모빌리티전공")).toMatchObject({
      모집인원: 2, 지원인원: 8, 합격인원: null,
    });
    expect(getRecord("2024", "스마트전기전자공학전공")).toMatchObject({
      모집인원: 3, 지원인원: 9, 합격인원: null,
    });
  });

  it("restores practical, future-convergence, and fashion rows", () => {
    for (const year of ["2024", "2025", "2026"]) {
      expect(getRecord(year, "패션디자인학과")).toBeDefined();
      expect(getRecord(year, "해양스포츠전공")).toBeDefined();
      expect(getRecord(year, "시각디자인전공")).toBeDefined();
      expect(getRecord(year, "공업디자인전공")).toBeDefined();
    }
    expect(exceptions.filter((record) => record.대학명 === "부경대학교"))
      .toEqual([]);
  });
});
