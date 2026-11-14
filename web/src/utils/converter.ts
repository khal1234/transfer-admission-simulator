import {
  getConversionFormula,
  type ConversionFormula,
} from "./formulaRegistry";

export interface DepartmentRecord {
  대학명: string;
  연도: string;
  학과: string;
  학과_원본명: string;
  모집인원: number | null;
  모집인원_근거?: string;
  지원인원: number | null;
  합격인원: number | null;
  최종합격_토익환산점수: number | null;
  최종합격_토익원점수: number | null;
  최종합격_학점환산점수: number | null;
  최종합격_학점원점수_100점만점: number | null;
  비고?: string | null;
  합격자기준?: "최초" | "최종" | "확인불가";
}

export interface FormulaRecord {
  대학명: string;
  연도: string;
  전형구분: string;
  총점: number | null;
  배점: {
    공인영어: number | null;
    면접구술: number | null;
    전적대성적: number | null;
  };
  공인영어_환산공식: {
    공식유형: string;
    수식원문: string;
    배점: number | null;
    만점기준: number;
  };
  전적대성적_환산공식: {
    공식유형: string | null;
    수식원문: string;
    기본점수?: number | null;
    비례계수?: number | null;
    학점기준설명: string;
  };
  비고: string;
}

export interface ConversionResult {
  englishConv: number | null;
  gpaConv: number | null;
  myIndexSum: number | null;
  acceptedIndexSum: number | null;
  diff: number | null;
  status: "safe" | "borderline" | "risk" | "unknown";
}

export interface AcceptedScoreBreakdown {
  englishConv: number | null;
  gpaConv: number | null;
  indexSum: number | null;
}

export function calculateScoreDeficit(diff: number | null): number | null {
  return diff === null ? null : Math.max(0, -diff);
}

function normalizeScore(
  score: number | null,
  formula: ConversionFormula | null,
): number | null {
  if (score === null) return null;
  const precision = formula?.scorePrecision ?? {
    mode: "round" as const,
    decimalPlaces: 2,
  };
  const factor = 10 ** precision.decimalPlaces;
  if (precision.mode === "truncate") {
    return Math.trunc((score + Number.EPSILON * factor) * factor) / factor;
  }
  return Math.round(score * factor) / factor;
}

/**
 * FLAT HELPER FUNCTION (ZERO RECURSION)
 * Converts raw TOEIC and GPA into university-specific converted scores.
 */
export function convertRawToConv(
  univ: string,
  year: string,
  toeic: number | null,
  gpa100: number | null,
  department?: string,
): { englishConv: number | null; gpaConv: number | null; indexSum: number | null } {
  let englishConv: number | null = null;
  let gpaConv: number | null = null;

  const t = toeic !== null ? Math.max(100, Math.min(990, toeic)) : null;
  const g = gpa100 !== null ? Math.max(0, Math.min(100, gpa100)) : null;

  const formula = getConversionFormula(univ, year, department);
  if (formula !== null) {
    if (t !== null && formula.convertEnglish !== null) {
      englishConv = formula.convertEnglish(t);
    }
    if (g !== null && formula.convertGpa !== null) {
      gpaConv = formula.convertGpa(g);
    }
  }

  englishConv = normalizeScore(englishConv, formula);
  gpaConv = normalizeScore(gpaConv, formula);

  let indexSum: number | null = null;
  if (formula !== null) {
    const hasConvertibleComponent =
      formula.convertEnglish !== null || formula.convertGpa !== null;
    const englishReady = formula.convertEnglish === null || englishConv !== null;
    const gpaReady = formula.convertGpa === null || gpaConv !== null;
    if (hasConvertibleComponent && englishReady && gpaReady) {
      indexSum = (englishConv ?? 0) + (gpaConv ?? 0);
    }
  }

  indexSum = normalizeScore(indexSum, formula);

  return { englishConv, gpaConv, indexSum };
}

function usesEnglishOnly(univ: string, year: string, department: string): boolean {
  const formula = getConversionFormula(univ, year, department);
  return formula?.convertEnglish !== null && formula?.convertGpa === null;
}

export function calculateAcceptedScoreBreakdown(
  acceptedRecord: DepartmentRecord
): AcceptedScoreBreakdown {
  const { 대학명: univ, 연도: year, 학과: department } = acceptedRecord;
  const convEng = acceptedRecord.최종합격_토익환산점수;
  const convGpa = acceptedRecord.최종합격_학점환산점수;
  const rawEng = acceptedRecord.최종합격_토익원점수;
  const rawGpa = acceptedRecord.최종합격_학점원점수_100점만점;

  if (usesEnglishOnly(univ, year, department)) {
    const formula = getConversionFormula(univ, year, department);
    const englishConv =
      convEng ?? convertRawToConv(univ, year, rawEng, null, department).englishConv;

    return {
      englishConv: normalizeScore(englishConv, formula),
      gpaConv: null,
      indexSum: normalizeScore(englishConv, formula),
    };
  }

  const formula = getConversionFormula(univ, year, department);
  const convertedFromRaw = convertRawToConv(
    univ,
    year,
    rawEng,
    rawGpa,
    department,
  );
  const englishConv = formula?.convertEnglish === null
    ? null
    : (convEng ?? convertedFromRaw.englishConv);
  const gpaConv = formula?.convertGpa === null
    ? null
    : (convGpa ?? convertedFromRaw.gpaConv);

  let indexSum: number | null = null;
  if (formula !== null) {
    const hasConvertibleComponent =
      formula.convertEnglish !== null || formula.convertGpa !== null;
    const englishReady = formula.convertEnglish === null || englishConv !== null;
    const gpaReady = formula.convertGpa === null || gpaConv !== null;
    if (hasConvertibleComponent && englishReady && gpaReady) {
      indexSum = (englishConv ?? 0) + (gpaConv ?? 0);
    }
  }

  return {
    englishConv: normalizeScore(englishConv, formula),
    gpaConv: normalizeScore(gpaConv, formula),
    indexSum: normalizeScore(indexSum, formula),
  };
}

/** 「근접」으로 보는 폭: 그 전형이 반영하는 영어·전적대 환산 만점의 이 비율까지. */
export const BORDERLINE_RATIO = 0.05;

/**
 * 「근접」 판정에 쓰는 반영 만점과 허용 폭.
 *
 * 무엇을 재나: TOEIC 990·백분위 100 을 그 대학·연도·모집단위 식에 넣은 값의 합
 *   (= 이 사이트가 계산하는 영어·전적대 환산 만점).
 * 문턱과 근거: 만점의 5%. 예전에 대학별로 적어 둔 값(전남 30·부경 15·전북 7·
 *   인천 6·부산 3)이 모두 주된 전형 만점의 5% 였다. 「그 밖은 5점」만 만점과
 *   무관해서, 영어 30점 만점 전형에서 6분의 1 이 모자라도 근접이 됐다
 *   (2026-11-14 검토 13번).
 * 못 보는 것: 면접·필기·실기 배점, 최초·최종 합격자 기준의 차이.
 */
export function getBorderlineMargin(
  univ: string,
  year: string,
  department?: string,
): { fullMarks: number; margin: number } | null {
  const formula = getConversionFormula(univ, year, department);
  if (formula === null) return null;

  const fullMarks = (formula.convertEnglish?.(990) ?? 0)
    + (formula.convertGpa?.(100) ?? 0);
  if (!(fullMarks > 0)) return null;

  return {
    fullMarks: Math.round(fullMarks * 100) / 100,
    margin: Math.round(fullMarks * BORDERLINE_RATIO * 100) / 100,
  };
}

/**
 * Calculates and compares user score vs accepted average in a purely flat,
 * non-recursive manner to prevent stack overflow RangeError.
 */
export function calculateScore(
  univ: string,
  year: string,
  toeic: number | null,
  gpa100: number | null,
  acceptedRecord: DepartmentRecord | null,
  department?: string,
): ConversionResult {
  // 1. Calculate My Conversion Score
  const effectiveDepartment = department ?? acceptedRecord?.학과;
  const myRes = convertRawToConv(
    univ,
    year,
    toeic,
    gpa100,
    effectiveDepartment,
  );

  // 2. Compute Accepted Candidate's Index Sum from database
  const acceptedIndexSum = acceptedRecord === null
    ? null
    : calculateAcceptedScoreBreakdown(acceptedRecord).indexSum;

  // 3. Compute Difference and Safety status
  let diff: number | null = null;
  let status: "safe" | "borderline" | "risk" | "unknown" = "unknown";

  if (myRes.indexSum !== null && acceptedIndexSum !== null) {
    diff = Math.round((myRes.indexSum - acceptedIndexSum) * 100) / 100;
    
    const safeThreshold = 0;
    const borderlineThreshold = -(
      getBorderlineMargin(univ, year, effectiveDepartment)?.margin ?? 5
    );

    if (diff >= safeThreshold) {
      status = "safe";
    } else if (diff >= borderlineThreshold) {
      status = "borderline";
    } else {
      status = "risk";
    }
  }

  return {
    englishConv: myRes.englishConv,
    gpaConv: myRes.gpaConv,
    myIndexSum: myRes.indexSum,
    acceptedIndexSum,
    diff,
    status
  };
}

/**
 * Helper for converting 4.5/4.3 GPA into 100-scale 백분위.
 */
export function convertGpaTo100Scale(gpa: number, scale: 4.5 | 4.3): number {
  if (gpa <= 0) {
    return 0;
  }

  if (scale === 4.5) {
    if (gpa <= 1.0) return 60.0;
    const computed = 60.0 + ((gpa - 1.0) * 40.0) / 3.5;
    return Math.round(Math.max(60.0, Math.min(100.0, computed)) * 100) / 100;
  } else {
    if (gpa <= 1.0) return 60.0;
    const computed = 60.0 + ((gpa - 1.0) * 40.0) / 3.3;
    return Math.round(Math.max(60.0, Math.min(100.0, computed)) * 100) / 100;
  }
}

/**
 * 우리가 쓰는 환산식을 그대로 거꾸로 풀어 필요한 최소 상승폭을 찾는다.
 *
 * 기울기 나눗셈이면 한 줄로 끝나지만, 구간 환산표를 직선으로 근사한 대학은
 * 상·하한에 눌린 구간이 있어 거기서는 기울기가 0이다. 그 구간에 있는
 * 사용자에게 기울기 나눗셈은 실제로는 닿지 않는 목표를 '이만큼만 올리면
 * 된다'고 적어준다. 환산식이 단조 증가이므로 이분 탐색으로 실제 값을 찾는다.
 *
 * 만점까지 올려도 격차를 못 메우면 null 을 돌려준다 — 없는 경로를 적는 것보다
 * 낫다.
 */
function findMinimumIncrease(
  convert: (value: number) => number,
  current: number,
  max: number,
  step: number,
  requiredGain: number
): number | null {
  const base = convert(current);
  const maxSteps = Math.floor((max - current) / step + 1e-9);
  if (maxSteps <= 0) {
    return null;
  }

  let low = 1;
  let high = maxSteps;
  let found: number | null = null;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (convert(current + mid * step) - base >= requiredGain - 1e-9) {
      found = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return found === null ? null : Math.round(found * step * 100) / 100;
}

function getGpaScaleMax(gpaScaleType: "100" | "4.5" | "4.3"): number {
  return gpaScaleType === "100" ? 100 : Number(gpaScaleType);
}

function convertGpaInputToScore(
  formula: NonNullable<ReturnType<typeof getConversionFormula>>,
  gpaScaleType: "100" | "4.5" | "4.3",
  gpaInput: number,
): number {
  if (formula.convertGpa === null) {
    return 0;
  }

  const gpa100 = gpaScaleType === "100"
    ? Math.max(0, Math.min(100, gpaInput))
    : convertGpaTo100Scale(gpaInput, Number(gpaScaleType) as 4.5 | 4.3);
  return Math.round(formula.convertGpa(gpa100) * 100) / 100;
}

/**
 * Calculates raw score increments and return analysis report for user.
 *
 * 구간 환산표 대학이라고 역산을 거부하지 않는다. 화면에 이미 같은 근사식으로
 * 뽑은 내 환산점수와 격차를 띄워놓고 그 격차를 메울 점수만 '산출 불가'라고
 * 적는 건 앞뒤가 안 맞는다. 근사의 정확도는 정방향이나 역방향이나 같다.
 * 대신 isLookupBased 로 근사라는 사실을 함께 돌려주고, 화면에서 ≈ 로 구별한다.
 */
export function analyzeScoreDeficit(
  univ: string,
  year: string,
  gpaScaleType: "100" | "4.5" | "4.3",
  deficit: number,
  currentGpa: number | null,
  currentToeic: number | null = null,
  department?: string,
): {
  isLookupBased: boolean;
  toeicNeeded: number | null;
  gpaNeeded: number | null;
  toeicEfficiency: number; // conversion points per 10 raw TOEIC points
  gpaEfficiency: number;   // conversion points per 0.1 raw GPA points
  /** 전적대 백분위(100점 만점) 1점이 올리는 환산점수. 입력 척도와 무관하다. */
  gpaEfficiencyPer100: number;
  /** 이 전형이 공인영어 / 전적대 성적을 점수에 넣는가. 안 넣는 쪽은 화면에 «+0점»으로 적지 않는다. */
  usesEnglish: boolean;
  usesGpa: boolean;
  recommendedMetric: "toeic" | "gpa" | "none";
} {
  const formula = getConversionFormula(univ, year, department);
  const isLookupBased = formula?.reverseCalculationMode === "lookup";
  const toeicSlope = formula?.englishSlope ?? 0;
  const gpaSlope100 = formula?.gpaSlope100 ?? 0;

  // Convert GPA Slope 100 into Chosen Scale Slope
  let scaleFactor = 1.0; // multiplier from raw scale to 100-scale
  if (gpaScaleType === "4.5") {
    scaleFactor = 40.0 / 3.5; // gpa_100 step per 1 raw gpa
  } else if (gpaScaleType === "4.3") {
    scaleFactor = 40.0 / 3.3;
  }
  const gpaSlopeRaw = gpaSlope100 * scaleFactor;

  // Efficiencies
  const toeicEfficiency = toeicSlope * 10; // score change per 10 points in TOEIC
  const gpaEfficiency = gpaSlopeRaw * 0.1; // score change per 0.1 points in GPA

  // 어느 쪽이 유리한지는 입력 척도와 무관한 한 단위로 견준다 — TOEIC 10점과
  // 백분위 1점(둘 다 만점의 약 1%). 예전에는 「학점 0.1」과 견줘서 4.5 로 넣으면
  // 전적대, 100 으로 넣으면 TOEIC 이라고 답이 뒤집혔다(2026-11-14 검토 9번).
  const gpaEfficiencyPer100 = gpaSlope100;
  // 한쪽만 반영하는 전형(예: 영어 + 필기)은 견줄 상대가 없으니 «어느 쪽이 유리»를
  // 말하지 않는다. 예전에는 반영하지 않는 전적대를 «+0점»으로 적고 영어가 유리하다고 했다.
  const usesEnglish = formula !== null && formula.convertEnglish !== null;
  const usesGpa = formula !== null && formula.convertGpa !== null;
  let recommendedMetric: "toeic" | "gpa" | "none" = "none";
  if (usesEnglish && usesGpa && (toeicEfficiency > 0 || gpaEfficiencyPer100 > 0)) {
    if (gpaEfficiencyPer100 === 0) {
      recommendedMetric = "toeic";
    } else {
      recommendedMetric = toeicEfficiency >= gpaEfficiencyPer100 ? "toeic" : "gpa";
    }
  }

  // Necessary raw points to overcome
  let toeicNeeded: number | null = null;
  let gpaNeeded: number | null = null;

  if (deficit > 0) {
    if (
      currentToeic !== null
      && formula !== null
      && formula.convertEnglish !== null
    ) {
      // 현재 점수를 알면 환산식을 직접 되짚는다. 상·하한 구간까지 반영된다.
      const clamped = Math.max(100, Math.min(990, currentToeic));
      toeicNeeded = findMinimumIncrease(
        formula.convertEnglish,
        clamped,
        990,
        5, // TOEIC은 5점 단위로만 나온다
        deficit
      );
    } else if (toeicSlope > 0) {
      toeicNeeded = Math.ceil(deficit / toeicSlope);
      // Clean to multiple of 5 since TOEIC is in 5 point intervals
      toeicNeeded = Math.ceil(toeicNeeded / 5) * 5;
    }
    if (currentGpa !== null && formula !== null && formula.convertGpa !== null) {
      const gpaFormula = formula;
      const maxGpa = getGpaScaleMax(gpaScaleType);
      const clampedGpa = Math.max(0, Math.min(maxGpa, currentGpa));
      gpaNeeded = findMinimumIncrease(
        (value) => convertGpaInputToScore(gpaFormula, gpaScaleType, value),
        clampedGpa,
        maxGpa,
        0.01,
        deficit,
      );
    }
  }

  return {
    isLookupBased,
    toeicNeeded,
    gpaNeeded,
    toeicEfficiency: Math.round(toeicEfficiency * 100) / 100,
    gpaEfficiency: Math.round(gpaEfficiency * 100) / 100,
    gpaEfficiencyPer100: Math.round(gpaEfficiencyPer100 * 100) / 100,
    usesEnglish,
    usesGpa,
    recommendedMetric
  };
}
