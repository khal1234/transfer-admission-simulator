import guidelineData from "../data/guidelineChanges.json";

/** 새 학년도 문서와 직전 학년도 요강을 맞대 본 결과 한 줄. */
export type GuidelineChangeItem = {
  area: string;
  scope: string;
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

/** 이 사이트가 계산하는 점수(영어·전적대 환산)가 달라지는 대학. */
export function hasScoreAffectingChange(entry: UniversityGuidelineChange): boolean {
  return entry.changes.some((change) => change.affectsScore);
}
