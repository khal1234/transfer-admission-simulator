import { getConversionFormula } from "./formulaRegistry";

export interface DepartmentRecord {
  대학명: string;
  연도: string;
  학과: string;
  학과_원본명: string;
  모집인원: number | null;
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

/**
 * FLAT HELPER FUNCTION (ZERO RECURSION)
 * Converts raw TOEIC and GPA into university-specific converted scores.
 */
export function convertRawToConv(
  univ: string,
  year: string,
  toeic: number | null,
  gpa100: number | null
): { englishConv: number | null; gpaConv: number | null; indexSum: number | null } {
  let englishConv: number | null = null;
  let gpaConv: number | null = null;

  const t = toeic !== null ? Math.max(100, Math.min(990, toeic)) : null;
  const g = gpa100 !== null ? Math.max(0, Math.min(100, gpa100)) : null;

  const formula = getConversionFormula(univ, year);
  if (formula !== null) {
    if (t !== null) {
      englishConv = formula.convertEnglish(t);
    }
    if (g !== null && formula.convertGpa !== null) {
      gpaConv = formula.convertGpa(g);
    }
  }

  // Round converted results to 2 decimal places
  if (englishConv !== null) englishConv = Math.round(englishConv * 100) / 100;
  if (gpaConv !== null) gpaConv = Math.round(gpaConv * 100) / 100;

  let indexSum: number | null = null;
  if (englishConv !== null) {
    if (formula?.convertGpa === null) {
      indexSum = englishConv;
    } else if (gpaConv !== null) {
      indexSum = englishConv + gpaConv;
    }
  }

  if (indexSum !== null) indexSum = Math.round(indexSum * 100) / 100;

  return { englishConv, gpaConv, indexSum };
}

function roundScore(score: number | null): number | null {
  if (score === null) {
    return null;
  }

  return Math.round(score * 100) / 100;
}

function usesEnglishOnly(univ: string, year: string): boolean {
  return getConversionFormula(univ, year)?.convertGpa === null;
}

export function calculateAcceptedScoreBreakdown(
  acceptedRecord: DepartmentRecord
): AcceptedScoreBreakdown {
  const { 대학명: univ, 연도: year } = acceptedRecord;
  const convEng = acceptedRecord.최종합격_토익환산점수;
  const convGpa = acceptedRecord.최종합격_학점환산점수;
  const rawEng = acceptedRecord.최종합격_토익원점수;
  const rawGpa = acceptedRecord.최종합격_학점원점수_100점만점;

  if (usesEnglishOnly(univ, year)) {
    const englishConv =
      convEng ?? convertRawToConv(univ, year, rawEng, null).englishConv;

    return {
      englishConv: roundScore(englishConv),
      gpaConv: null,
      indexSum: roundScore(englishConv),
    };
  }

  const convertedFromRaw = convertRawToConv(univ, year, rawEng, rawGpa);
  const englishConv = convEng ?? convertedFromRaw.englishConv;
  const gpaConv = convGpa ?? convertedFromRaw.gpaConv;

  let indexSum: number | null = null;
  if (englishConv !== null && gpaConv !== null) {
    indexSum = englishConv + gpaConv;
  }

  return {
    englishConv: roundScore(englishConv),
    gpaConv: roundScore(gpaConv),
    indexSum: roundScore(indexSum),
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
  acceptedRecord: DepartmentRecord | null
): ConversionResult {
  // 1. Calculate My Conversion Score
  const myRes = convertRawToConv(univ, year, toeic, gpa100);

  // 2. Compute Accepted Candidate's Index Sum from database
  const acceptedIndexSum = acceptedRecord === null
    ? null
    : calculateAcceptedScoreBreakdown(acceptedRecord).indexSum;

  // 3. Compute Difference and Safety status
  let diff: number | null = null;
  let status: "safe" | "borderline" | "risk" | "unknown" = "unknown";

  if (myRes.indexSum !== null && acceptedIndexSum !== null) {
    diff = Math.round((myRes.indexSum - acceptedIndexSum) * 100) / 100;
    
    // Scale standard deviation range thresholds programmatically based on university totals
    let safeThreshold = 0;
    let borderlineThreshold = -5;

    if (univ === "전남대학교") {
      safeThreshold = 0;
      borderlineThreshold = -30;
    } else if (univ === "부산대학교") {
      safeThreshold = 0;
      borderlineThreshold = -3.0;
    } else if (univ === "전북대학교") {
      safeThreshold = 0;
      borderlineThreshold = -7.0;
    } else if (univ === "부경대학교") {
      safeThreshold = 0;
      borderlineThreshold = -15;
    } else if (univ === "인천대학교") {
      safeThreshold = 0;
      borderlineThreshold = -6;
    } else if (univ === "충북대학교" && year === "2026") {
      safeThreshold = 0;
      borderlineThreshold = -3.0;
    }

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
 * Calculates raw score increments and return analysis report for user.
 */
export function analyzeScoreDeficit(
  univ: string,
  year: string,
  gpaScaleType: "100" | "4.5" | "4.3",
  deficit: number
): {
  isLookupBased: boolean;
  toeicNeeded: number | null;
  gpaNeeded: number | null;
  toeicEfficiency: number; // conversion points per 10 raw TOEIC points
  gpaEfficiency: number;   // conversion points per 0.1 raw GPA points
  recommendedMetric: "toeic" | "gpa" | "none";
} {
  const formula = getConversionFormula(univ, year);
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

  // Recommended Metric
  let recommendedMetric: "toeic" | "gpa" | "none" = "none";
  if (toeicEfficiency > 0 || gpaEfficiency > 0) {
    if (gpaSlopeRaw === 0) {
      recommendedMetric = "toeic";
    } else {
      recommendedMetric = toeicEfficiency >= gpaEfficiency ? "toeic" : "gpa";
    }
  }

  // Necessary raw points to overcome
  let toeicNeeded: number | null = null;
  let gpaNeeded: number | null = null;

  if (deficit > 0 && !isLookupBased) {
    if (toeicSlope > 0) {
      toeicNeeded = Math.ceil(deficit / toeicSlope);
      // Clean to multiple of 5 since TOEIC is in 5 point intervals
      toeicNeeded = Math.ceil(toeicNeeded / 5) * 5;
    }
    if (gpaSlopeRaw > 0) {
      gpaNeeded = Math.round((deficit / gpaSlopeRaw) * 100) / 100;
    }
  }

  return {
    isLookupBased,
    toeicNeeded,
    gpaNeeded,
    toeicEfficiency: Math.round(toeicEfficiency * 100) / 100,
    gpaEfficiency: Math.round(gpaEfficiency * 100) / 100,
    recommendedMetric
  };
}
