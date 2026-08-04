import { describe, expect, it } from "vitest";
import rawExceptionData from "../data/편입_예외학과_통합.json";
import rawFormulaData from "../data/편입_환산공식_통합.json";
import rawStandardData from "../data/편입_성적_통합.json";

type ScoreRecord = {
  대학명: string;
  연도: string;
  학과: string;
  학과_원본명: string;
  최종합격_학점환산점수: number | null;
  최종합격_학점원점수_100점만점: number | null;
  비고?: string | null;
};

const standard = rawStandardData as ScoreRecord[];
const exceptions = rawExceptionData as ScoreRecord[];

function getRecord(year: string, department: string): ScoreRecord {
  const record = standard.find((candidate) => (
    candidate.대학명 === "강원대학교"
      && candidate.연도 === year
      && candidate.학과 === department
  ));
  if (record === undefined) throw new Error(`${year} ${department} 저장행이 없다`);
  return record;
}

describe("강원대 모집요강·공식 결과 ↔ 저장 데이터", () => {
  it("records each year's verified representative formula", () => {
    const formulas = rawFormulaData.filter((record) => record.대학명 === "강원대학교");
    expect(formulas).toHaveLength(3);
    for (const record of formulas) {
      expect(record.비고).toContain(`${record.연도}학년도 모집요강 PDF`);
      expect(record.비고).toContain("음악");
      expect(record.비고).toContain("생태조경디자인");
    }
    expect(formulas.find((record) => record.연도 === "2024")?.배점)
      .toEqual({ 공인영어: 100, 면접구술: 75, 전적대성적: 75 });
    expect(formulas.find((record) => record.연도 === "2026")?.배점)
      .toEqual({ 공인영어: 150, 면접구술: 100, 전적대성적: null });
  });

  it("removes interview and practical scores from the GPA fields", () => {
    const expectedNotes: Record<string, string> = {
      디자인학과: "면접 88.89점, 실기 134.11점",
      무용학과: "면접 79.59점, 실기 141.00점",
      스포츠과학과: "면접 94.00점, 실기 131.33점",
      수의학과: "면접 84.39점",
    };
    for (const [department, note] of Object.entries(expectedNotes)) {
      const record = getRecord("2026", department);
      expect(record.최종합격_학점환산점수).toBeNull();
      expect(record.최종합격_학점원점수_100점만점).toBeNull();
      expect(record.비고).toContain(note);
    }
  });

  it("uses the official 5-year architecture name in all three years", () => {
    for (const year of ["2024", "2025", "2026"]) {
      expect(getRecord(year, "건축학과(5년제)").학과_원본명)
        .toBe("건축학과(5년제)");
    }
    expect(standard.some((record) => record.학과 === "건축학과(오년제)"))
      .toBe(false);
  });

  it("removes the stale 2026 estimated-formula note", () => {
    const stale = standard.filter((record) => (
      record.대학명 === "강원대학교"
        && String(record.비고 ?? "").includes("이미지 형태라 확인 불가")
    ));
    expect(stale).toEqual([]);
  });

  it("restores all supported special departments", () => {
    for (const year of ["2024", "2025", "2026"]) {
      expect(getRecord(year, "음악학과")).toBeDefined();
    }
    expect(getRecord("2025", "스마트팜농산업학과")).toBeDefined();
    expect(getRecord("2026", "생태조경디자인학과")).toBeDefined();
    expect(exceptions.filter((record) => record.대학명 === "강원대학교"))
      .toEqual([]);
  });
});
