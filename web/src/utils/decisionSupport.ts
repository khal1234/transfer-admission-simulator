import type { ConversionResult, DepartmentRecord } from "./converter";
import { getConversionFormula } from "./formulaRegistry";
import { isComparableRecord } from "./records";
import type { Target } from "./targets";

export type DecisionCategory = ConversionResult["status"];

export type DataConfidence = {
  level: "high" | "medium" | "low";
  label: "근거 높음" | "확인 필요" | "주의 필요";
  reasons: string[];
};

export type DecisionCandidate = {
  key: string;
  target: Target;
  referenceRecord: DepartmentRecord;
  score: ConversionResult;
  comparableYearCount: number;
  dataConfidence: DataConfidence;
};

/**
 * 모집요강 원문이 자료 폴더에 없어 2026-11-14 검토 때 환산식을 다시 맞대 보지
 * 못한 대학·연도. 틀렸다는 뜻이 아니라 「지금은 다시 확인할 수 없다」는 뜻이다.
 * 원문을 구해 대조하면 여기서 뺀다.
 */
const GUIDELINE_NOT_RECHECKED = new Set([
  "부산대학교|2024",
  "강원대학교|2024",
  "전북대학교|2024",
  "전북대학교|2025",
]);

/**
 * 무엇을 재나: 카드의 판정(내 환산점수 대 합격 환산점수)을 얼마나 믿을 수 있나.
 * 문턱과 근거: 판정을 흔드는 것만 센다 — 환산식을 확정하지 못했거나(주의), 요강 원문을 다시
 *   대조하지 못했거나 어느 합격자의 평균인지 모르는 경우(확인).
 * 못 보는 것: 합격 평균의 원점수(TOEIC·학점)를 환산점수에서 거꾸로 구한 것은 여기서 세지 않는다.
 *   판정은 대학이 공개한 환산점수끼리 견주므로 그 역산이 판정을 바꾸지 않는다. 역산 표시는
 *   원점수 옆 «≈»와 «근거 보기»가 맡는다. 예전에는 이것까지 세어 895개 학과 중 577개(충남대·충북대는
 *   전부)에 «확인·주의»가 붙었다(2026-11-15 사용자 지적).
 */
export function getDataConfidence(record: DepartmentRecord): DataConfidence {
  const formula = getConversionFormula(record.대학명, record.연도, record.학과);
  const hasComparableAverage = isComparableRecord(record);
  const reasons: string[] = [];

  if (!hasComparableAverage) {
    reasons.push("비교 가능한 합격 평균이 공개되지 않았습니다.");
  }

  if (formula === null) {
    reasons.push("적용 가능한 환산식을 확인하지 못했습니다.");
  } else if (formula.provenance === "assumed-from-other-year") {
    reasons.push("인접 연도 환산식을 가정했습니다.");
  } else if (formula.confidence !== "verified") {
    reasons.push("환산식에 추정 또는 근사값이 포함됩니다.");
  }

  if (GUIDELINE_NOT_RECHECKED.has(`${record.대학명}|${record.연도}`)) {
    reasons.push("이 연도의 모집요강 원문을 다시 확보하지 못해 환산식을 재확인하지 못했습니다.");
  }

  if (record.합격자기준 === "확인불가" || record.합격자기준 === undefined) {
    reasons.push("최초합격자와 최종등록자 중 어느 평균인지 공개되지 않았습니다.");
  }

  const hasLowConfidenceReason = !hasComparableAverage
    || formula === null
    || formula.provenance === "assumed-from-other-year"
    || formula.confidence !== "verified";

  if (hasLowConfidenceReason) {
    return { level: "low", label: "주의 필요", reasons };
  }

  if (reasons.length > 0) {
    return { level: "medium", label: "확인 필요", reasons };
  }

  return {
    level: "high",
    label: "근거 높음",
    reasons: ["해당 연도 공식 환산식과 대학 공개 점수를 사용했습니다."],
  };
}

export function countDecisionCategories(
  candidates: readonly { score: Pick<ConversionResult, "status"> }[],
): Record<DecisionCategory, number> {
  return candidates.reduce<Record<DecisionCategory, number>>((counts, candidate) => {
    counts[candidate.score.status] += 1;
    return counts;
  }, { safe: 0, borderline: 0, risk: 0, unknown: 0 });
}
