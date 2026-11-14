import eligibilityData from "../data/eligibility.json";

/** 모집요강에 적힌 지원 자격 최저 기준 한 줄. 자료 모양은 tools 쪽 생성물과 같다. */
export type EligibilityRule = {
  univ: string;
  year: string;
  departments: string[] | null;
  exceptDepartments: string[];
  minToeic: number | null;
  minGpa100: number | null;
  text: string;
  sourceFile: string;
  page: string;
};

export type EligibilityFailure = {
  rule: EligibilityRule;
  /** 「TOEIC 850점 이상」처럼 화면에 바로 쓰는 짧은 말. */
  requirement: string;
};

export type EligibilityCheck = {
  /** 기준을 읽은 요강의 학년도. 규칙이 없으면 null. */
  year: string | null;
  rules: EligibilityRule[];
  failures: EligibilityFailure[];
};

/**
 * 이 학년도보다 오래된 요강에만 있는 기준은 쓰지 않는다.
 * 부산대 국제학부 TOEIC 800 은 2025 요강에만 있고 2026 요강·2027 주요사항에는
 * 없다. 없어진 기준으로 «지원 자격 미달»을 띄우면 안 된다. 합격 평균의 가장
 * 최근 학년도(2026)와 맞춘다 — 새 학년도 결과를 넣을 때 같이 올린다.
 */
const OLDEST_RULE_YEAR = 2026;

const RULES = (eligibilityData as { rules: EligibilityRule[] }).rules.filter(
  (rule) => Number.parseInt(rule.year, 10) >= OLDEST_RULE_YEAR,
);

function appliesTo(rule: EligibilityRule, department: string): boolean {
  if (rule.departments === null) {
    return !rule.exceptDepartments.includes(department);
  }
  return rule.departments.includes(department);
}

/**
 * 그 대학의 가장 최근 학년도 요강에서 이 모집단위에 걸리는 최저 기준.
 *
 * 무엇을 재나: 대학 이름과 모집단위 이름이 자료와 글자까지 같은지.
 * 못 보는 것: 요강이 최저 점수를 숫자로 적지 않은 자격(자격증·이수 학점·전공
 *   제한 등), TOEIC 이 아닌 다른 영어 시험.
 */
export function getEligibilityRules(
  univ: string,
  department: string,
): { year: string | null; rules: EligibilityRule[] } {
  const ofUniversity = RULES.filter((rule) => rule.univ === univ);
  if (ofUniversity.length === 0) return { year: null, rules: [] };

  const latestYear = ofUniversity
    .map((rule) => rule.year)
    .sort((a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10))[0] ?? null;

  return {
    year: latestYear,
    rules: ofUniversity.filter((rule) => (
      rule.year === latestYear && appliesTo(rule, department)
    )),
  };
}

/** 점수를 아직 안 넣은 항목은 미달로 치지 않는다. */
export function checkEligibility(
  univ: string,
  department: string,
  toeic: number | null,
  gpa100: number | null,
): EligibilityCheck {
  const { year, rules } = getEligibilityRules(univ, department);
  const failures: EligibilityFailure[] = [];

  rules.forEach((rule) => {
    const parts: string[] = [];
    if (rule.minToeic !== null && toeic !== null && toeic < rule.minToeic) {
      parts.push(`TOEIC ${rule.minToeic}점 이상`);
    }
    if (rule.minGpa100 !== null && gpa100 !== null && gpa100 < rule.minGpa100) {
      parts.push(`전적대 백분위 ${rule.minGpa100} 이상`);
    }
    if (parts.length > 0) {
      failures.push({ rule, requirement: parts.join(" · ") });
    }
  });

  return { year, rules, failures };
}

export function describeEligibilityFailure(check: EligibilityCheck): string | null {
  if (check.failures.length === 0) return null;
  return [...new Set(check.failures.map((failure) => failure.requirement))].join(" · ");
}
