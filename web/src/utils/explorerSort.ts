import { calculateScore, type DepartmentRecord } from "./converter";
import { isComparableRecord } from "./records";

export type ExplorerSort =
  | "default"
  | "myMargin"
  | "toeicAsc"
  | "gpaAsc"
  | "recruitDesc";

export const EXPLORER_SORT_LABELS: Record<ExplorerSort, string> = {
  default: "기본 (대학·학과 순)",
  myMargin: "내 점수로 여유 있는 순",
  toeicAsc: "토익 합격 평균 낮은 순",
  gpaAsc: "학점 합격 평균 낮은 순",
  recruitDesc: "모집인원 많은 순",
};

export type ExplorerMargin = {
  diff: number | null;
  // 합격 평균 대비 비율(+0.05 = 평균보다 5% 높음). 학교마다 만점이 달라(전남 1000점,
  // 다른 곳 100점) 점수 차이로 줄 세우면 만점 큰 학교가 늘 맨 위로 온다.
  ratio: number | null;
  status: "safe" | "borderline" | "risk" | "unknown";
};

/**
 * 탐색 목록 한 줄에 내 점수를 대 본 격차. 지망 담기 판정과 같은 calculateScore 를 쓴다.
 * 못 보는 것: 탐색 목록은 학과마다 최신 해 한 줄뿐이라, 그 해 합격 평균이 비어 있으면
 * 이전 해로 내려가지 않고 '판정 불가'로 둔다(지망에 담으면 이전 해까지 본다).
 */
export function getExplorerMargin(
  record: DepartmentRecord,
  toeic: number | null,
  gpa100: number | null,
): ExplorerMargin {
  if (toeic === null && gpa100 === null) {
    return { diff: null, ratio: null, status: "unknown" };
  }

  const score = calculateScore(
    record.대학명,
    record.연도,
    toeic,
    gpa100,
    isComparableRecord(record) ? record : null,
    record.학과,
  );
  const ratio = score.diff !== null && score.acceptedIndexSum !== null && score.acceptedIndexSum > 0
    ? score.diff / score.acceptedIndexSum
    : null;
  return { diff: score.diff, ratio, status: score.status };
}

function compareNullable(
  left: number | null,
  right: number | null,
  direction: 1 | -1,
): number {
  // 값이 없는 줄은 방향과 상관없이 맨 뒤로 보낸다. 앞에 섞이면 정렬이 틀려 보인다.
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return (left - right) * direction;
}

export function sortExplorerRecords<T extends DepartmentRecord>(
  records: T[],
  sort: ExplorerSort,
  getMargin: (record: T) => ExplorerMargin,
): T[] {
  if (sort === "default") {
    return records;
  }

  // 원래 순서(대학·학과 순)를 동점 처리에 쓴다.
  const indexed = records.map((record, index) => ({ record, index }));
  const compare = (left: T, right: T): number => {
    switch (sort) {
      case "myMargin":
        return compareNullable(getMargin(left).ratio, getMargin(right).ratio, -1);
      case "toeicAsc":
        return compareNullable(left.최종합격_토익원점수, right.최종합격_토익원점수, 1);
      case "gpaAsc":
        return compareNullable(
          left.최종합격_학점원점수_100점만점,
          right.최종합격_학점원점수_100점만점,
          1,
        );
      case "recruitDesc":
        return compareNullable(left.모집인원, right.모집인원, -1);
    }
  };

  return indexed
    .sort((left, right) => compare(left.record, right.record) || left.index - right.index)
    .map(({ record }) => record);
}
