import type { DepartmentRecord } from "./converter";

export type RecentHistoryRow = {
  year: string;
  record: DepartmentRecord | null;
  exclusionReason: string | null;
  exceptionLookupStatus: "loading" | "ready" | "error";
  siblingDepartments: string[];
};

export function getRecentHistoryStatus(row: RecentHistoryRow): {
  kind: "exact" | "renamed" | "excluded" | "loading" | "error" | "unknown";
  label: string;
  title?: string;
} {
  if (row.record !== null) {
    return { kind: "exact", label: "정확한 이름의 기록 존재" };
  }
  if (row.siblingDepartments.length > 0) {
    const names = row.siblingDepartments.map((name) => `「${name}」`).join(", ");
    return { kind: "renamed", label: "다른 이름으로 모집", title: names };
  }
  if (row.exceptionLookupStatus === "loading") {
    return { kind: "loading", label: "예외 이력 로딩 중" };
  }
  if (row.exceptionLookupStatus === "error") {
    return { kind: "error", label: "예외 이력 로딩 실패" };
  }
  if (row.exclusionReason !== null) {
    return {
      kind: "excluded",
      label: "별도 전형으로 비교 제외",
      title: row.exclusionReason,
    };
  }
  return { kind: "unknown", label: "모집 여부 또는 자료 확인 불가" };
}
