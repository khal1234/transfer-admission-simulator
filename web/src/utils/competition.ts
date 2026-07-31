import type { DepartmentRecord } from "./converter";

export function getCompetitionRatio(
  record: Pick<DepartmentRecord, "모집인원" | "지원인원">,
): number | null {
  const recruited = record.모집인원;
  const applied = record.지원인원;

  if (
    recruited === null
    || applied === null
    || recruited <= 0
    || applied < 0
  ) {
    return null;
  }

  return Math.round((applied / recruited) * 100) / 100;
}

export function formatCompetitionRatio(
  record: Pick<DepartmentRecord, "모집인원" | "지원인원">,
): string {
  const ratio = getCompetitionRatio(record);
  return ratio === null ? "-" : `${Math.round(ratio * 10) / 10}:1`;
}
