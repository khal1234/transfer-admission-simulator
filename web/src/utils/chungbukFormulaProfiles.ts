import type { AdmissionProfile, AdmissionWeights } from "./admissionProfile";

export type ChungbukAdmissionProfileId = "standard" | "written" | "practical";

export type ChungbukAdmissionProfile = AdmissionProfile & {
  id: ChungbukAdmissionProfileId;
  totalScore: 100;
};

type ProfileDefinition = {
  id: ChungbukAdmissionProfileId;
  label: string;
  weights: AdmissionWeights;
};

const SOURCE_PAGES: Record<string, string> = {
  "2024": "2024학년도 모집요강 31·33쪽",
  "2025": "2025학년도 모집요강 27·28쪽",
  "2026": "2026학년도 모집요강 26·31쪽",
};

const WRITTEN_DEPARTMENTS: Record<string, ReadonlySet<string>> = {
  "2024": new Set(["수의학과", "약학과", "제약학과", "의학과"]),
  "2025": new Set(["수의학과", "약학과", "제약학과", "간호학과"]),
  "2026": new Set(["수의학과", "간호학과"]),
};

const PRACTICAL_DEPARTMENTS: Record<string, readonly string[]> = {
  "2024": ["건축학과", "체육교육과", "조형예술학과", "디자인학과"],
  "2025": ["건축학과", "조형예술학과", "디자인학과"],
  "2026": ["건축학과", "미술학과", "디자인학과"],
};

const CHUNGBUK_TOEIC_LOOKUP: readonly (readonly [number, number])[] = [
  [980, 100],
  [960, 97.5],
  [940, 95],
  [920, 92.5],
  [900, 90],
  [880, 87.5],
  [860, 85],
  [840, 82.5],
  [820, 80],
  [800, 77.5],
  [780, 75],
  [760, 72.5],
  [740, 70],
  [720, 67.5],
  [700, 65],
  [680, 62.5],
  [660, 60],
  [640, 57.5],
  [620, 55],
  [600, 52.5],
  [580, 50],
  [560, 47.5],
  [540, 45],
  [520, 42.5],
  [500, 40],
  [480, 37.5],
  [460, 35],
  [440, 32.5],
  [420, 30],
  [400, 27.5],
  [380, 25],
] as const;

function weights(
  year: string,
  interview: number,
  written: number,
  practical: number,
): AdmissionWeights {
  const recent = year === "2026";
  return {
    english: recent ? 60 : 30,
    gpa: recent ? 0 : 30,
    document: 0,
    interview,
    written,
    practical,
    industryExperience: 0,
  };
}

function normalizeDepartment(department: string): string {
  return department.replace(/\s+/g, "").trim();
}

function matchesDepartment(department: string, expected: string): boolean {
  return department === expected || department.startsWith(`${expected}(`);
}

function getDefinition(year: string, department: string): ProfileDefinition {
  if (WRITTEN_DEPARTMENTS[year]?.has(department)) {
    return {
      id: "written",
      label: "전공필기형",
      weights: weights(year, 20, 20, 0),
    };
  }
  if (
    PRACTICAL_DEPARTMENTS[year]?.some(
      (expected) => matchesDepartment(department, expected),
    )
  ) {
    return {
      id: "practical",
      label: "실기형",
      weights: weights(year, 10, 0, 30),
    };
  }
  return {
    id: "standard",
    label: "표준 면접형",
    weights: weights(year, 40, 0, 0),
  };
}

export function getChungbukAdmissionProfile(
  year: string,
  department?: string,
): ChungbukAdmissionProfile | null {
  const sourcePage = SOURCE_PAGES[year];
  if (sourcePage === undefined) return null;

  const definition = getDefinition(
    year,
    normalizeDepartment(department ?? ""),
  );
  const recent = year === "2026";
  return {
    ...definition,
    totalScore: 100,
    sourcePage,
    englishFormulaText: recent
      ? "반영점수 = 40 + TOEIC 구간 환산점수 × 0.2"
      : "반영점수 = 10 + TOEIC 구간 환산점수 × 0.2",
    gpaFormulaText: recent
      ? null
      : "반영점수 = 10 + 백분율 점수 × 0.2",
  };
}

export function getChungbukEnglishScore(year: string, toeic: number): number {
  const converted100 = CHUNGBUK_TOEIC_LOOKUP.find(
    ([minimumToeic]) => toeic >= minimumToeic,
  )?.[1] ?? 22.5;
  return (year === "2026" ? 40 : 10) + converted100 * 0.2;
}
