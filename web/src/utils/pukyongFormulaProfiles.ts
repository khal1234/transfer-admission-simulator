import type { AdmissionProfile, AdmissionWeights } from "./admissionProfile";

export type PukyongAdmissionProfileId =
  | "interview"
  | "no-interview"
  | "practical"
  | "future-convergence";

export type PukyongAdmissionProfile = AdmissionProfile & {
  id: PukyongAdmissionProfileId;
};

type ProfileDefinition = {
  id: PukyongAdmissionProfileId;
  label: string;
  weights: AdmissionWeights;
  totalScore: number;
};

const SOURCE_PAGES: Record<string, string> = {
  "2024": "2024학년도 모집요강 PDF 11·30·31쪽",
  "2025": "2025학년도 모집요강 PDF 10·29·30쪽",
  "2026": "2026학년도 모집요강 PDF 10·29·31쪽",
};

const PRACTICAL_DEPARTMENTS = new Set([
  "해양스포츠전공",
  "시각디자인전공",
  "공업디자인전공",
]);

const FUTURE_CONVERGENCE_DEPARTMENTS: Record<string, ReadonlySet<string>> = {
  "2024": new Set([
    "평생교육·상담학전공",
    "경찰범죄심리학전공",
    "스마트기계모빌리티전공",
    "스마트전기전자공학전공",
  ]),
  "2025": new Set([
    "평생교육·상담학전공",
    "경찰범죄심리학전공",
    "기계조선공조공학전공",
    "전기전자SW공학전공",
  ]),
  "2026": new Set([
    "평생교육·상담학전공",
    "경찰범죄심리학전공",
    "기계조선공조공학전공",
    "전기전자SW공학전공",
  ]),
};

const NO_INTERVIEW_DEPARTMENTS: Record<string, ReadonlySet<string>> = {
  "2024": new Set([
    "영어영문학부",
    "정치외교학과",
    "패션디자인학과",
    "물리학과",
    "경영학전공",
    "회계·재무학전공",
    "관광경영학전공",
    "국제통상학전공",
    "국제무역물류학전공",
    "국제경영학전공",
    "자원생물학전공",
  ]),
  "2025": new Set([
    "영어영문학부",
    "일본학전공",
    "정치외교학과",
    "패션디자인학과",
    "물리학과",
    "경영학전공",
    "회계·재무학전공",
    "관광경영학전공",
    "국제통상학전공",
    "국제무역물류학전공",
    "국제경영학전공",
    "제어계측공학전공",
    "디스플레이반도체공학전공",
    "기계시스템공학전공",
    "토목공학전공",
    "자원생물학전공",
  ]),
  "2026": new Set([
    "영어영문학부",
    "일본학전공",
    "정치외교학과",
    "패션디자인학과",
    "물리학과",
    "과학컴퓨팅학과",
    "경영학전공",
    "회계·재무학전공",
    "관광경영학전공",
    "국제통상학전공",
    "국제무역물류학전공",
    "국제경영학전공",
    "제어계측공학전공",
    "기계시스템공학전공",
    "안전공학전공",
    "토목공학전공",
    "자원생물학전공",
    "수해양산업교육과",
    "스마트모빌리티공학과",
  ]),
};

function makeWeights(
  english: number,
  gpa: number,
  interview: number,
  practical: number,
): AdmissionWeights {
  return {
    english,
    gpa,
    document: 0,
    interview,
    written: 0,
    practical,
    industryExperience: 0,
  };
}

const PROFILE_DEFINITIONS: Record<PukyongAdmissionProfileId, ProfileDefinition> = {
  interview: {
    id: "interview",
    label: "면접 실시 모집단위",
    weights: makeWeights(200, 100, 200, 0),
    totalScore: 500,
  },
  "no-interview": {
    id: "no-interview",
    label: "면접 미실시 모집단위",
    weights: makeWeights(200, 100, 0, 0),
    totalScore: 300,
  },
  practical: {
    id: "practical",
    label: "실기 실시 모집단위",
    weights: makeWeights(100, 100, 0, 200),
    totalScore: 400,
  },
  "future-convergence": {
    id: "future-convergence",
    label: "미래융합대학 모집단위",
    weights: makeWeights(0, 100, 0, 0),
    totalScore: 100,
  },
};

function normalizeDepartment(department: string): string {
  return department.replace(/\s+/g, "").trim();
}

function getProfileId(
  year: string,
  department: string,
): PukyongAdmissionProfileId {
  if (FUTURE_CONVERGENCE_DEPARTMENTS[year]?.has(department)) {
    return "future-convergence";
  }
  if (PRACTICAL_DEPARTMENTS.has(department)) return "practical";
  if (NO_INTERVIEW_DEPARTMENTS[year]?.has(department)) return "no-interview";
  return "interview";
}

export function getPukyongAdmissionProfile(
  year: string,
  department?: string,
): PukyongAdmissionProfile | null {
  const sourcePage = SOURCE_PAGES[year];
  if (sourcePage === undefined) return null;

  const profileId = getProfileId(year, normalizeDepartment(department ?? ""));
  const definition = PROFILE_DEFINITIONS[profileId];
  const englishWeight = definition.weights.english;

  return {
    ...definition,
    sourcePage,
    englishFormulaText: englishWeight === 0
      ? null
      : `영어변환성적점수 = (TOEIC ÷ 990) × ${englishWeight}, 소수점 다섯째 자리에서 절사`,
    gpaFormulaText: "전적대학성적점수 = 60 + 0.4 × 백분위, 소수점 다섯째 자리에서 절사",
  };
}
