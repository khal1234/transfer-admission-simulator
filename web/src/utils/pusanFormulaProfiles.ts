import type {
  AdmissionProfile,
  AdmissionWeights,
} from "./admissionProfile";

export type PusanAdmissionProfileId =
  | "interview"
  | "document-interview"
  | "written"
  | "sports"
  | "practical"
  | "biomedical-written"
  | "contract";

export type PusanAdmissionWeights = AdmissionWeights;

export type PusanAdmissionProfile = AdmissionProfile & {
  id: PusanAdmissionProfileId;
  weights: PusanAdmissionWeights;
  totalScore: 100;
};

type ProfileDefinition = Omit<
  PusanAdmissionProfile,
  "sourcePage" | "englishFormulaText" | "gpaFormulaText"
>;

const PROFILE_DEFINITIONS: Record<PusanAdmissionProfileId, ProfileDefinition> = {
  interview: {
    id: "interview",
    label: "면접형",
    weights: {
      english: 30,
      gpa: 30,
      document: 0,
      interview: 40,
      written: 0,
      practical: 0,
      industryExperience: 0,
    },
    totalScore: 100,
  },
  "document-interview": {
    id: "document-interview",
    label: "서류·면접형",
    weights: {
      english: 30,
      gpa: 30,
      document: 20,
      interview: 20,
      written: 0,
      practical: 0,
      industryExperience: 0,
    },
    totalScore: 100,
  },
  written: {
    id: "written",
    label: "지필고사형",
    weights: {
      english: 30,
      gpa: 20,
      document: 0,
      interview: 0,
      written: 50,
      practical: 0,
      industryExperience: 0,
    },
    totalScore: 100,
  },
  sports: {
    id: "sports",
    label: "스포츠과학과형",
    weights: {
      english: 30,
      gpa: 20,
      document: 30,
      interview: 0,
      written: 20,
      practical: 0,
      industryExperience: 0,
    },
    totalScore: 100,
  },
  practical: {
    id: "practical",
    label: "실기형",
    weights: {
      english: 30,
      gpa: 20,
      document: 0,
      interview: 0,
      written: 0,
      practical: 50,
      industryExperience: 0,
    },
    totalScore: 100,
  },
  "biomedical-written": {
    id: "biomedical-written",
    label: "정보의생명공학 지필형",
    weights: {
      english: 20,
      gpa: 20,
      document: 20,
      interview: 0,
      written: 40,
      practical: 0,
      industryExperience: 0,
    },
    totalScore: 100,
  },
  contract: {
    id: "contract",
    label: "계약학과 편입형",
    weights: {
      english: 0,
      gpa: 30,
      document: 0,
      interview: 40,
      written: 0,
      practical: 0,
      industryExperience: 30,
    },
    totalScore: 100,
  },
};

const SOURCE_PAGES: Record<string, string> = {
  "2024": "2024학년도 모집요강 10~11쪽",
  "2025": "2025학년도 모집요강 14~15쪽",
  "2026": "2026학년도 모집요강 12~13쪽",
};

const PRACTICAL_PREFIXES = [
  "음악학과",
  "한국음악학과",
  "무용학과",
  "미술학과",
  "조형학과",
] as const;

const PUSAN_2024_DOCUMENT_DEPARTMENTS = new Set([
  "행정학과",
  "정치외교학과",
  "사회복지학과",
  "사회학과",
  "심리학과",
  "문헌정보학과",
  "미디어커뮤니케이션학과",
  "수학과",
  "통계학과",
  "지질환경과학과",
  "대기환경과학과",
  "해양학과",
  "약학부",
  "나노에너지공학과",
  "나노메카트로닉스공학과",
  "광메카트로닉스공학과",
  "예술문화영상학과",
]);

const PUSAN_2024_WRITTEN_DEPARTMENTS = new Set([
  "기계공학부",
  "고분자공학과",
  "유기소재스템공학과",
  "유기소재시스템공학과",
  "화공생명환경공학부(화공생명공학전공)",
  "화공생명환경공학부(환경공학전공)",
  "재료공학부",
  "전기전자공학부(전자공학전공)",
  "전기전자공학부(전기공학전공)",
  "건축공학과",
  "건축학과",
  "도시공학과",
  "사회기반시스템공학과",
  "항공우주공학과",
  "산업공학과",
  "조선·해양공학과",
  "교육학과",
  "특수교육과",
  "지리교육과",
  "수학교육과",
  "물리교육과",
  "생물교육과",
  "경영학과",
  "아동가족학과",
  "의류학과",
  "식품영양학과",
  "실내환경디자인학과",
  "식물생명과학과",
  "원예생명과학과",
  "동물생명자원과학과",
  "식품공학과",
  "생명환경화학과",
  "바이오소재과학과",
  "바이오산업기계공학과",
  "IT응용공학과",
  "바이오환경에너지학과",
  "조경학과",
  "식품자원경제학과",
]);

const PUSAN_RECENT_DOCUMENT_DEPARTMENTS = new Set([
  "행정학과",
  "정치외교학과",
  "사회복지학과",
  "사회학과",
  "심리학과",
  "문헌정보학과",
  "미디어커뮤니케이션학과",
  "경영학과",
  "약학부",
  "아동가족학과",
  "의류학과",
  "식품영양학과",
  "실내환경디자인학과",
  "나노에너지공학과",
  "나노메카트로닉스공학과",
  "광메카트로닉스공학과",
  "정보컴퓨터공학부",
  "정보컴퓨터공학부(컴퓨터공학전공)",
  "정보컴퓨터공학부(인공지능전공)",
  "의생명융합공학부(의생명공학전공)",
  "의생명융합공학부(데이터사이언스전공)",
  "예술문화영상학과",
]);

function normalizeDepartment(department: string): string {
  return department.replace(/\s+/g, "").trim();
}

function isPracticalDepartment(department: string): boolean {
  return PRACTICAL_PREFIXES.some((prefix) => department.startsWith(prefix));
}

function isDesignDepartment(department: string): boolean {
  return department.startsWith("디자인학과");
}

function getProfileId(
  year: string,
  department: string,
): PusanAdmissionProfileId {
  if (year === "2024") {
    if (department === "스포츠과학과") return "sports";
    if (isPracticalDepartment(department)) return "practical";
    if (
      department.startsWith("정보컴퓨터공학부")
      || department.startsWith("의생명융합공학부")
    ) {
      return "biomedical-written";
    }
    if (PUSAN_2024_WRITTEN_DEPARTMENTS.has(department)) return "written";
    if (PUSAN_2024_DOCUMENT_DEPARTMENTS.has(department)) {
      return "document-interview";
    }
    return "interview";
  }

  if (year === "2025" && department === "발전공학과") return "contract";
  if (isPracticalDepartment(department)) return "practical";
  if (
    PUSAN_RECENT_DOCUMENT_DEPARTMENTS.has(department)
    || isDesignDepartment(department)
    || (year === "2026" && department === "간호학과")
  ) {
    return "document-interview";
  }
  return "interview";
}

export function getPusanAdmissionProfile(
  year: string,
  department?: string,
): PusanAdmissionProfile | null {
  const sourcePage = SOURCE_PAGES[year];
  if (sourcePage === undefined) {
    return null;
  }

  const normalizedDepartment = normalizeDepartment(department ?? "");
  const profileId = getProfileId(year, normalizedDepartment);
  return {
    ...PROFILE_DEFINITIONS[profileId],
    sourcePage,
    englishFormulaText: PROFILE_DEFINITIONS[profileId].weights.english === 0
      ? null
      : `반영점수 = (TOEIC ÷ 990) × ${PROFILE_DEFINITIONS[profileId].weights.english}`,
    gpaFormulaText: PROFILE_DEFINITIONS[profileId].weights.gpa === 0
      ? null
      : `반영점수 = (백분위 점수 ÷ 100) × ${PROFILE_DEFINITIONS[profileId].weights.gpa}`,
  };
}
