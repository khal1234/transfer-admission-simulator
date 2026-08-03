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
  공인영어_환산공식: { 수식원문: string };
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
    record.대학명 === "충남대학교"
      && record.연도 === year
      && record.학과 === department
  ));
}

describe("충남대 모집요강 ↔ 저장 데이터 분류", () => {
  it.each(["한문학과", "화학과", "생물과학과"])(
    "keeps 2025 %s in the standard 60+40 group",
    (department) => {
      expect(hasRecord(standard, "2025", department)).toBe(true);
      expect(hasRecord(exceptions, "2025", department)).toBe(false);
    },
  );

  it("keeps 2026 mathematics education selectable with its 10+60+30 profile", () => {
    expect(hasRecord(standard, "2026", "수학교육과")).toBe(true);
    expect(hasRecord(exceptions, "2026", "수학교육과")).toBe(false);
  });

  it("restores arts and dance departments after their practical profiles are supported", () => {
    const specialPrefixes = [
      "무용학과",
      "음악과",
      "관현악과",
      "회화과",
      "조소과",
      "디자인창의학과",
    ];
    const supported = standard.filter((record) => (
      record.대학명 === "충남대학교"
        && specialPrefixes.some((prefix) => record.학과.startsWith(prefix))
    ));
    const remainingExceptions = exceptions.filter((record) => (
      record.대학명 === "충남대학교"
        && specialPrefixes.some((prefix) => record.학과.startsWith(prefix))
    ));

    expect(supported).toHaveLength(31);
    expect(remainingExceptions).toEqual([]);
  });

  it("stores the corrected recent TOEIC lookup description", () => {
    for (const year of ["2025", "2026"]) {
      const record = formulas.find((candidate) => (
        candidate.대학명 === "충남대학교" && candidate.연도 === year
      ));

      expect(record?.공인영어_환산공식.수식원문).toContain("990=60점");
      expect(record?.공인영어_환산공식.수식원문).toContain("780~790=36점");
      expect(record?.공인영어_환산공식.수식원문).not.toContain("981~990점은 60점");
    }
  });
});
