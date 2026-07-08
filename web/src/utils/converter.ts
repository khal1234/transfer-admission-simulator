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
  비고?: string;
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

  switch (univ) {
    case "강원대학교":
      if (year === "2026") {
        // 2026: GPA not reflected (moved to 면접고사, unsupported by this service).
        // 공인영어 배점 150점 반영 확인됨; 정확한 배율 수식은 원문 이미지라 확인 불가 - 비례식으로 추정 적용.
        if (t !== null) englishConv = (t / 990) * 150;
        gpaConv = null;
      } else {
        if (t !== null) englishConv = (t / 990) * 100;
        if (g !== null) gpaConv = g * 0.75;
      }
      break;

    case "경북대학교":
      if (t !== null) englishConv = (t / 990) * 100;
      if (g !== null) gpaConv = 30 + (g / 100) * 20;
      break;

    case "부경대학교":
      if (t !== null) englishConv = (t / 990) * 200;
      if (g !== null) gpaConv = g;
      break;

    case "부산대학교":
      if (t !== null) englishConv = (t / 990) * 30;
      if (g !== null) gpaConv = g * 0.3;
      break;

    case "인천대학교":
      if (t !== null) englishConv = (t / 990) * 60 + 60;
      gpaConv = null;
      break;

    case "전남대학교":
      if (t !== null) englishConv = (t / 990) * 400;
      if (g !== null) gpaConv = (g / 100) * 200;
      break;

    case "전북대학교":
      if (t !== null) {
        const eng100 = Math.max(0.0, Math.min(100.0, 100.0 - 0.101 * (990.0 - t)));
        englishConv = eng100 * 0.8;
      }
      if (g !== null) gpaConv = g * 0.6;
      break;

    case "충남대학교":
      if (year === "2024") {
        if (t !== null) {
          const rawInterp = 20.0 + (t - 385.0) / 20.0;
          englishConv = Math.max(20.0, Math.min(50.0, rawInterp));
        }
        if (g !== null) gpaConv = g * 0.1;
      } else {
        if (t !== null) {
          const rawInterp = 60.0 - (990.0 - t) / 8.33333333;
          englishConv = Math.max(24.0, Math.min(60.0, rawInterp));
        }
        gpaConv = null;
      }
      break;

    case "충북대학교":
      if (year === "2026") {
        if (t !== null) {
          const english100 = 50.0 + (t - 587.5) / 8.0;
          const rawInterp = 40.0 + Math.max(0.0, Math.min(100.0, english100)) * 0.2;
          englishConv = Math.max(40.0, Math.min(60.0, rawInterp));
        }
        gpaConv = null;
      } else {
        if (t !== null) {
          const english100 = 50.0 + (t - 587.5) / 8.0;
          const rawInterp = 10.0 + Math.max(0.0, Math.min(100.0, english100)) * 0.2;
          englishConv = Math.max(10.0, Math.min(30.0, rawInterp));
        }
        if (g !== null) gpaConv = 10.0 + g * 0.2;
      }
      break;

    default:
      break;
  }

  // Round converted results to 2 decimal places
  if (englishConv !== null) englishConv = Math.round(englishConv * 100) / 100;
  if (gpaConv !== null) gpaConv = Math.round(gpaConv * 100) / 100;

  let indexSum: number | null = null;
  if (englishConv !== null && gpaConv !== null) {
    indexSum = englishConv + gpaConv;
  } else if (englishConv !== null) {
    indexSum = englishConv;
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
  return (
    univ === "인천대학교" ||
    (univ === "충남대학교" && year !== "2024") ||
    (univ === "충북대학교" && year === "2026") ||
    (univ === "강원대학교" && year === "2026")
  );
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
  acceptedRecord: DepartmentRecord
): ConversionResult {
  // 1. Calculate My Conversion Score
  const myRes = convertRawToConv(univ, year, toeic, gpa100);

  // 2. Compute Accepted Candidate's Index Sum from database
  const acceptedIndexSum = calculateAcceptedScoreBreakdown(acceptedRecord).indexSum;

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
  const isLookupBased = 
    univ === "전북대학교" || 
    univ === "충남대학교" || 
    (univ === "충북대학교" && year !== "2026"); // 충북대 2026 is interval but we can linearly interpolate, wait!

  // Slopes of English
  let toeicSlope = 0;
  if (univ === "강원대학교") {
    toeicSlope = (year === "2026" ? 150 : 100) / 990;
  } else if (univ === "경북대학교") {
    toeicSlope = 100 / 990;
  } else if (univ === "부경대학교") {
    toeicSlope = 200 / 990;
  } else if (univ === "부산대학교") {
    toeicSlope = 30 / 990;
  } else if (univ === "인천대학교") {
    toeicSlope = 60 / 990;
  } else if (univ === "전남대학교") {
    toeicSlope = 400 / 990;
  } else if (univ === "전북대학교") {
    // 0.8 points * 0.101 slope = 0.0808 points in conv per 1 TOEIC!
    toeicSlope = 0.0808;
  } else if (univ === "충남대학교") {
    if (year === "2024") {
      toeicSlope = 1.0 / 20.0; // 0.05
    } else {
      toeicSlope = 1.0 / 8.33333333; // 0.12
    }
  } else if (univ === "충북대학교") {
    if (year === "2026") {
      // 0.2 points * (1 / 8.0) = 0.025 points in conv per 1 TOEIC!
      toeicSlope = 0.025;
    } else {
      toeicSlope = 0.2 * (1 / 8.0); // 0.025
    }
  }

  // Slopes of GPA (100 scale)
  let gpaSlope100 = 0;
  if (univ === "강원대학교") {
    gpaSlope100 = year === "2026" ? 0.0 : 0.75; // 2026: GPA not reflected (moved to 면접고사)
  } else if (univ === "경북대학교") {
    gpaSlope100 = 0.2;
  } else if (univ === "부경대학교" || univ === "부산대학교") {
    gpaSlope100 = 1.0;
    if (univ === "부산대학교") gpaSlope100 = 0.3;
  } else if (univ === "인천대학교" || (univ === "충남대학교" && year !== "2024") || (univ === "충북대학교" && year === "2026")) {
    gpaSlope100 = 0.0; // Not reflected
  } else if (univ === "전남대학교") {
    gpaSlope100 = 2.0;
  } else if (univ === "전북대학교") {
    gpaSlope100 = 0.6;
  } else if (univ === "충남대학교" && year === "2024") {
    gpaSlope100 = 0.1;
  } else if (univ === "충북대학교") {
    gpaSlope100 = 0.2;
  }

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
