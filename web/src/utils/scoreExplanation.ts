/**
 * 지표합이 "어떤 근거로 그 숫자가 되었는가"를 화면에 낼 수 있는 형태로 푼다.
 *
 * 결과 숫자만 보여주면 사용자는 그것을 믿을 근거가 없다. 특히 합격선 지표합은
 * ⑴ 대학이 공개한 환산점수를 그대로 쓴 경우와 ⑵ 원점수만 있어서 우리가 환산한
 * 경우가 섞여 있는데, 화면에서는 둘이 똑같이 보인다. 신뢰도가 전혀 다른 두 값을
 * 구별할 수 없다는 뜻이라, 여기서 출처를 값과 함께 돌려준다.
 *
 * 계산은 하지 않는다 — converter/formulaRegistry가 실제로 쓴 값을 그대로 받아
 * 설명만 붙인다. 여기서 다시 계산하면 화면의 합계와 어긋날 수 있다.
 */
import rawFormulaData from "../data/편입_환산공식_통합.json";
import {
  calculateAcceptedScoreBreakdown,
  convertRawToConv,
  type DepartmentRecord,
} from "./converter";
import {
  getConversionFormula,
  type FormulaConfidence,
  type FormulaProvenance,
} from "./formulaRegistry";
import { formatAdmissionWeights } from "./admissionProfile";
import { getGpa100ForInput, getGpaMax, type GpaType } from "./scoreInput";

export type ComponentSource =
  /** 내가 입력한 원점수를 환산식에 넣어 계산했다. */
  | "computed-from-my-input"
  /** 대학이 공개한 환산점수를 그대로 썼다 — 가장 믿을 만하다. */
  | "university-published"
  /** 대학이 원점수만 공개해서 우리가 환산식으로 바꿨다. */
  | "derived-from-published-raw"
  /** 그 해 전형에서 반영하지 않는 요소다. */
  | "not-reflected"
  /** 값이 없어 계산할 수 없다. */
  | "unavailable";

export type ScoreComponentLabel = "공인영어" | "전적대성적";

export type ScoreComponent = {
  label: ScoreComponentLabel;
  value: number | null;
  source: ComponentSource;
  /** "TOEIC 850점 → 85.86점" 처럼 사람이 읽을 한 줄. */
  detail: string;
};

export type ScoreExplanation = {
  components: ScoreComponent[];
  total: number | null;
};

export type AcceptedScoreExplanation = ScoreExplanation & {
  admissionBasis: DepartmentRecord["합격자기준"] | null;
};

export type FormulaBasis = {
  confidence: FormulaConfidence;
  provenance: FormulaProvenance;
  /**
   * 모집요강에 적힌 수식 원문. 우리가 계산에 쓴 식과 대조해 일치할 때만 채운다 —
   * 어긋나는 칸에서 원문을 보여주면 화면의 숫자와 모순되는 설명이 붙는다.
   */
  englishFormulaText: string | null;
  gpaFormulaText: string | null;
  /** 선택 학과에 실제 적용되는 전체 전형요소별 배점. */
  admissionProfileText: string | null;
  /** 원문 표기를 확인하지 못했다(대조 실패 또는 원본 없음). */
  documentedFormulaUnverified: boolean;
};

type RawFormulaRecord = {
  대학명: string;
  연도: string;
  공인영어_환산공식: { 수식원문: string; 배점: number | null; 만점기준: number };
  전적대성적_환산공식: { 공식유형: string | null; 수식원문: string };
};

const MAX_TOEIC = 990;

const documentedFormulas = new Map<string, RawFormulaRecord>(
  (rawFormulaData as RawFormulaRecord[]).map((record) => [
    `${record.대학명}|${record.연도}`,
    record,
  ]),
);

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatScore(value: number | null): string {
  return value === null ? "-" : `${round2(value)}점`;
}

/**
 * 모집요강 원문 표기가 실제 계산식과 맞는지 확인한다.
 *
 * 판정 기준은 formulaRegistry.sourceParity.test.ts 와 같다 — 만점(990)일 때
 * 나오는 환산점수가 문서의 배점과 같아야 한다. 구간식이든 비례식이든 성립한다.
 */
function documentedFormulaMatches(
  univ: string,
  year: string,
  department?: string,
): boolean {
  const doc = documentedFormulas.get(`${univ}|${year}`);
  const formula = getConversionFormula(univ, year, department);

  if (doc === undefined || formula === null) {
    return false;
  }

  const documentedMax = doc.공인영어_환산공식.배점;
  if (documentedMax === null) {
    return false;
  }

  const gpaReflectedInSource = doc.전적대성적_환산공식.공식유형 !== null;
  if (gpaReflectedInSource !== (formula.convertGpa !== null)) {
    return false;
  }

  return formula.convertEnglish !== null
    && Math.abs(formula.convertEnglish(MAX_TOEIC) - documentedMax) <= 0.01;
}

export function getFormulaBasis(
  univ: string,
  year: string,
  department?: string,
): FormulaBasis | null {
  const formula = getConversionFormula(univ, year, department);
  if (formula === null) {
    return null;
  }

  if (formula.admissionProfile !== undefined) {
    return {
      confidence: formula.confidence,
      provenance: formula.provenance,
      englishFormulaText: formula.admissionProfile.englishFormulaText,
      gpaFormulaText: formula.admissionProfile.gpaFormulaText,
      admissionProfileText: `${formatAdmissionWeights(formula.admissionProfile)} · ${formula.admissionProfile.sourcePage}`,
      documentedFormulaUnverified: false,
    };
  }

  const doc = documentedFormulas.get(`${univ}|${year}`);
  const matches = documentedFormulaMatches(univ, year, department);

  return {
    confidence: formula.confidence,
    provenance: formula.provenance,
    englishFormulaText: matches && doc ? doc.공인영어_환산공식.수식원문 : null,
    gpaFormulaText:
      matches && doc && doc.전적대성적_환산공식.공식유형 !== null
        ? doc.전적대성적_환산공식.수식원문
        : null,
    admissionProfileText: null,
    documentedFormulaUnverified: !matches,
  };
}

export function explainMyScore(
  univ: string,
  year: string,
  toeic: number | null,
  gpaType: GpaType,
  gpaRaw: number | null,
  department?: string,
): ScoreExplanation | null {
  const formula = getConversionFormula(univ, year, department);
  if (formula === null) {
    return null;
  }

  const gpa100 = gpaRaw === null ? null : getGpa100ForInput(gpaType, gpaRaw);
  const converted = convertRawToConv(univ, year, toeic, gpa100, department);

  const english: ScoreComponent = formula.convertEnglish === null
    ? {
      label: "공인영어",
      value: null,
      source: "not-reflected",
      detail: `${year}학년도 ${department ?? "선택 전형"}에서는 공인영어를 반영하지 않습니다`,
    }
    : toeic === null
    ? {
      label: "공인영어",
      value: null,
      source: "unavailable",
      detail: "TOEIC 점수를 입력하면 계산됩니다",
    }
    : {
      label: "공인영어",
      value: converted.englishConv,
      source: "computed-from-my-input",
      detail: `TOEIC ${toeic}점 → ${formatScore(converted.englishConv)}`,
    };

  let gpa: ScoreComponent;
  if (formula.convertGpa === null) {
    gpa = {
      label: "전적대성적",
      value: null,
      source: "not-reflected",
      detail: `${year}학년도 전형에서는 전적대 성적을 반영하지 않습니다`,
    };
  } else if (gpaRaw === null || gpa100 === null) {
    gpa = {
      label: "전적대성적",
      value: null,
      source: "unavailable",
      detail: "전적대 성적을 입력하면 계산됩니다",
    };
  } else {
    const scaleNote = gpaType === "100"
      ? `${round2(gpaRaw)}/100`
      : `${round2(gpaRaw)}/${getGpaMax(gpaType)} → ${round2(gpa100)}/100`;

    gpa = {
      label: "전적대성적",
      value: converted.gpaConv,
      source: "computed-from-my-input",
      detail: `${scaleNote} → ${formatScore(converted.gpaConv)}`,
    };
  }

  return { components: [english, gpa], total: converted.indexSum };
}

export function explainAcceptedScore(
  record: DepartmentRecord,
): AcceptedScoreExplanation | null {
  const { 대학명: univ, 연도: year, 학과: department } = record;
  const formula = getConversionFormula(univ, year, department);
  if (formula === null) {
    return null;
  }

  // 합계는 반드시 실제 계산 경로에서 가져온다. 여기서 더하면 어긋날 수 있다.
  const breakdown = calculateAcceptedScoreBreakdown(record);

  const publishedEnglish = record.최종합격_토익환산점수;
  const rawEnglish = record.최종합격_토익원점수;

  let english: ScoreComponent;
  if (formula.convertEnglish === null) {
    english = {
      label: "공인영어",
      value: null,
      source: "not-reflected",
      detail: `${year}학년도 ${department} 전형에서는 공인영어를 반영하지 않습니다`,
    };
  } else if (publishedEnglish !== null) {
    english = {
      label: "공인영어",
      value: breakdown.englishConv,
      source: "university-published",
      detail: `대학이 공개한 영어 환산점수 ${formatScore(publishedEnglish)}`,
    };
  } else if (rawEnglish !== null) {
    english = {
      label: "공인영어",
      value: breakdown.englishConv,
      source: "derived-from-published-raw",
      detail: `공개된 평균 TOEIC ${round2(rawEnglish)}점을 환산식에 넣어 계산`,
    };
  } else {
    english = {
      label: "공인영어",
      value: null,
      source: "unavailable",
      detail: "대학이 영어 성적을 공개하지 않았습니다",
    };
  }

  const publishedGpa = record.최종합격_학점환산점수;
  const rawGpa = record.최종합격_학점원점수_100점만점;

  let gpa: ScoreComponent;
  if (formula.convertGpa === null) {
    gpa = {
      label: "전적대성적",
      value: null,
      source: "not-reflected",
      detail: `${year}학년도 전형에서는 전적대 성적을 반영하지 않습니다`,
    };
  } else if (publishedGpa !== null) {
    gpa = {
      label: "전적대성적",
      value: breakdown.gpaConv,
      source: "university-published",
      detail: `대학이 공개한 학점 환산점수 ${formatScore(publishedGpa)}`,
    };
  } else if (rawGpa !== null) {
    gpa = {
      label: "전적대성적",
      value: breakdown.gpaConv,
      source: "derived-from-published-raw",
      detail: `공개된 평균 학점 ${round2(rawGpa)}/100을 환산식에 넣어 계산`,
    };
  } else {
    gpa = {
      label: "전적대성적",
      value: null,
      source: "unavailable",
      detail: "대학이 전적대 성적을 공개하지 않았습니다",
    };
  }

  return {
    components: [english, gpa],
    total: breakdown.indexSum,
    admissionBasis: record.합격자기준 ?? null,
  };
}
