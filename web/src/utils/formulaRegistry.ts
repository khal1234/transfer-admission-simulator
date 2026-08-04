import {
  getPusanAdmissionProfile,
} from "./pusanFormulaProfiles";
import type { AdmissionProfile } from "./admissionProfile";
import { getKyungbukAdmissionProfile } from "./kyungbukFormulaProfiles";
import {
  getChungnamAdmissionProfile,
  getChungnamToeicTableScore,
} from "./chungnamFormulaProfiles";
import { getIncheonAdmissionProfile } from "./incheonFormulaProfiles";
import {
  getChungbukAdmissionProfile,
  getChungbukEnglishScore,
} from "./chungbukFormulaProfiles";
import {
  getJeonbukAdmissionProfile,
  getJeonbukToeicTableScore,
} from "./jeonbukFormulaProfiles";
import { getChonnamAdmissionProfile } from "./chonnamFormulaProfiles";
import { getPukyongAdmissionProfile } from "./pukyongFormulaProfiles";
import { getGangwonAdmissionProfile } from "./gangwonFormulaProfiles";

export type FormulaConfidence =
  | "verified"
  | "estimated"
  | "lookup-approximation";

export type FormulaProvenance =
  | "documented-for-year"
  | "assumed-from-other-year";

export type ReverseCalculationMode = "linear" | "lookup";

export type ScorePrecision = {
  mode: "round" | "truncate";
  decimalPlaces: number;
};

export type ConversionFormula = {
  confidence: FormulaConfidence;
  provenance: FormulaProvenance;
  reverseCalculationMode: ReverseCalculationMode;
  englishSlope: number;
  gpaSlope100: number;
  convertEnglish: ((toeic: number) => number) | null;
  convertGpa: ((gpa100: number) => number) | null;
  admissionProfile?: AdmissionProfile;
  scorePrecision?: ScorePrecision;
};

function getGangwonFormula(
  year: string,
  department?: string,
): ConversionFormula {
  const profile = getGangwonAdmissionProfile(year, department);
  if (profile === null) {
    throw new Error(`지원하지 않는 강원대 연도: ${year}`);
  }

  const { english, gpa } = profile.weights;
  return {
    confidence: "verified",
    provenance: "documented-for-year",
    reverseCalculationMode: "linear",
    englishSlope: english / 990,
    gpaSlope100: gpa / 100,
    convertEnglish: english === 0
      ? null
      : (toeic) => (toeic / 990) * english,
    convertGpa: gpa === 0
      ? null
      : (gpa100) => (gpa100 / 100) * gpa,
    admissionProfile: profile,
  };
}

function getKyungbukFormula(
  year: string,
  department?: string,
): ConversionFormula {
  const profile = getKyungbukAdmissionProfile(year, department);
  if (profile === null) {
    throw new Error(`지원하지 않는 경북대 연도: ${year}`);
  }

  const englishWeight = profile.weights.english;
  return {
    confidence: "verified",
    provenance: "documented-for-year",
    reverseCalculationMode: "linear",
    englishSlope: englishWeight / 990,
    gpaSlope100: 0.2,
    convertEnglish: (toeic) => (toeic / 990) * englishWeight,
    convertGpa: (gpa100) => 30 + (gpa100 / 100) * 20,
    admissionProfile: profile,
  };
}

function getPukyongFormula(
  year: string,
  department?: string,
): ConversionFormula {
  const profile = getPukyongAdmissionProfile(year, department);
  if (profile === null) {
    throw new Error(`지원하지 않는 부경대 연도: ${year}`);
  }

  const englishWeight = profile.weights.english;
  return {
    confidence: "verified",
    provenance: "documented-for-year",
    reverseCalculationMode: "linear",
    englishSlope: englishWeight / 990,
    gpaSlope100: 0.4,
    convertEnglish: englishWeight === 0
      ? null
      : (toeic) => (toeic / 990) * englishWeight,
    convertGpa: (gpa100) => 60 + 0.4 * gpa100,
    admissionProfile: profile,
    scorePrecision: { mode: "truncate", decimalPlaces: 4 },
  };
}

function getPusanFormula(year: string, department?: string): ConversionFormula {
  const profile = getPusanAdmissionProfile(year, department);
  if (profile === null) {
    throw new Error(`지원하지 않는 부산대 연도: ${year}`);
  }

  const { english, gpa } = profile.weights;
  return {
    confidence: "verified",
    provenance: "documented-for-year",
    reverseCalculationMode: "linear",
    englishSlope: english / 990,
    gpaSlope100: gpa / 100,
    convertEnglish: english === 0
      ? null
      : (toeic) => (toeic / 990) * english,
    convertGpa: gpa === 0
      ? null
      : (gpa100) => (gpa100 / 100) * gpa,
    admissionProfile: profile,
  };
}

function getIncheonFormula(
  year: string,
  department?: string,
): ConversionFormula {
  const profile = getIncheonAdmissionProfile(year, department);
  if (profile === null) {
    throw new Error(`지원하지 않는 인천대 연도: ${year}`);
  }

  const englishWeight = profile.weights.english;
  const hasEnglishBaseScore = profile.id === "standard";
  return {
    confidence: "verified",
    provenance: "documented-for-year",
    reverseCalculationMode: "linear",
    englishSlope: englishWeight === 0 ? 0 : 60 / 990,
    gpaSlope100: 0,
    convertEnglish: englishWeight === 0
      ? null
      : (toeic) => (toeic / 990) * 60 + (hasEnglishBaseScore ? 60 : 0),
    convertGpa: null,
    admissionProfile: profile,
  };
}

function getChonnamFormula(
  year: string,
  department?: string,
): ConversionFormula {
  const profile = getChonnamAdmissionProfile(year, department);
  if (profile === null) {
    throw new Error(`지원하지 않는 전남대 연도: ${year}`);
  }

  const { english, gpa } = profile.weights;
  return {
    confidence: "verified",
    provenance: "documented-for-year",
    reverseCalculationMode: "linear",
    englishSlope: english / 990,
    gpaSlope100: gpa / 100,
    convertEnglish: english === 0
      ? null
      : (toeic) => (toeic / 990) * english,
    convertGpa: (gpa100) => (gpa100 / 100) * gpa,
    admissionProfile: profile,
  };
}

function getJeonbukFormula(
  year: string,
  department?: string,
): ConversionFormula {
  const profile = getJeonbukAdmissionProfile(year, department);
  if (profile === null) {
    throw new Error(`지원하지 않는 전북대 연도: ${year}`);
  }

  const { english, gpa } = profile.weights;
  return {
    confidence: "verified",
    provenance: "documented-for-year",
    reverseCalculationMode: "lookup",
    englishSlope: english === 0 ? 0 : 0.101 * english / 100,
    gpaSlope100: gpa / 100,
    convertEnglish: english === 0
      ? null
      : (toeic) => getJeonbukToeicTableScore(toeic) * english / 100,
    convertGpa: (gpa100) => gpa100 * gpa / 100,
    admissionProfile: profile,
  };
}

function getChungnamFormula(
  year: string,
  department?: string,
): ConversionFormula {
  const profile = getChungnamAdmissionProfile(year, department);
  if (profile === null) {
    throw new Error(`지원하지 않는 충남대 연도: ${year}`);
  }

  const { english, gpa } = profile.weights;
  return {
    confidence: "verified",
    provenance: "documented-for-year",
    reverseCalculationMode: "lookup",
    englishSlope: year === "2024" ? english / 1000 : english / 500,
    gpaSlope100: gpa / 100,
    convertEnglish: english === 0
      ? null
      : (toeic) => getChungnamToeicTableScore(year, toeic) * english / 100,
    convertGpa: gpa === 0
      ? null
      : (gpa100) => gpa100 * gpa / 100,
    admissionProfile: profile,
  };
}

function getChungbukFormula(
  year: string,
  department?: string,
): ConversionFormula {
  const profile = getChungbukAdmissionProfile(year, department);
  if (profile === null) {
    throw new Error(`지원하지 않는 충북대 연도: ${year}`);
  }

  const gpaWeight = profile.weights.gpa;
  return {
    confidence: "verified",
    provenance: "documented-for-year",
    reverseCalculationMode: "lookup",
    englishSlope: 0.025,
    gpaSlope100: gpaWeight === 0 ? 0 : 0.2,
    convertEnglish: (toeic) => getChungbukEnglishScore(year, toeic),
    convertGpa: gpaWeight === 0
      ? null
      : (gpa100) => 10 + gpa100 * 0.2,
    admissionProfile: profile,
  };
}

type FormulaResolver = (year: string, department?: string) => ConversionFormula;

const SUPPORTED_YEARS = new Set(["2024", "2025", "2026"]);
const FORMULA_RESOLVERS: Record<string, FormulaResolver> = {
  강원대학교: getGangwonFormula,
  경북대학교: getKyungbukFormula,
  부경대학교: getPukyongFormula,
  부산대학교: getPusanFormula,
  인천대학교: getIncheonFormula,
  전남대학교: getChonnamFormula,
  전북대학교: getJeonbukFormula,
  충남대학교: getChungnamFormula,
  충북대학교: getChungbukFormula,
};

export function getConversionFormula(
  university: string,
  year: string,
  department?: string,
): ConversionFormula | null {
  if (!SUPPORTED_YEARS.has(year)) {
    return null;
  }

  return FORMULA_RESOLVERS[university]?.(year, department) ?? null;
}
