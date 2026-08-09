import {
  calculateScore,
  type ConversionResult,
  type DepartmentRecord,
} from "./converter";
import { getCompetitionRatio } from "./competition";
import { pickBasisRecord } from "./comparisonBasis";
import { getConversionFormula } from "./formulaRegistry";
import { getLatestComparableRecord, getLatestRecord, isComparableRecord } from "./records";
import { getGpaDisclosure, getToeicDisclosure } from "./scoreProvenance";
import { getRecordKey, type ComparisonBasis, type Target } from "./targets";

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
  normalizedDiffPercent: number | null;
  comparableYearCount: number;
  competitionRatio: number | null;
  dataConfidence: DataConfidence;
};

export type CandidateSort = "gap" | "recruited" | "competition";

function getNormalizedDiffPercent(
  record: DepartmentRecord,
  diff: number | null,
): number | null {
  if (diff === null) return null;
  const formula = getConversionFormula(record.대학명, record.연도, record.학과);
  if (formula === null) return null;
  const maxIndexSum = (formula.convertEnglish?.(990) ?? 0)
    + (formula.convertGpa?.(100) ?? 0);
  if (maxIndexSum <= 0) return null;
  return Math.round((diff / maxIndexSum) * 10_000) / 100;
}

export function getDataConfidence(record: DepartmentRecord): DataConfidence {
  const formula = getConversionFormula(record.대학명, record.연도, record.학과);
  const toeicDisclosure = getToeicDisclosure(record.대학명).disclosure;
  const gpaDisclosure = getGpaDisclosure(record.대학명).disclosure;
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

  if (toeicDisclosure === "derived-approximate") {
    reasons.push("TOEIC 원점수는 구간 환산표에서 역산한 근사값입니다.");
  } else if (toeicDisclosure === "derived-exact") {
    reasons.push("TOEIC 원점수는 공개 환산점수에서 역산했습니다.");
  }

  if (gpaDisclosure === "derived-approximate") {
    reasons.push("GPA 원점수는 구간 환산표에서 역산한 근사값입니다.");
  } else if (gpaDisclosure === "derived-exact") {
    reasons.push("GPA 원점수는 공개 환산점수에서 역산했습니다.");
  }

  if (record.합격자기준 === "확인불가" || record.합격자기준 === undefined) {
    reasons.push("최초합격자와 최종등록자 중 어느 평균인지 공개되지 않았습니다.");
  }

  const hasLowConfidenceReason = !hasComparableAverage
    || formula === null
    || formula.provenance === "assumed-from-other-year"
    || formula.confidence !== "verified"
    || toeicDisclosure === "derived-approximate"
    || gpaDisclosure === "derived-approximate";

  if (hasLowConfidenceReason) {
    return { level: "low", label: "주의 필요", reasons };
  }

  if (reasons.length > 0) {
    return { level: "medium", label: "확인 필요", reasons };
  }

  return {
    level: "high",
    label: "근거 높음",
    reasons: ["해당 연도 공식 환산식과 대학 공개 원점수를 사용했습니다."],
  };
}

export function buildDecisionCandidates(
  recordsByDepartment: ReadonlyMap<string, DepartmentRecord[]>,
  recentYears: readonly string[],
  toeic: number | null,
  gpa100: number | null,
  comparisonBasis: ComparisonBasis,
): DecisionCandidate[] {
  const candidates: DecisionCandidate[] = [];

  recordsByDepartment.forEach((history) => {
    const latestRecord = getLatestRecord(history);
    if (latestRecord === undefined) {
      return;
    }

    const historyByYear = new Map(history.map((record) => [record.연도, record]));
    const comparisons = recentYears.map((year) => {
      const record = historyByYear.get(year);
      const comparableRecord = record !== undefined && isComparableRecord(record)
        ? record
        : null;

      return {
        year,
        score: calculateScore(
          latestRecord.대학명,
          year,
          toeic,
          gpa100,
          comparableRecord,
          latestRecord.학과,
        ),
      };
    });
    const comparableRecord = pickBasisRecord(
      comparisons,
      historyByYear,
      comparisonBasis,
    ) ?? getLatestComparableRecord(history);
    const referenceRecord = comparableRecord ?? latestRecord;
    const score = calculateScore(
      referenceRecord.대학명,
      referenceRecord.연도,
      toeic,
      gpa100,
      comparableRecord ?? null,
      referenceRecord.학과,
    );

    candidates.push({
      key: getRecordKey(referenceRecord.대학명, referenceRecord.학과),
      target: { univ: referenceRecord.대학명, dept: referenceRecord.학과 },
      referenceRecord,
      score,
      normalizedDiffPercent: getNormalizedDiffPercent(referenceRecord, score.diff),
      comparableYearCount: history.filter(isComparableRecord).length,
      competitionRatio: getCompetitionRatio(referenceRecord),
      dataConfidence: getDataConfidence(referenceRecord),
    });
  });

  return candidates;
}

function compareNullableNumbers(
  left: number | null,
  right: number | null,
  direction: "asc" | "desc",
): number {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return direction === "asc" ? left - right : right - left;
}

export function sortDecisionCandidates(
  candidates: readonly DecisionCandidate[],
  sort: CandidateSort,
): DecisionCandidate[] {
  return [...candidates].sort((left, right) => {
    if (sort === "recruited") {
      return compareNullableNumbers(
        left.referenceRecord.모집인원,
        right.referenceRecord.모집인원,
        "desc",
      ) || left.target.dept.localeCompare(right.target.dept, "ko");
    }

    if (sort === "competition") {
      return compareNullableNumbers(
        left.competitionRatio,
        right.competitionRatio,
        "asc",
      ) || left.target.dept.localeCompare(right.target.dept, "ko");
    }

    return compareNullableNumbers(
      left.normalizedDiffPercent,
      right.normalizedDiffPercent,
      "desc",
    )
      || left.target.dept.localeCompare(right.target.dept, "ko");
  });
}

export function countDecisionCategories(
  candidates: readonly Pick<DecisionCandidate, "score">[],
): Record<DecisionCategory, number> {
  return candidates.reduce<Record<DecisionCategory, number>>((counts, candidate) => {
    counts[candidate.score.status] += 1;
    return counts;
  }, { safe: 0, borderline: 0, risk: 0, unknown: 0 });
}
