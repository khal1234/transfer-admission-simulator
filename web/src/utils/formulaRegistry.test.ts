import { describe, expect, it } from "vitest";
import { getConversionFormula } from "./formulaRegistry";

describe("getConversionFormula", () => {
  it("marks estimated and lookup-based formulas explicitly", () => {
    expect(getConversionFormula("전북대학교", "2026")).toMatchObject({
      confidence: "lookup-approximation",
      provenance: "documented-for-year",
      reverseCalculationMode: "lookup",
    });
    expect(getConversionFormula("충북대학교", "2026")).toMatchObject({
      confidence: "estimated",
      provenance: "documented-for-year",
      reverseCalculationMode: "linear",
      convertGpa: null,
    });
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

  it("tracks formulas assumed from another year separately", () => {
    expect(getConversionFormula("부산대학교", "2024")?.provenance)
      .toBe("assumed-from-other-year");
    expect(getConversionFormula("부산대학교", "2025")?.provenance)
      .toBe("documented-for-year");
    expect(getConversionFormula("전북대학교", "2024")?.provenance)
      .toBe("assumed-from-other-year");
    expect(getConversionFormula("전북대학교", "2025")?.provenance)
      .toBe("assumed-from-other-year");
    expect(getConversionFormula("전북대학교", "2026")?.provenance)
      .toBe("documented-for-year");
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
