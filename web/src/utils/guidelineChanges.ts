import guidelineData from "../data/guidelineChanges.json";

/** 새 학년도 문서와 직전 학년도 요강을 맞대 본 결과 한 줄. */
export type GuidelineChangeItem = {
  area: string;
  scope: string;
  /** 화면에 먼저 보이는 한 줄. 전·후 글은 눌렀을 때만 편다. */
  title: string;
  /** 해당하는 학과 계열. 비어 있으면 학과를 가리지 않는 항목이다. */
  groups: string[];
  /** 학과별 항목이 해당하는 사이트의 학과 이름. 지망 카드는 여기 실린 학과에만 그 항목을 알린다. */
  departments: string[];
  before: string;
  after: string;
  impact: string | null;
  affectsScore: boolean;
  /** 직전 학년도 요강에서 해당 내용을 못 찾았으면 null. */
  pageBefore: string | null;
  pageAfter: string;
};

export type UniversityGuidelineChange = {
  univ: string;
  documentKind: string;
  documentTitle: string;
  sourceFile: string;
  verdict: "changed" | "same" | "unknown";
  headline: string;
  changes: GuidelineChangeItem[];
  /** 사람이 원문을 보고 확인했는가. 자동 대조만 한 상태면 false. */
  ownerConfirmed: boolean;
};

export type GuidelineChanges = {
  targetYear: string;
  baseYear: string;
  generatedAt: string;
  universities: UniversityGuidelineChange[];
};

export const GUIDELINE_CHANGES = guidelineData as GuidelineChanges;

export function getGuidelineChange(univ: string): UniversityGuidelineChange | null {
  return GUIDELINE_CHANGES.universities.find((entry) => entry.univ === univ) ?? null;
}

/** 학과를 가리지 않는 항목인가. */
export function isCommonChange(change: GuidelineChangeItem): boolean {
  return change.groups.length === 0;
}

/**
 * 점수 계산이 달라지는 범위.
 * all = 학과를 가리지 않는 항목에서 달라짐, some = 일부 학과에서만 달라짐.
 */
export function getScoreChangeReach(entry: UniversityGuidelineChange): "all" | "some" | "none" {
  const affecting = entry.changes.filter((change) => change.affectsScore);
  if (affecting.length === 0) {
    return "none";
  }

  return affecting.some(isCommonChange) ? "all" : "some";
}

/** 한 줄 앞에 붙는 짧은 갈래 이름. */
const AREA_SHORT: Record<string, string> = {
  공인영어: "영어",
  전적대성적: "전적대",
  지원자격: "자격",
  모집단위: "모집",
};

export function getAreaLabel(change: GuidelineChangeItem): string {
  return AREA_SHORT[change.area] ?? change.area;
}

/**
 * 이 학과의 지망 카드에 알릴 항목 — 이 학과 이름이 실린 학과별 항목을 앞에,
 * 학과를 가리지 않는 항목을 뒤에 둔다. 다른 학과의 항목은 넣지 않는다
 * (부산대 기계공학부 카드에 «세 학과의 면접 배점 변경»이 뜨던 것, 2026-11-14 사용자 지적).
 * 못 보는 것: 사이트에 없는 이름으로만 적힌 학과별 항목은 어느 카드에도 뜨지 않는다.
 */
export function getRelevantChanges(
  entry: UniversityGuidelineChange,
  department: string,
): GuidelineChangeItem[] {
  return [
    ...entry.changes.filter((change) => change.departments.includes(department)),
    ...entry.changes.filter(isCommonChange),
  ];
}

/**
 * 이 학과의 카드에 «주의»로 띄울 항목 — 해당 항목 가운데 점수 계산이 달라지는 것만.
 * 못 보는 것: 새 식으로 다시 계산해 판정이 실제로 뒤집히는지는 재지 않는다.
 */
export function getScoreCautions(
  entry: UniversityGuidelineChange,
  department: string,
): GuidelineChangeItem[] {
  return getRelevantChanges(entry, department).filter((change) => change.affectsScore);
}

export type GuidelineGroupRow = {
  entry: UniversityGuidelineChange;
  change: GuidelineChangeItem;
};

export type GuidelineGroup = {
  group: string;
  universityCount: number;
  rows: GuidelineGroupRow[];
};

/**
 * 학과별 항목을 계열로 모은다 — 같은 계열(예: 간호)이 달라진 대학을 한데 보려는 것.
 * 겹치는 대학이 많은 계열을 앞에 둔다.
 */
export function getGuidelineGroups(
  universities: UniversityGuidelineChange[] = GUIDELINE_CHANGES.universities,
): GuidelineGroup[] {
  const byGroup = new Map<string, GuidelineGroupRow[]>();

  [...universities]
    .sort((a, b) => a.univ.localeCompare(b.univ, "ko"))
    .forEach((entry) => {
      entry.changes.forEach((change) => {
        change.groups.forEach((group) => {
          byGroup.set(group, [...(byGroup.get(group) ?? []), { entry, change }]);
        });
      });
    });

  return [...byGroup.entries()]
    .map(([group, rows]) => ({
      group,
      rows,
      universityCount: new Set(rows.map((row) => row.entry.univ)).size,
    }))
    .sort((a, b) => (
      b.universityCount - a.universityCount || a.group.localeCompare(b.group, "ko")
    ));
}
