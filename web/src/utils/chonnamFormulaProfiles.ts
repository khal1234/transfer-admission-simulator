import type { AdmissionProfile, AdmissionWeights } from "./admissionProfile";

export type ChonnamAdmissionProfileId =
  | "standard"
  | "veterinary-stage"
  | "pharmacy"
  | "arts"
  | "yeosu"
  | "veterinary-2026"
  | "nursing-2026"
  | "design-2026";

export type ChonnamAdmissionProfile = AdmissionProfile & {
  id: ChonnamAdmissionProfileId;
};

type ProfileDefinition = {
  id: ChonnamAdmissionProfileId;
  label: string;
  weights: AdmissionWeights;
  totalScore: number;
};

const SOURCE_PAGES: Record<string, string> = {
  "2024": "2024학년도 모집요강 PDF 11·12·35쪽",
  "2025": "2025학년도 모집요강 PDF 12·13·43쪽",
  "2026": "2026학년도 모집요강 PDF 12·13·38쪽",
};

const ARTS_DEPARTMENTS: Record<string, ReadonlySet<string>> = {
  "2024": new Set([
    "체육교육과",
    "관현악전공",
    "작곡전공",
    "국악성악전공",
    "국악기악전공",
    "국악작곡이론전공",
    "조소전공",
    "공예전공",
    "디자인학과",
  ]),
  "2025": new Set([
    "체육교육과",
    "성악전공",
    "피아노전공",
    "관현악전공",
    "작곡전공",
    "국악기악전공",
    "국악작곡이론전공",
    "한국화전공",
    "조소전공",
    "디자인학과",
  ]),
  "2026": new Set([
    "체육교육과",
    "성악전공",
    "피아노전공",
    "관현악전공",
    "작곡전공",
    "국악성악전공",
    "국악기악전공",
    "한국화전공",
    "서양화전공",
    "조소전공",
    "공예전공",
  ]),
};

const YEOSU_DEPARTMENTS: Record<string, ReadonlySet<string>> = {
  "2024": new Set([
    "전자통신공학전공",
    "컴퓨터공학전공",
    "전기및반도체공학전공",
    "기계설계공학전공",
    "기계시스템공학전공",
    "스마트플랜트공학전공",
    "냉동공조공학과",
    "환경시스템공학과",
    "생명산업공학과",
    "화공생명공학과",
    "건축디자인학과",
    "의공학과",
    "헬스케어메디컬공학부",
    "석유화학소재공학과",
    "산업기술융합공학과(야간)",
    "국제학부(영어학전공)",
    "국제학부(일본학전공)",
    "국제학부(중국학전공)",
    "글로벌비즈니스학부",
    "국제통상학전공",
    "물류교통학과",
    "멀티미디어전공",
    "전자상거래전공",
    "문화관광경영학과",
    "기관시스템공학과",
    "양식생물학과",
    "조선해양공학과",
    "해양생산관리학과",
    "해양융합과학과",
    "해양바이오식품학과",
    "수산생명의학과",
    "해양경찰학과",
    "스마트수산자원관리학과",
  ]),
  "2025": new Set([
    "전자통신공학과",
    "컴퓨터공학전공",
    "전기및반도체공학전공",
    "기계설계공학과",
    "기계시스템공학과",
    "메카트로닉스공학과",
    "냉동공조공학과",
    "환경시스템공학과",
    "융합생명공학과",
    "화공생명공학과",
    "건축디자인학과",
    "헬스케어메디컬공학부",
    "석유화학소재공학과",
    "산업기술융합공학과(야간)",
    "국제학부(영어학전공)",
    "국제학부(일본학전공)",
    "국제학부(중국학전공)",
    "국제통상학전공",
    "물류교통학과",
    "멀티미디어전공",
    "전자상거래전공",
    "문화관광경영학과",
    "기관시스템공학과",
    "양식생물학과",
    "조선해양공학과",
    "해양생산관리학과",
    "해양융합과학과",
    "해양바이오식품학과",
    "수산생명의학과",
    "해양경찰학과",
    "스마트수산자원관리학과",
  ]),
  "2026": new Set([
    "전자통신공학과",
    "컴퓨터공학전공",
    "전기및반도체공학전공",
    "기계설계공학과",
    "기계시스템공학과",
    "메카트로닉스공학과",
    "냉동공조공학과",
    "환경시스템공학과",
    "융합생명공학과",
    "화공생명공학과",
    "건축디자인학과",
    "헬스케어메디컬공학부",
    "석유화학소재공학과",
    "산업기술융합공학과(야간)",
    "국제학부(영어학전공)",
    "국제학부(일본학전공)",
    "국제학부(중국학전공)",
    "글로벌비즈니스학부",
    "국제통상학전공",
    "물류교통학과",
    "멀티미디어전공",
    "전자상거래전공",
    "문화관광경영학과",
    "기관시스템공학과",
    "양식생물학과",
    "조선해양공학과",
    "해양생산관리학과",
    "해양융합과학과",
    "해양바이오식품학과",
    "수산생명의학과",
    "해양경찰학과",
    "스마트수산자원관리학과",
  ]),
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

const PROFILE_DEFINITIONS: Record<ChonnamAdmissionProfileId, ProfileDefinition> = {
  standard: {
    id: "standard",
    label: "광주캠퍼스 표준형",
    weights: makeWeights(400, 200, 400, 0, 0),
    totalScore: 1000,
  },
  "veterinary-stage": {
    id: "veterinary-stage",
    label: "수의학과 단계선발형",
    weights: makeWeights(400, 200, 400, 0, 0),
    totalScore: 1000,
  },
  pharmacy: {
    id: "pharmacy",
    label: "약학부 필기형",
    weights: makeWeights(300, 200, 0, 500, 0),
    totalScore: 1000,
  },
  arts: {
    id: "arts",
    label: "예체능 실기형",
    weights: makeWeights(0, 300, 200, 0, 500),
    totalScore: 1000,
  },
  yeosu: {
    id: "yeosu",
    label: "여수캠퍼스형",
    weights: makeWeights(0, 600, 400, 0, 0),
    totalScore: 1000,
  },
  "veterinary-2026": {
    id: "veterinary-2026",
    label: "2026 수의학과 3단계형",
    weights: makeWeights(300, 100, 300, 300, 0),
    totalScore: 1000,
  },
  "nursing-2026": {
    id: "nursing-2026",
    label: "2026 간호학과 필기형",
    weights: makeWeights(400, 200, 0, 400, 0),
    totalScore: 1000,
  },
  "design-2026": {
    id: "design-2026",
    label: "2026 디자인학과 실기형",
    weights: makeWeights(0, 200, 400, 0, 400),
    totalScore: 1000,
  },
};

function normalizeDepartment(department: string): string {
  return department.replace(/\s+/g, "").trim();
}

function getProfileId(
  year: string,
  department: string,
): ChonnamAdmissionProfileId {
  if (department === "이론전공") return "standard";
  if (department === "약학부") return "pharmacy";
  if (department === "수의학과") {
    return year === "2026" ? "veterinary-2026" : "veterinary-stage";
  }
  if (year === "2026" && department === "간호학과") return "nursing-2026";
  if (year === "2026" && department === "디자인학과") return "design-2026";
  if (YEOSU_DEPARTMENTS[year]?.has(department)) return "yeosu";
  if (ARTS_DEPARTMENTS[year]?.has(department)) return "arts";
  return "standard";
}

function getGpaFormulaText(gpaWeight: number): string {
  return `전적대성적 반영점수 = 백분율 × ${gpaWeight / 100}`;
}

export function getChonnamAdmissionProfile(
  year: string,
  department?: string,
): ChonnamAdmissionProfile | null {
  const sourcePage = SOURCE_PAGES[year];
  if (sourcePage === undefined) return null;

  const profileId = getProfileId(year, normalizeDepartment(department ?? ""));
  const definition = PROFILE_DEFINITIONS[profileId];
  const { english, gpa } = definition.weights;
  const stageLabel = profileId === "veterinary-stage"
    ? `${definition.label}(${year === "2024" ? "1단계 4배수" : "1단계 3배수"})`
    : definition.label;

  return {
    ...definition,
    label: stageLabel,
    sourcePage,
    englishFormulaText: english === 0
      ? null
      : `공인영어 반영점수 = (TOEIC ÷ 990) × ${english}`,
    gpaFormulaText: getGpaFormulaText(gpa),
  };
}
