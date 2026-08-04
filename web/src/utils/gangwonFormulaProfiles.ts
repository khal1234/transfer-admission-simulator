import type { AdmissionProfile, AdmissionWeights } from "./admissionProfile";

export type GangwonAdmissionProfileId =
  | "standard"
  | "nursing"
  | "veterinary"
  | "pharmacy"
  | "sports-education"
  | "arts"
  | "agriculture-special"
  | "ecology-landscape";

export type GangwonAdmissionProfile = AdmissionProfile & {
  id: GangwonAdmissionProfileId;
};

type ProfileDefinition = {
  id: GangwonAdmissionProfileId;
  label: string;
  weights: AdmissionWeights;
  totalScore: number;
};

const SOURCE_PAGES: Record<string, string> = {
  "2024": "2024학년도 모집요강 PDF 13·18·19쪽",
  "2025": "2025학년도 모집요강 PDF 13·14쪽",
  "2026": "2026학년도 모집요강 PDF 13·14·15쪽",
};

const ARTS_DEPARTMENTS = new Set([
  "미술학과",
  "디자인학과",
  "음악학과",
  "무용학과",
  "스포츠과학과",
]);

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

function standardDefinition(year: string): ProfileDefinition {
  return year === "2026"
    ? {
      id: "standard",
      label: "일반 모집단위",
      weights: makeWeights(150, 0, 100, 0, 0),
      totalScore: 250,
    }
    : {
      id: "standard",
      label: "일반 모집단위",
      weights: makeWeights(100, 75, 75, 0, 0),
      totalScore: 250,
    };
}

function veterinaryDefinition(year: string): ProfileDefinition {
  return year === "2024"
    ? {
      id: "veterinary",
      label: "수의학과 단계선발형(공개 입결의 1단계 영어점수 기준)",
      weights: makeWeights(100, 0, 0, 0, 0),
      totalScore: 100,
    }
    : {
      id: "veterinary",
      label: "수의학과 2단계 환산형(영어 30 + 필기 70, 3단계 면접 가·부)",
      weights: makeWeights(30, 0, 0, 70, 0),
      totalScore: 100,
    };
}

function pharmacyDefinition(year: string): ProfileDefinition {
  return year === "2026"
    ? {
      id: "pharmacy",
      label: "약학과 2단계 환산형(영어 30 + 필기 70)",
      weights: makeWeights(30, 0, 0, 70, 0),
      totalScore: 100,
    }
    : {
      id: "pharmacy",
      label: "약학과 1단계 환산형(영어 60 + 전적대 40, 2단계는 1단계 합 30 + 필기 70)",
      weights: makeWeights(60, 40, 0, 0, 0),
      totalScore: 100,
    };
}

function getDefinition(
  year: string,
  department: string,
): ProfileDefinition {
  if (department === "간호학과") {
    return {
      id: "nursing",
      label: "간호학과 2단계형",
      weights: makeWeights(75, 75, 100, 0, 0),
      totalScore: 250,
    };
  }
  if (department === "수의학과") return veterinaryDefinition(year);
  if (department === "약학과") return pharmacyDefinition(year);
  if (department === "체육교육과") {
    return {
      id: "sports-education",
      label: "체육교육과 실기형",
      weights: makeWeights(50, 0, 100, 0, 100),
      totalScore: 250,
    };
  }
  if (ARTS_DEPARTMENTS.has(department)) {
    return {
      id: "arts",
      label: "예체능 실기형",
      weights: makeWeights(0, 0, 100, 0, 150),
      totalScore: 250,
    };
  }
  if (
    (year === "2024" && department === "시설농업학전공")
    || (year !== "2024" && department === "스마트팜농산업학과")
  ) {
    return {
      id: "agriculture-special",
      label: "미래농업·스마트팜 전적대성적형",
      weights: makeWeights(0, 150, 100, 0, 0),
      totalScore: 250,
    };
  }
  if (year === "2026" && department === "생태조경디자인학과") {
    return {
      id: "ecology-landscape",
      label: "생태조경디자인학과 혼합형",
      weights: makeWeights(100, 50, 100, 0, 0),
      totalScore: 250,
    };
  }
  return standardDefinition(year);
}

function normalizeDepartment(department: string): string {
  return department.replace(/\s+/g, "").trim();
}

export function getGangwonAdmissionProfile(
  year: string,
  department?: string,
): GangwonAdmissionProfile | null {
  const sourcePage = SOURCE_PAGES[year];
  if (sourcePage === undefined) return null;

  const definition = getDefinition(year, normalizeDepartment(department ?? ""));
  const { english, gpa } = definition.weights;
  return {
    ...definition,
    sourcePage,
    englishFormulaText: english === 0
      ? null
      : `공인영어 반영점수 = (TOEIC ÷ 990) × ${english}`,
    gpaFormulaText: gpa === 0
      ? null
      : `전적대성적 반영점수 = 백분율 × ${gpa / 100}`,
  };
}
