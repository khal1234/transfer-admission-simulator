import type { AdmissionProfile, AdmissionWeights } from "./admissionProfile";

export type IncheonAdmissionProfileId =
  | "standard"
  | "practical"
  | "movement-health"
  | "interview-only";

export type IncheonAdmissionProfile = AdmissionProfile & {
  id: IncheonAdmissionProfileId;
  totalScore: 200;
};

type ProfileDefinition = {
  id: IncheonAdmissionProfileId;
  label: string;
  weights: AdmissionWeights;
  englishFormulaText: string | null;
};

const SOURCE_PAGES: Record<string, string> = {
  "2024": "2024학년도 모집요강 15~16쪽",
  "2025": "2025학년도 모집요강 11쪽",
  "2026": "2026학년도 모집요강 14~15쪽",
};

function weights(
  english: number,
  interview: number,
  practical: number,
): AdmissionWeights {
  return {
    english,
    gpa: 0,
    document: 0,
    interview,
    written: 0,
    practical,
    industryExperience: 0,
  };
}

const STANDARD: ProfileDefinition = {
  id: "standard",
  label: "인문·자연·디자인 표준형",
  weights: weights(120, 80, 0),
  englishFormulaText: "반영점수 = TOEIC ÷ 990 × 60 + 기본점수 60",
};

const PRACTICAL: ProfileDefinition = {
  id: "practical",
  label: "예체능 실기형",
  weights: weights(0, 80, 120),
  englishFormulaText: null,
};

const MOVEMENT_HEALTH: ProfileDefinition = {
  id: "movement-health",
  label: "운동건강학부형",
  weights: weights(60, 80, 60),
  englishFormulaText: "반영점수 = TOEIC ÷ 990 × 60(기본점수 없음)",
};

const INTERVIEW_ONLY: ProfileDefinition = {
  id: "interview-only",
  label: "조형예술 면접형",
  weights: weights(0, 200, 0),
  englishFormulaText: null,
};

function normalizeDepartment(department: string): string {
  return department.replace(/\s+/g, "").trim();
}

function isPaintingDepartment(department: string): boolean {
  return department === "한국화전공" || department === "서양화전공";
}

function isPracticalDepartment(year: string, department: string): boolean {
  if (department === "공연예술학과") return true;
  if (year === "2024") {
    return isPaintingDepartment(department)
      || department === "체육학부"
      || department === "운동건강학부"
      || department === "체육교육과";
  }
  if (year === "2025") {
    return isPaintingDepartment(department) || department === "체육학부";
  }
  return department === "스포츠과학부"
    || department === "체육학부"
    || department === "체육교육과";
}

export function getIncheonAdmissionProfile(
  year: string,
  department?: string,
): IncheonAdmissionProfile | null {
  const sourcePage = SOURCE_PAGES[year];
  if (sourcePage === undefined) return null;

  const normalizedDepartment = normalizeDepartment(department ?? "");
  let definition = STANDARD;
  if (year === "2026" && isPaintingDepartment(normalizedDepartment)) {
    definition = INTERVIEW_ONLY;
  } else if (
    year !== "2024"
    && normalizedDepartment === "운동건강학부"
  ) {
    definition = MOVEMENT_HEALTH;
  } else if (isPracticalDepartment(year, normalizedDepartment)) {
    definition = PRACTICAL;
  }

  return {
    ...definition,
    totalScore: 200,
    sourcePage,
    gpaFormulaText: null,
  };
}
