import {
  calculateAcceptedScoreBreakdown,
  type DepartmentRecord,
} from "./converter";

export function getRecordYear(record: DepartmentRecord): number {
  const year = Number.parseInt(record.연도, 10);
  return Number.isFinite(year) ? year : Number.NEGATIVE_INFINITY;
}

/**
 * 이 줄의 합격 평균을 내 점수와 견줄 수 있는가.
 *
 * 무엇을 재나: 합격 인원이 0 인지, 지표합이 양수로 나오는지.
 * 문턱과 근거: 인원 0 이면 견주지 않는다. 다만 평균이 최초 합격자 기준인 대학
 *   (강원·충북·충남)은 인원 칸이 최종 등록자 수라서, 「등록 0명」이어도 최초
 *   합격자 평균은 대학이 실제로 공개한 값이다. 이 경우를 막으면 목록에는 평균이
 *   보이고 카드는 「비공개」라고 하는 일이 생긴다(2026-11-14 검토 8번).
 * 못 보는 것: 그 평균이 몇 명의 평균인지.
 */
export function isComparableRecord(record: DepartmentRecord): boolean {
  if (record.합격인원 === 0 && record.합격자기준 !== "최초") {
    return false;
  }

  const acceptedIndexSum = calculateAcceptedScoreBreakdown(record).indexSum;
  return (
    acceptedIndexSum !== null &&
    Number.isFinite(acceptedIndexSum) &&
    acceptedIndexSum > 0
  );
}

export function getLatestRecord(
  records: DepartmentRecord[]
): DepartmentRecord | undefined {
  return records.reduce<DepartmentRecord | undefined>((latest, record) => {
    if (!latest || getRecordYear(record) > getRecordYear(latest)) {
      return record;
    }

    return latest;
  }, undefined);
}

export function getLatestComparableRecord(
  records: DepartmentRecord[]
): DepartmentRecord | undefined {
  return records.reduce<DepartmentRecord | undefined>((latest, record) => {
    if (!isComparableRecord(record)) {
      return latest;
    }

    if (!latest || getRecordYear(record) > getRecordYear(latest)) {
      return record;
    }

    return latest;
  }, undefined);
}
