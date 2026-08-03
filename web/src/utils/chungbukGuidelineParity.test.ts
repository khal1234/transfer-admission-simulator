import { describe, expect, it } from "vitest";
import rawExceptionData from "../data/편입_예외학과_통합.json";
import rawFormulaData from "../data/편입_환산공식_통합.json";
import rawStandardData from "../data/편입_성적_통합.json";

type ScoreRecord = {
  대학명: string;
  연도: string;
  학과: string;
  제거사유?: string;
};

type FormulaRecord = {
  대학명: string;
  연도: string;
  총점: number | null;
  배점: {
    공인영어: number | null;
    면접구술: number | null;
    전적대성적: number | null;
  };
  전적대성적_환산공식: { 학점기준설명: string };
};

const standard = rawStandardData as ScoreRecord[];
const exceptions = rawExceptionData as ScoreRecord[];
const formulas = rawFormulaData as FormulaRecord[];

function hasRecord(
  records: ScoreRecord[],
  year: string,
  department: string,
): boolean {
  return records.some((record) => (
    record.대학명 === "충북대학교"
      && record.연도 === year
      && record.학과 === department
  ));
}

function getFormula(year: string): FormulaRecord | undefined {
  return formulas.find((record) => (
    record.대학명 === "충북대학교" && record.연도 === year
  ));
}

describe("충북대 모집요강 ↔ 저장 데이터 2차 대조", () => {
  it.each(["2024", "2026"])(
    "keeps %s architecture selectable with its practical-test profile",
    (year) => {
      expect(hasRecord(standard, year, "건축학과")).toBe(true);
      expect(hasRecord(exceptions, year, "건축학과")).toBe(false);
    },
  );

  it("keeps 2026 pharmacy in the standard 60+40 group", () => {
    for (const department of ["약학과", "제약학과"]) {
      expect(hasRecord(standard, "2026", department)).toBe(true);
      expect(hasRecord(exceptions, "2026", department)).toBe(false);
    }
  });

  it("stores the verified standard score breakdowns", () => {
    expect(getFormula("2024")).toMatchObject({
      총점: 100,
      배점: { 공인영어: 30, 면접구술: 40, 전적대성적: 30 },
    });
    expect(getFormula("2025")).toMatchObject({
      총점: 100,
      배점: { 공인영어: 30, 면접구술: 40, 전적대성적: 30 },
    });
    expect(getFormula("2026")).toMatchObject({
      총점: 100,
      배점: { 공인영어: 60, 면접구술: 40, 전적대성적: null },
    });
  });

  it("leaves no Chungbuk rows in the unsupported exception dataset", () => {
    expect(exceptions.filter((record) => record.대학명 === "충북대학교"))
      .toEqual([]);
  });

  it("documents the multi-university weighted GPA rule", () => {
    for (const year of ["2024", "2025"]) {
      const description = getFormula(year)?.전적대성적_환산공식.학점기준설명;
      expect(description).toContain("전적대 2곳 이상");
      expect(description).toContain("백분율점수 × 해당 대학 취득학점");
    }

    const description = getFormula("2026")?.전적대성적_환산공식.학점기준설명;
    expect(description).toContain("총점에는 미반영");
    expect(description).toContain("최종 동점자 판단");
    expect(description).toContain("전적대 2곳 이상");
  });
});
