import { describe, expect, it } from "vitest";
import type { DepartmentRecord } from "./converter";
import { sortExplorerRecords, type ExplorerMargin } from "./explorerSort";

function record(
  department: string,
  toeic: number | null,
  recruit: number | null,
): DepartmentRecord {
  return {
    대학명: "부산대학교",
    연도: "2026",
    학과: department,
    학과_원본명: department,
    모집인원: recruit,
    지원인원: null,
    합격인원: null,
    최종합격_토익환산점수: null,
    최종합격_토익원점수: toeic,
    최종합격_학점환산점수: null,
    최종합격_학점원점수_100점만점: null,
  };
}

const rows = [record("가", 900, 3), record("나", null, 10), record("다", 800, null)];
const noMargin = (): ExplorerMargin => ({ diff: null, ratio: null, status: "unknown" });

describe("sortExplorerRecords", () => {
  it("keeps the original order for default", () => {
    expect(sortExplorerRecords(rows, "default", noMargin).map((r) => r.학과)).toEqual(["가", "나", "다"]);
  });

  it("puts missing values last in either direction", () => {
    expect(sortExplorerRecords(rows, "toeicAsc", noMargin).map((r) => r.학과)).toEqual(["다", "가", "나"]);
    expect(sortExplorerRecords(rows, "recruitDesc", noMargin).map((r) => r.학과)).toEqual(["나", "가", "다"]);
  });

  // 점수 차이가 커도(1000점 만점 학교) 비율이 작으면 뒤로 간다
  it("sorts by ratio to the accepted average, not by raw points", () => {
    const margins: Record<string, [number | null, number | null]> = {
      가: [40, 0.05],
      나: [null, null],
      다: [5, 0.08],
    };
    const sorted = sortExplorerRecords(rows, "myMargin", (r) => ({
      diff: margins[r.학과]?.[0] ?? null,
      ratio: margins[r.학과]?.[1] ?? null,
      status: "unknown",
    }));
    expect(sorted.map((r) => r.학과)).toEqual(["다", "가", "나"]);
  });
});
