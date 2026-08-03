import type { AdmissionProfile, AdmissionWeights } from "./admissionProfile";

export type JeonbukAdmissionProfileId =
  | "standard"
  | "hanok"
  | "arts"
  | "sports"
  | "veterinary"
  | "pharmacy-dentistry";

export type JeonbukAdmissionProfile = AdmissionProfile & {
  id: JeonbukAdmissionProfileId;
};

type ProfileDefinition = {
  id: JeonbukAdmissionProfileId;
  label: string;
  weights: AdmissionWeights;
  totalScore: number;
};

const SOURCE_PAGES: Record<string, string> = {
  "2024": "2024학년도 모집요강 PDF 24·25·43~46쪽",
  "2025": "2025학년도 모집요강 PDF 28·29·54~57쪽",
  "2026": "2026학년도 모집요강 PDF 25·26·50~53쪽",
};

const ARTS_DEPARTMENTS: Record<string, ReadonlySet<string>> = {
  "2024": new Set(["미술학과", "산업디자인학과", "음악과", "한국음악학과"]),
  "2025": new Set(["무용학과", "미술학과", "산업디자인학과", "음악과"]),
  "2026": new Set([
    "무용학과",
    "미술학과",
    "산업디자인학과",
    "음악과",
    "한국음악학과",
  ]),
};

const PROFILE_DEFINITIONS: Record<JeonbukAdmissionProfileId, ProfileDefinition> = {
  standard: {
    id: "standard",
    label: "일반대학 표준형",
    weights: makeWeights(80, 60, 60, 0, 0),
    totalScore: 200,
  },
  hanok: {
    id: "hanok",
    label: "한옥학과 전적대성적형",
    weights: makeWeights(0, 100, 0, 0, 0),
    totalScore: 100,
  },
  arts: {
    id: "arts",
    label: "예술대학 실기형",
    weights: makeWeights(0, 120, 20, 0, 60),
    totalScore: 200,
  },
  sports: {
    id: "sports",
    label: "스포츠과학 실기형",
    weights: makeWeights(50, 50, 50, 0, 50),
    totalScore: 200,
  },
  veterinary: {
    id: "veterinary",
    label: "수의학 필답형",
    weights: makeWeights(80, 20, 20, 80, 0),
    totalScore: 200,
  },
  "pharmacy-dentistry": {
    id: "pharmacy-dentistry",
    label: "약학·치의학 필답형",
    weights: makeWeights(60, 20, 40, 80, 0),
    totalScore: 200,
  },
};

function makeWeights(
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

function getProfileId(
  year: string,
  department: string,
): JeonbukAdmissionProfileId {
  if (year === "2026" && department === "한옥학과") return "hanok";
  if (ARTS_DEPARTMENTS[year]?.has(department)) return "arts";
  if (year !== "2025" && department === "스포츠과학과") return "sports";
  if (department === "수의학과") return "veterinary";
  if (department === "약학과") return "pharmacy-dentistry";
  if (year !== "2024" && department === "치의학과") {
    return "pharmacy-dentistry";
  }
  return "standard";
}

export function getJeonbukAdmissionProfile(
  year: string,
  department?: string,
): JeonbukAdmissionProfile | null {
  const sourcePage = SOURCE_PAGES[year];
  if (sourcePage === undefined) return null;

  const profileId = getProfileId(
    year,
    normalizeDepartment(department ?? ""),
  );
  const definition = PROFILE_DEFINITIONS[profileId];
  const { english, gpa } = definition.weights;

  return {
    ...definition,
    sourcePage,
    englishFormulaText: english === 0
      ? null
      : `공인영어 반영점수 = [별첨1] TOEIC 구간별 백분율 환산점수 × ${english / 100}`,
    gpaFormulaText: `전적대성적 반영점수 = 백분위 점수 × ${gpa / 100}`,
  };
}

/**
 * 세 연도 [별첨1]의 TOEIC 구간표는 동일하다. 990점은 100.000점,
 * 이후 5점 구간마다 0.505점씩 내려가며 0~4점 구간은 0.010점이다.
 */
export function getJeonbukToeicTableScore(toeic: number): number {
  const clamped = Math.max(0, Math.min(990, Math.floor(toeic)));
  const bandMinimum = clamped === 990 ? 990 : Math.floor(clamped / 5) * 5;
  return Math.round((0.01 + bandMinimum * 0.101) * 1000) / 1000;
}
