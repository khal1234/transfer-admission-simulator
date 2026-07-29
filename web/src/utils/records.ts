import {
  calculateAcceptedScoreBreakdown,
  type DepartmentRecord,
} from "./converter";

export function getRecordYear(record: DepartmentRecord): number {
  const year = Number.parseInt(record.연도, 10);
  return Number.isFinite(year) ? year : Number.NEGATIVE_INFINITY;
}

export function isComparableRecord(record: DepartmentRecord): boolean {
  if (record.합격인원 === 0) {
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
