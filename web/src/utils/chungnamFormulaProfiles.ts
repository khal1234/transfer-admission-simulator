import type { AdmissionProfile, AdmissionWeights } from "./admissionProfile";

export type ChungnamAdmissionProfileId =
  | "standard"
  | "hanmun-written"
  | "science-interview"
  | "coding-practical"
  | "food-written"
  | "vet-pharmacy-written"
  | "math-education-written"
  | "arts-practical";

export type ChungnamAdmissionProfile = AdmissionProfile & {
  id: ChungnamAdmissionProfileId;
  totalScore: 100;
};

type ProfileDefinition = {
  id: ChungnamAdmissionProfileId;
  label: string;
  weights: AdmissionWeights;
};

const SOURCE_PAGES: Record<string, string> = {
  "2024": "2024학년도 모집요강 14~15쪽·부록 1 27쪽",
  "2025": "2025학년도 모집요강 16쪽·부록 1 30쪽",
  "2026": "2026학년도 모집요강 16쪽·부록 1 30쪽",
};

const ARTS_PREFIXES = [
  "무용학과",
  "음악과",
  "관현악과",
  "회화과",
  "조소과",
  "디자인창의학과",
] as const;

function weights(
  english: number,
  gpa: number,
  interview: number,
  written: number,
  practical: number,
): AdmissionWeights {
  return {
    english,
    gpa,
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

function isArtsDepartment(department: string): boolean {
  return ARTS_PREFIXES.some((prefix) => department.startsWith(prefix));
}

function get2024Definition(department: string): ProfileDefinition {
  if (isArtsDepartment(department)) {
    return {
      id: "arts-practical",
      label: "예술·무용 실기형",
      weights: weights(0, 20, 40, 0, 40),
    };
  }
  if (department === "한문학과") {
    return {
      id: "hanmun-written",
      label: "한문학과 필답형",
      weights: weights(30, 10, 40, 20, 0),
    };
  }
  if (department === "화학과" || department === "생물과학과") {
    return {
      id: "science-interview",
      label: "화학·생물 면접형",
      weights: weights(40, 20, 40, 0, 0),
    };
  }
  if (department === "컴퓨터융합학부" || department === "인공지능학과") {
    return {
      id: "coding-practical",
      label: "컴퓨터·인공지능 실기형",
      weights: weights(20, 20, 40, 0, 20),
    };
  }
  if (department === "식품공학과") {
    return {
      id: "food-written",
      label: "식품공학 필답형",
      weights: weights(20, 20, 40, 20, 0),
    };
  }
  if (department === "수의학과" || department === "약학과") {
    return {
      id: "vet-pharmacy-written",
      label: "수의·약학 필답형(면접 P/F)",
      weights: weights(40, 10, 0, 50, 0),
    };
  }
  if (department === "수학교육과") {
    return {
      id: "math-education-written",
      label: "수학교육 필답형",
      weights: weights(10, 30, 30, 30, 0),
    };
  }
  return {
    id: "standard",
    label: "표준 면접형",
    weights: weights(50, 10, 40, 0, 0),
  };
}

function getRecentDefinition(
  year: string,
  department: string,
): ProfileDefinition {
  if (isArtsDepartment(department)) {
    return {
      id: "arts-practical",
      label: "예술·무용 실기형",
      weights: weights(0, 0, 40, 0, 60),
    };
  }
  if (department === "컴퓨터융합학부" || department === "인공지능학과") {
    return {
      id: "coding-practical",
      label: "컴퓨터·인공지능 실기형",
      weights: weights(20, 0, 40, 0, 40),
    };
  }
  if (department === "식품공학과") {
    return {
      id: "food-written",
      label: "식품공학 필답형",
      weights: weights(20, 0, 40, 40, 0),
    };
  }
  if (department === "수의학과" || department === "약학과") {
    return {
      id: "vet-pharmacy-written",
      label: "수의·약학 필답형(면접 P/F)",
      weights: weights(50, 0, 0, 50, 0),
    };
  }
  if (year === "2026" && department === "수학교육과") {
    return {
      id: "math-education-written",
      label: "수학교육 필답형",
      weights: weights(10, 0, 30, 60, 0),
    };
  }
  return {
    id: "standard",
    label: "표준 면접형",
    weights: weights(60, 0, 40, 0, 0),
  };
}

export function getChungnamAdmissionProfile(
  year: string,
  department?: string,
): ChungnamAdmissionProfile | null {
  const sourcePage = SOURCE_PAGES[year];
  if (sourcePage === undefined) return null;

  const normalizedDepartment = normalizeDepartment(department ?? "");
  const definition = year === "2024"
    ? get2024Definition(normalizedDepartment)
    : getRecentDefinition(year, normalizedDepartment);
  const { english, gpa } = definition.weights;

  return {
    ...definition,
    totalScore: 100,
    sourcePage,
    englishFormulaText: english === 0
      ? null
      : `[부록 1] TOEIC 구간표 배점 × ${english / 100}(${english}점)`,
    gpaFormulaText: gpa === 0
      ? null
      : `반영점수 = 백분율 점수 × ${gpa / 100}(${gpa}점)`,
  };
}

/** 모집요강 [부록 1]의 TOEIC 환산표 배점(100점 만점)을 조회한다. */
export function getChungnamToeicTableScore(year: string, toeic: number): number {
  if (year === "2024") {
    return Math.max(
      40,
      Math.min(100, Math.ceil((toeic - 380) / 10) + 39),
    );
  }

  if (toeic >= 795) {
    return Math.max(40, Math.min(100, 61 + (toeic - 795) / 5));
  }
  if (toeic >= 495) {
    return Math.max(40, Math.min(100, 41 + Math.floor((toeic - 495) / 15)));
  }
  return 40;
}
