import type { AdmissionProfile } from "./admissionProfile";

export type KyungbukAdmissionProfileId = "general" | "arts" | "sports";

export type KyungbukAdmissionProfile = AdmissionProfile & {
  id: KyungbukAdmissionProfileId;
  totalScore: 250;
};

type ProfileDefinition = Omit<KyungbukAdmissionProfile, "sourcePage">;

const PROFILE_DEFINITIONS: Record<
  KyungbukAdmissionProfileId,
  ProfileDefinition
> = {
  general: {
    id: "general",
    label: "일반학과형",
    weights: {
      english: 100,
      gpa: 50,
      document: 0,
      interview: 100,
      written: 0,
      practical: 0,
      industryExperience: 0,
    },
    totalScore: 250,
    englishFormulaText: "반영점수 = 100 × TOEIC ÷ 990",
    gpaFormulaText: "반영점수 = 30 + 20 × 백분위 점수 ÷ 100",
  },
  arts: {
    id: "arts",
    label: "예능계형",
    weights: {
      english: 50,
      gpa: 50,
      document: 0,
      interview: 50,
      written: 0,
      practical: 100,
      industryExperience: 0,
    },
    totalScore: 250,
    englishFormulaText: "반영점수 = 50 × TOEIC ÷ 990",
    gpaFormulaText: "반영점수 = 30 + 20 × 백분위 점수 ÷ 100",
  },
  sports: {
    id: "sports",
    label: "체능계형",
    weights: {
      english: 50,
      gpa: 50,
      document: 0,
      interview: 100,
      written: 0,
      practical: 50,
      industryExperience: 0,
    },
    totalScore: 250,
    englishFormulaText: "반영점수 = 50 × TOEIC ÷ 990",
    gpaFormulaText: "반영점수 = 30 + 20 × 백분위 점수 ÷ 100",
  },
};

const SOURCE_PAGES: Record<string, string> = {
  "2024": "2024학년도 모집요강 15~16쪽",
  "2025": "2025학년도 모집요강 15~16쪽",
  "2026": "2026학년도 모집요강 16~17쪽",
};

const ARTS_DEPARTMENTS = new Set([
  "디자인학과",
  "미술학과",
  "성악전공",
  "작곡전공",
  "한국화전공",
  "서양화전공",
  "조소전공",
]);

function normalizeDepartment(department: string): string {
  return department.replace(/\s+/g, "").trim();
}

function isArtsDepartment(department: string): boolean {
  return ARTS_DEPARTMENTS.has(department)
    || department.startsWith("기악전공")
    || department.startsWith("음악학과")
    || department.startsWith("미술학과(");
}

function isSportsDepartment(department: string): boolean {
  return department === "체육교육과"
    || department === "체육학과"
    || department.startsWith("체육학부(");
}

export function getKyungbukAdmissionProfile(
  year: string,
  department?: string,
): KyungbukAdmissionProfile | null {
  const sourcePage = SOURCE_PAGES[year];
  if (sourcePage === undefined) {
    return null;
  }

  const normalizedDepartment = normalizeDepartment(department ?? "");
  const profileId: KyungbukAdmissionProfileId = isArtsDepartment(
    normalizedDepartment,
  )
    ? "arts"
    : isSportsDepartment(normalizedDepartment)
      ? "sports"
      : "general";

  return {
    ...PROFILE_DEFINITIONS[profileId],
    sourcePage,
  };
}
