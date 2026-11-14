/**
 * 새 학년도에 점수 계산이 바뀌는 학과에서 «그래서 내 점수에는 유리한가 불리한가»를 낸다.
 *
 * 달라진 점 목록은 무엇이 바뀌었는지만 말한다. 지원자가 알고 싶은 것은 그 변화가 자기 점수에
 * 어느 쪽으로 듣는가다(2026-11-15 사용자 지적). 지금은 전체 모집단위의 식이 바뀐 충북대만 다룬다.
 * 충남대 약학과·인천대 조형예술학부도 점수 계산이 바뀌지만, 필답고사·면접처럼 여기 넣는 값이 아닌
 * 요소가 바뀐 것이라 내 점수로 견줄 수 없어 넣지 않았다.
 */
import { getChungbukEnglishScore } from "./chungbukFormulaProfiles";
import type { DepartmentRecord } from "./converter";
import { formatScore, formatSignedScore } from "./formatScore";

export type GuidelineImpactTone = "better" | "worse" | "same" | "blocked" | "unknown";

export type GuidelineImpact = {
  tone: GuidelineImpactTone;
  /** 판정 딱지. 훑어보기만 해도 어느 쪽인지 알게 두세 낱말로. */
  label: string;
  /** 딱지 옆 한 줄. 판정을 만든 숫자만. */
  headline: string;
  /** 영어 반영점수의 전 → 후. 카드의 펼침 안에 작은 표로 보인다. 견줄 숫자가 없으면 빈 배열. */
  rows: GuidelineImpactRow[];
  /** 표로 못 적는 것 한두 문장. 카드에서는 펼침 안에 둔다. */
  detail: string;
};

export type GuidelineImpactRow = {
  label: string;
  before: string;
  after: string;
};

/** 2027학년도 충북대 기본계획 14쪽(파일 쪽수): 수의학과·약학과·제약학과는 TOEIC 성적 미반영. */
const CHUNGBUK_2027_NO_TOEIC = new Set(["수의학과", "약학과", "제약학과"]);

/**
 * 2027학년도 충북대 TOEIC 환산점수(100점 만점). 근거: 2027학년도 편입학전형 기본계획 14쪽(파일 쪽수) 환산표.
 * 990점 100점에서 5점마다 1점씩 내려가 795점 61점, 780~790점 60점부터 15점 구간마다 1점씩 내려가
 * 495~505점 41점, 380~490점 40점, 379점 이하 0점.
 */
export function getChungbuk2027ToeicConverted(toeic: number): number {
  const score = Math.min(990, Math.floor(toeic / 5) * 5);

  if (score >= 795) {
    return 100 - (990 - score) / 5;
  }
  if (score >= 495) {
    return 60 - Math.floor((790 - score) / 15);
  }
  return score >= 380 ? 40 : 0;
}

/** 2027학년도 충북대 공인영어 반영점수(60점 만점) = 30 + 환산점수 × 0.3. 근거: 같은 문서 12·14쪽. */
export function getChungbuk2027EnglishScore(toeic: number): number {
  return 30 + getChungbuk2027ToeicConverted(toeic) * 0.3;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/** 이만큼도 안 움직이면 «거의 같다»로 본다. 화면에 소수 둘째 자리까지 보이므로 그 아래는 차이로 치지 않는다. */
const SAME_THRESHOLD = 0.05;

/**
 * @param referenceRecord 카드가 판정에 쓰는 해의 합격 자료. 2026학년도 것일 때만 합격 평균과 견준다.
 */
export function getGuidelineImpact(
  university: string,
  department: string,
  toeic: number | null,
  referenceRecord: DepartmentRecord | null,
): GuidelineImpact | null {
  if (university !== "충북대학교") {
    return null;
  }

  if (CHUNGBUK_2027_NO_TOEIC.has(department)) {
    return {
      tone: "blocked",
      label: "TOEIC 지원 불가",
      headline: "TOEIC만으로는 2027학년도에 지원할 수 없습니다.",
      rows: [],
      detail: "TEPS 370점 이상 또는 TOEFL 92점 이상이 있어야 합니다. 이 카드의 숫자는 TOEIC으로 낸 2026학년도 기준이라 올해 판정으로 쓸 수 없습니다.",
    };
  }

  if (toeic === null) {
    return {
      tone: "unknown",
      label: "TOEIC 입력 필요",
      headline: "TOEIC을 넣으면 유불리를 계산합니다.",
      rows: [
        { label: "TOEIC 990", before: "60", after: "60" },
        { label: "TOEIC 850", before: "56.5", after: "51.6" },
      ],
      detail: "TOEIC이 높을수록 덜 깎이고 낮을수록 더 깎입니다.",
    };
  }

  const mineBefore = round2(getChungbukEnglishScore("2026", toeic));
  const mineAfter = round2(getChungbuk2027EnglishScore(toeic));
  const mineRow = { label: `내 점수 (TOEIC ${toeic})`, before: formatScore(mineBefore), after: formatScore(mineAfter) };

  const acceptedBefore = referenceRecord?.연도 === "2026"
    ? referenceRecord.최종합격_토익환산점수 ?? null
    : null;
  const acceptedToeic = referenceRecord?.연도 === "2026"
    ? referenceRecord.최종합격_토익원점수 ?? null
    : null;

  if (acceptedBefore === null || acceptedToeic === null) {
    return {
      tone: "unknown",
      label: "유불리 비교 불가",
      headline: `내 영어 점수 ${formatScore(mineBefore)}점 → ${formatScore(mineAfter)}점`,
      rows: [mineRow],
      detail: "2026학년도 합격 평균이 공개되지 않아 유불리는 견줄 수 없습니다. 면접 40점은 그대로입니다.",
    };
  }

  // 합격 평균은 대학이 2026학년도 식의 영어 점수로 공개했다. 그 평균에 해당하는 TOEIC(환산표 구간에서
  // 거꾸로 구한 근사값)을 새 식에 넣어 본다. 평균을 낸 뒤 바꾼 것이라 실제 새 평균과는 조금 다를 수 있다.
  const acceptedAfter = round2(getChungbuk2027EnglishScore(acceptedToeic));
  const gapBefore = round2(mineBefore - acceptedBefore);
  const gapAfter = round2(mineAfter - acceptedAfter);
  const change = round2(gapAfter - gapBefore);
  const gapText = `합격 평균과의 영어 점수 차 ${formatSignedScore(gapBefore)}점 → 약 ${formatSignedScore(gapAfter)}점`;
  const rows = [
    mineRow,
    {
      label: `합격 평균 (TOEIC 약 ${Math.round(acceptedToeic / 5) * 5})`,
      before: formatScore(acceptedBefore),
      after: `약 ${formatScore(acceptedAfter)}`,
    },
  ];
  const detail = "합격 평균보다 TOEIC이 낮으면 불리하고 높으면 유리합니다. 면접 40점은 그대로입니다.";

  if (Math.abs(change) < SAME_THRESHOLD) {
    return {
      tone: "same",
      label: "유불리 비슷",
      headline: gapText,
      rows,
      detail,
    };
  }

  return {
    tone: change > 0 ? "better" : "worse",
    label: change > 0 ? "내 점수엔 유리" : "내 점수엔 불리",
    headline: gapText,
    rows,
    detail,
  };
}
