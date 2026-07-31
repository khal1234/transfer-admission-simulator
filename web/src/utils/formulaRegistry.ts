export type FormulaConfidence =
  | "verified"
  | "estimated"
  | "lookup-approximation";

export type FormulaProvenance =
  | "documented-for-year"
  | "assumed-from-other-year";

export type ReverseCalculationMode = "linear" | "lookup";

export type ConversionFormula = {
  confidence: FormulaConfidence;
  provenance: FormulaProvenance;
  reverseCalculationMode: ReverseCalculationMode;
  englishSlope: number;
  gpaSlope100: number;
  convertEnglish: (toeic: number) => number;
  convertGpa: ((gpa100: number) => number) | null;
};

const GANGWON_STANDARD: ConversionFormula = {
  confidence: "verified",
  provenance: "documented-for-year",
  reverseCalculationMode: "linear",
  englishSlope: 100 / 990,
  gpaSlope100: 0.75,
  convertEnglish: (toeic) => (toeic / 990) * 100,
  convertGpa: (gpa100) => gpa100 * 0.75,
};

// 26_강원대_모집요강.pdf 13쪽 전형요소별 배점표로 확인했다.
// 일반/학사 전체 모집단위: 공인영어 150점(60%) + 면접 100점(40%) = 250점,
// 전적대학성적 미반영. 추정으로 두었던 배율이 원문과 일치했다.
const GANGWON_2026: ConversionFormula = {
  confidence: "verified",
  provenance: "documented-for-year",
  reverseCalculationMode: "linear",
  englishSlope: 150 / 990,
  gpaSlope100: 0,
  convertEnglish: (toeic) => (toeic / 990) * 150,
  convertGpa: null,
};

const KYUNGBUK: ConversionFormula = {
  confidence: "verified",
  provenance: "documented-for-year",
  reverseCalculationMode: "linear",
  englishSlope: 100 / 990,
  gpaSlope100: 0.2,
  convertEnglish: (toeic) => (toeic / 990) * 100,
  convertGpa: (gpa100) => 30 + (gpa100 / 100) * 20,
};

const PUKYONG: ConversionFormula = {
  confidence: "verified",
  provenance: "documented-for-year",
  reverseCalculationMode: "linear",
  englishSlope: 200 / 990,
  gpaSlope100: 1,
  convertEnglish: (toeic) => (toeic / 990) * 200,
  convertGpa: (gpa100) => gpa100,
};

const PUSAN: ConversionFormula = {
  confidence: "verified",
  provenance: "documented-for-year",
  reverseCalculationMode: "linear",
  englishSlope: 30 / 990,
  gpaSlope100: 0.3,
  convertEnglish: (toeic) => (toeic / 990) * 30,
  convertGpa: (gpa100) => gpa100 * 0.3,
};

const INCHEON: ConversionFormula = {
  confidence: "estimated",
  provenance: "documented-for-year",
  reverseCalculationMode: "linear",
  englishSlope: 60 / 990,
  gpaSlope100: 0,
  convertEnglish: (toeic) => (toeic / 990) * 60 + 60,
  convertGpa: null,
};

const CHONNAM: ConversionFormula = {
  confidence: "verified",
  provenance: "documented-for-year",
  reverseCalculationMode: "linear",
  englishSlope: 400 / 990,
  gpaSlope100: 2,
  convertEnglish: (toeic) => (toeic / 990) * 400,
  convertGpa: (gpa100) => (gpa100 / 100) * 200,
};

const JEONBUK: ConversionFormula = {
  confidence: "lookup-approximation",
  provenance: "documented-for-year",
  reverseCalculationMode: "lookup",
  englishSlope: 0.0808,
  gpaSlope100: 0.6,
  convertEnglish: (toeic) => {
    const english100 = Math.max(
      0,
      Math.min(100, 100 - 0.101 * (990 - toeic))
    );
    return english100 * 0.8;
  },
  convertGpa: (gpa100) => gpa100 * 0.6,
};

const CHUNGNAM_2024: ConversionFormula = {
  confidence: "lookup-approximation",
  provenance: "documented-for-year",
  reverseCalculationMode: "lookup",
  englishSlope: 1 / 20,
  gpaSlope100: 0.1,
  convertEnglish: (toeic) => {
    const interpolated = 20 + (toeic - 385) / 20;
    return Math.max(20, Math.min(50, interpolated));
  },
  convertGpa: (gpa100) => gpa100 * 0.1,
};

const CHUNGNAM_RECENT: ConversionFormula = {
  confidence: "lookup-approximation",
  provenance: "documented-for-year",
  reverseCalculationMode: "lookup",
  englishSlope: 1 / 8.33333333,
  gpaSlope100: 0,
  convertEnglish: (toeic) => {
    const interpolated = 60 - (990 - toeic) / 8.33333333;
    return Math.max(24, Math.min(60, interpolated));
  },
  convertGpa: null,
};

const CHUNGBUK_STANDARD: ConversionFormula = {
  confidence: "lookup-approximation",
  provenance: "documented-for-year",
  reverseCalculationMode: "lookup",
  englishSlope: 0.025,
  gpaSlope100: 0.2,
  convertEnglish: (toeic) => {
    const english100 = 50 + (toeic - 587.5) / 8;
    const interpolated = 10 + Math.max(0, Math.min(100, english100)) * 0.2;
    return Math.max(10, Math.min(30, interpolated));
  },
  convertGpa: (gpa100) => 10 + gpa100 * 0.2,
};

const CHUNGBUK_2026: ConversionFormula = {
  confidence: "estimated",
  provenance: "documented-for-year",
  reverseCalculationMode: "linear",
  englishSlope: 0.025,
  gpaSlope100: 0,
  convertEnglish: (toeic) => {
    const english100 = 50 + (toeic - 587.5) / 8;
    const interpolated = 40 + Math.max(0, Math.min(100, english100)) * 0.2;
    return Math.max(40, Math.min(60, interpolated));
  },
  convertGpa: null,
};

type FormulaResolver = (year: string) => ConversionFormula;

const SUPPORTED_YEARS = new Set(["2024", "2025", "2026"]);
const PUSAN_2024: ConversionFormula = {
  ...PUSAN,
  provenance: "assumed-from-other-year",
};
const JEONBUK_ASSUMED: ConversionFormula = {
  ...JEONBUK,
  provenance: "assumed-from-other-year",
};

const FORMULA_RESOLVERS: Record<string, FormulaResolver> = {
  강원대학교: (year) => year === "2026" ? GANGWON_2026 : GANGWON_STANDARD,
  경북대학교: () => KYUNGBUK,
  부경대학교: () => PUKYONG,
  부산대학교: (year) => year === "2024" ? PUSAN_2024 : PUSAN,
  인천대학교: () => INCHEON,
  전남대학교: () => CHONNAM,
  전북대학교: (year) => year === "2026" ? JEONBUK : JEONBUK_ASSUMED,
  충남대학교: (year) => year === "2024" ? CHUNGNAM_2024 : CHUNGNAM_RECENT,
  충북대학교: (year) => year === "2026" ? CHUNGBUK_2026 : CHUNGBUK_STANDARD,
};

export function getConversionFormula(
  university: string,
  year: string
): ConversionFormula | null {
  if (!SUPPORTED_YEARS.has(year)) {
    return null;
  }

  return FORMULA_RESOLVERS[university]?.(year) ?? null;
}
