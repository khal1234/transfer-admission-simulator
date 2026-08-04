import { describe, expect, it } from "vitest";
import rawExceptionData from "../data/편입_예외학과_통합.json";
import rawFormulaData from "../data/편입_환산공식_통합.json";
import rawStandardData from "../data/편입_성적_통합.json";
import { getConversionFormula } from "./formulaRegistry";

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

type FormulaRecord = {
  대학명: string;
  연도: string;
};

const records = rawStandardData as ScoreRecord[];
const formulas = rawFormulaData as FormulaRecord[];

const EXPECTED_ROWS: Record<string, Record<string, number>> = {
  강원대학교: { "2024": 85, "2025": 86, "2026": 85 },
  경북대학교: { "2024": 76, "2025": 73, "2026": 105 },
  부경대학교: { "2024": 77, "2025": 77, "2026": 82 },
  부산대학교: { "2024": 89, "2025": 59, "2026": 88 },
  인천대학교: { "2024": 53, "2025": 49, "2026": 52 },
  전남대학교: { "2024": 129, "2025": 129, "2026": 125 },
  전북대학교: { "2024": 87, "2025": 89, "2026": 89 },
  충남대학교: { "2024": 82, "2025": 83, "2026": 95 },
  충북대학교: { "2024": 57, "2025": 45, "2026": 48 },
};

const EXPECTED_CRITERION: Record<string, "최초" | "최종"> = {
  강원대학교: "최초",
  경북대학교: "최종",
  부경대학교: "최종",
  부산대학교: "최종",
  인천대학교: "최종",
  전남대학교: "최종",
  전북대학교: "최종",
  충남대학교: "최초",
  충북대학교: "최초",
};

describe("9개 대학 2024~2026 최종 데이터 감사", () => {
  it("keeps the source-verified row count for every university and year", () => {
    for (const [university, years] of Object.entries(EXPECTED_ROWS)) {
      for (const [year, expected] of Object.entries(years)) {
        expect(records.filter((record) => (
          record.대학명 === university && record.연도 === year
        )).length, `${university} ${year}`).toBe(expected);
      }
    }
    expect(records).toHaveLength(2_194);
  });

  it("has one formula per university-year and no unresolved result row", () => {
    expect(formulas).toHaveLength(27);
    const formulaKeys = formulas.map((record) => `${record.대학명}|${record.연도}`);
    expect(new Set(formulaKeys).size).toBe(formulaKeys.length);

    for (const record of records) {
      expect(
        getConversionFormula(record.대학명, record.연도, record.학과),
        `${record.대학명} ${record.연도} ${record.학과}`,
      ).not.toBeNull();
    }
  });

  it("has no duplicate score key and no remaining exception row", () => {
    const keys = records.map((record) => (
      `${record.대학명}|${record.연도}|${record.학과}`
    ));
    expect(new Set(keys).size).toBe(keys.length);
    expect(rawExceptionData).toHaveLength(0);
  });

  it("preserves each official publication's admit criterion", () => {
    for (const [university, criterion] of Object.entries(EXPECTED_CRITERION)) {
      const universityRecords = records.filter(
        (record) => record.대학명 === university,
      );
      const permitted = university === "부경대학교"
        ? [criterion, "확인불가"]
        : [criterion];
      expect(
        universityRecords.every((record) => (
          record.합격자기준 !== undefined
          && permitted.includes(record.합격자기준)
        )),
        university,
      ).toBe(true);
    }
  });

  it("contains only finite scores and non-negative published counts", () => {
    const countFields: (keyof ScoreRecord)[] = ["모집인원", "지원인원", "합격인원"];
    const scoreFields: (keyof ScoreRecord)[] = [
      "최종합격_토익환산점수",
      "최종합격_토익원점수",
      "최종합격_학점환산점수",
      "최종합격_학점원점수_100점만점",
    ];
    for (const record of records) {
      for (const field of countFields) {
        const value = record[field] as number | null;
        expect(value === null || (Number.isInteger(value) && value >= 0)).toBe(true);
      }
      for (const field of scoreFields) {
        const value = record[field] as number | null;
        expect(value === null || (typeof value === "number" && Number.isFinite(value)))
          .toBe(true);
      }
    }
  });
});
