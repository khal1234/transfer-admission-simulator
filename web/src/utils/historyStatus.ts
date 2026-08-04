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
  // 같은 계열의 다른 이름보다 이 모집단위 자체의 제외 기록이 더 직접적인
  // 근거다. 두 정보가 함께 있을 때 이름 변경으로 오인하지 않는다.
  if (row.exclusionReason !== null) {
    return {
      kind: "excluded",
      label: "별도 전형으로 비교 제외",
      title: row.exclusionReason,
    };
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
  return { kind: "unknown", label: "모집 여부 또는 자료 확인 불가" };
}
