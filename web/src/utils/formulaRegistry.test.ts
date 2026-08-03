import { describe, expect, it } from "vitest";
import { getConversionFormula } from "./formulaRegistry";

function englishScore(
  formula: ReturnType<typeof getConversionFormula>,
  toeic: number,
): number {
  if (formula?.convertEnglish === null || formula?.convertEnglish === undefined) {
    throw new Error("공인영어 환산식이 없다");
  }
  return formula.convertEnglish(toeic);
}

describe("getConversionFormula", () => {
  it.each(["2024", "2025", "2026"])(
    "uses the verified Jeonbuk %s lookup-equivalent formula",
    (year) => {
      const formula = getConversionFormula("전북대학교", year);

      expect(formula).toMatchObject({
        confidence: "verified",
        provenance: "documented-for-year",
        reverseCalculationMode: "lookup",
      });
      expect(englishScore(formula, 990)).toBe(80);
      expect(englishScore(formula, 985)).toBeCloseTo(79.596, 5);
      expect(englishScore(formula, 0)).toBeCloseTo(0.008, 5);
      expect(formula?.convertGpa?.(100)).toBe(60);
    },
  );

  it("uses the verified Chungbuk lookup table for all three years", () => {
    expect(getConversionFormula("충북대학교", "2026")).toMatchObject({
      confidence: "verified",
      provenance: "documented-for-year",
      reverseCalculationMode: "lookup",
      convertGpa: null,
    });

    const formula2024 = getConversionFormula("충북대학교", "2024");
    const formula2026 = getConversionFormula("충북대학교", "2026");
    expect(englishScore(formula2024, 980)).toBe(30);
    expect(englishScore(formula2024, 975)).toBe(29.5);
    expect(englishScore(formula2024, 375)).toBe(14.5);
    expect(englishScore(formula2026, 980)).toBe(60);
    expect(englishScore(formula2026, 975)).toBe(59.5);
    expect(englishScore(formula2026, 375)).toBe(44.5);
  });

  it("marks 강원대 2026 verified after the guideline was checked", () => {
    // 26_강원대_모집요강.pdf 13쪽: 공인영어 150점(60%) + 면접 100점(40%),
    // 전적대학성적 미반영. 추정으로 두었던 배율이 원문과 일치했다.
    expect(getConversionFormula("강원대학교", "2026")).toMatchObject({
      confidence: "verified",
      provenance: "documented-for-year",
      reverseCalculationMode: "linear",
      convertGpa: null,
    });
  });

  it("uses the exact Chungnam 2024 lookup bands", () => {
    const formula = getConversionFormula("충남대학교", "2024");

    expect(formula).toMatchObject({
      confidence: "verified",
      reverseCalculationMode: "lookup",
    });
    expect(englishScore(formula, 985)).toBe(50);
    expect(englishScore(formula, 980)).toBe(49.5);
    expect(englishScore(formula, 975)).toBe(49.5);
    expect(englishScore(formula, 385)).toBe(20);
  });

  it.each(["2025", "2026"])(
    "uses the exact Chungnam %s lookup bands",
    (year) => {
      const formula = getConversionFormula("충남대학교", year);

      expect(formula).toMatchObject({
        confidence: "verified",
        reverseCalculationMode: "lookup",
        convertGpa: null,
      });
      expect(englishScore(formula, 990)).toBe(60);
      expect(englishScore(formula, 985)).toBeCloseTo(59.4, 5);
      expect(englishScore(formula, 795)).toBeCloseTo(36.6, 5);
      expect(englishScore(formula, 790)).toBe(36);
      expect(englishScore(formula, 785)).toBe(36);
      expect(englishScore(formula, 775)).toBeCloseTo(35.4, 5);
      expect(englishScore(formula, 490)).toBe(24);
    },
  );

  it("tracks formulas assumed from another year separately", () => {
    expect(getConversionFormula("부산대학교", "2024")?.provenance)
      .toBe("documented-for-year");
    expect(getConversionFormula("부산대학교", "2025")?.provenance)
      .toBe("documented-for-year");
    for (const year of ["2024", "2025", "2026"]) {
      expect(getConversionFormula("전북대학교", year)?.provenance)
        .toBe("documented-for-year");
    }
  });

  it("returns null for an unsupported university", () => {
    expect(getConversionFormula("지원하지 않는 대학교", "2026")).toBeNull();
  });

  it.each(["2023", "2027", "", "invalid"])(
    "returns null for unsupported year %j",
    (year) => {
      expect(getConversionFormula("부산대학교", year)).toBeNull();
      expect(getConversionFormula("충남대학교", year)).toBeNull();
    }
  );
});
