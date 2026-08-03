import {
  type DepartmentRecord,
  calculateScore,
} from "./converter";
import { getConversionFormula } from "./formulaRegistry";
import { isComparableRecord } from "./records";
import type { ComparisonBasis } from "./targets";

type YearComparison = {
  year: string;
  score: ReturnType<typeof calculateScore>;
};

/**
 * 판정을 어느 해에 걸 것인가.
 *
 * 최신 한 해로 고정하면 그 해가 유독 빡셌을 때 실제보다 비관적으로, 무른
 * 해였을 때 낙관적으로 읽힌다. 사용자가 물은 두 경우를 다 열어둔다 —
 * 합격선이 가장 낮았던 해로 보고 싶을 때와, 그래도 최신 기준으로만 보고
 * 싶을 때.
 *
 * 순위는 합격선 원값이 아니라 지표합 만점 대비 격차 비율로 매긴다. 연도마다
 * 배점이 달라(강원대 2026은 영어 150점 만점, 2025는 100점+전적대) 합격선이나
 * 격차의 점수값을 직접 비교하면 배점이 큰 해가 과장된다.
 *
 * 성적 입력 전에는 격차가 없으므로 순위를 못 매긴다. 그때는 최신으로 둔다.
 */
export function pickBasisRecord(
  comparisons: YearComparison[],
  historyByYear: ReadonlyMap<string, DepartmentRecord>,
  basis: ComparisonBasis,
): DepartmentRecord | undefined {
  const comparable = comparisons.filter(
    (comparison) => comparison.score.acceptedIndexSum !== null,
  );

  if (comparable.length === 0) {
    return undefined;
  }

  const ranked = comparable.filter(
    (comparison) => comparison.score.diff !== null,
  );

  // comparisons 가 내림차순이라 첫 항목이 최신이다.
  if (basis === "latest" || ranked.length === 0) {
    const latestComparison = comparable[0];
    return latestComparison === undefined
      ? undefined
      : historyByYear.get(latestComparison.year);
  }

  const getNormalizedDiff = (comparison: YearComparison): number => {
    const diff = comparison.score.diff ?? 0;
    const record = historyByYear.get(comparison.year);
    const formula = record === undefined
      ? null
      : getConversionFormula(record.대학명, record.연도, record.학과);
    const maxIndexSum = formula === null
      ? 0
      : (formula.convertEnglish?.(990) ?? 0) + (formula.convertGpa?.(100) ?? 0);

    return maxIndexSum > 0 ? diff / maxIndexSum : diff;
  };

  const chosen = ranked.reduce((best, comparison) => {
    const bestDiff = getNormalizedDiff(best);
    const currentDiff = getNormalizedDiff(comparison);

    if (basis === "lowest") {
      // 격차 비율이 가장 큰 해 = 그 해라면 가장 붙기 쉬웠다.
      return currentDiff > bestDiff ? comparison : best;
    }

    return currentDiff < bestDiff ? comparison : best;
  });

  return historyByYear.get(chosen.year);
}

export function getComparisonYearNotice(
  basis: ComparisonBasis,
  comparableRecord: DepartmentRecord | undefined,
  latestRecord: DepartmentRecord,
): string | null {
  if (
    basis !== "latest"
    || comparableRecord === undefined
    || comparableRecord.연도 === latestRecord.연도
    || isComparableRecord(latestRecord)
  ) {
    return null;
  }

  return `${latestRecord.연도}에는 비교 가능한 합격 평균이 없어 최신 유효 자료인 ${comparableRecord.연도} 평균을 사용합니다.`;
}
