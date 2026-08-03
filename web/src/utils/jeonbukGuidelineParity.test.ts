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
  비고: string;
  공인영어_환산공식: { 수식원문: string };
};

const standard = rawStandardData as ScoreRecord[];
const exceptions = rawExceptionData as ScoreRecord[];
const formulas = rawFormulaData as FormulaRecord[];

const SPECIAL_PROFILE_ROWS = [
  ["2024", "산업디자인학과"],
  ["2024", "스포츠과학과"],
  ["2024", "한국음악학과"],
  ["2025", "산업디자인학과"],
  ["2025", "치의학과"],
  ["2026", "산업디자인학과"],
  ["2026", "스포츠과학과"],
  ["2026", "치의학과"],
  ["2026", "한국음악학과"],
] as const;

function findRecord(
  records: ScoreRecord[],
  year: string,
  department: string,
): ScoreRecord | undefined {
  return records.find((record) => (
    record.대학명 === "전북대학교"
      && record.연도 === year
      && record.학과 === department
  ));
}

describe("전북대 모집요강 ↔ 저장 데이터 분류", () => {
  it.each(SPECIAL_PROFILE_ROWS)(
    "keeps %s %s selectable with its department profile",
    (year, department) => {
      expect(findRecord(standard, year, department)).toBeTruthy();
      expect(findRecord(exceptions, year, department)).toBeUndefined();
    },
  );

  it("leaves no Jeonbuk rows in the unsupported exception dataset", () => {
    expect(exceptions.filter((record) => record.대학명 === "전북대학교"))
      .toEqual([]);
  });

  it("stores official page evidence for all three formula records", () => {
    const expectedPages = {
      "2024": ["PDF 24쪽", "PDF 43~46쪽"],
      "2025": ["PDF 28쪽", "PDF 54~57쪽"],
      "2026": ["PDF 25쪽", "PDF 50~53쪽"],
    } as const;

    for (const [year, pageLabels] of Object.entries(expectedPages)) {
      const record = formulas.find((candidate) => (
        candidate.대학명 === "전북대학교" && candidate.연도 === year
      ));
      expect(record?.비고).not.toMatch(/미확보|가정/);
      expect(record?.공인영어_환산공식.수식원문).toContain("2024~2026 동일 표");
      for (const pageLabel of pageLabels) {
        expect(record?.비고).toContain(pageLabel);
      }
    }
  });
});
