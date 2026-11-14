import type { DepartmentRecord } from "./converter";
import { getConversionFormula } from "./formulaRegistry";
import { formatAdmissionWeights } from "./admissionProfile";
import { getDisclosureEvidence } from "./disclosureEvidence";

export type ScoreMetric = "toeic" | "gpa";

const SHORT_NAMES: Record<string, string> = {
  강원대학교: "강원대", 경북대학교: "경북대", 부경대학교: "부경대",
  부산대학교: "부산대", 인천대학교: "인천대", 전남대학교: "전남대",
  전북대학교: "전북대", 충남대학교: "충남대", 충북대학교: "충북대",
};

// 2024~2026 각 학년도 공식 성적 파일 각주를 직접 대조했다.
// 강원대 2026에는 이전 연도의 개인정보 각주가 없어 그 규칙을 이월하지 않는다.
// 인천대 모집 1명 비공개 규칙도 2024에만 존재한다(2025~26은 1명 점수 공개).
function getOfficialDisclosureRule(record: DepartmentRecord): string | null {
  if (!["2024", "2025", "2026"].includes(record.연도)) return null;
  switch (record.대학명) {
    case "경북대학교":
      return "공식 입결 안내: 입학인원이 1명인 모집단위는 개인정보 보호를 위하여 성적을 공개하지 않습니다.";
    case "부경대학교":
      return "공식 입결 안내: 모집인원 및 등록인원이 1~2명인 학과에 대한 성적 자료는 개인정보 보호에 따라 공개되지 않습니다.";
    case "부산대학교":
      return "공식 입결 안내: 합격자가 1명인 경우 개인정보 보호를 위해 성적을 공개하지 않습니다.";
    case "전남대학교":
      return "공식 입결 안내: 등록자가 1명인 모집단위는 개인정보 보호를 위해 점수를 공개하지 않습니다.";
    case "전북대학교":
      return "공식 입결 안내: 등록인원이 1명 이하인 모집단위는 개인정보 보호를 위하여 성적을 공개하지 않습니다.";
    case "충남대학교":
      return "공식 입결 안내: 합격자가 2명 이하인 모집단위와 모집계획인원이 0명인 모집단위는 평균 성적 공개·산출에서 제외합니다.";
    case "충북대학교":
      return "공식 입결 안내: 최초 합격자가 2명 이하인 모집단위는 평균 성적 산출에서 제외합니다.";
    case "강원대학교":
      return record.연도 === "2026" ? null
        : "공식 입결 안내: 개인정보 보호를 위해 일부 전형·학과는 성적을 공개하지 않습니다. 비공개 인원 기준은 별도로 명시하지 않았습니다.";
    case "인천대학교":
      return record.연도 === "2024"
        ? "공식 입결 안내: 모집인원이 1명인 경우 TOEIC 평균 성적을 공개하지 않습니다."
        : null;
    default:
      return null;
  }
}

/** 모집요강 미반영을 먼저 확인한 뒤 해당 연도 입결의 비공개 규칙을 설명한다. */
export function getUnavailableScoreDescription(record: DepartmentRecord, metric: ScoreMetric): string {
  const label = metric === "toeic" ? "TOEIC" : "GPA";
  const shortName = SHORT_NAMES[record.대학명] ?? record.대학명;
  const evidence = getDisclosureEvidence(record.대학명, record.연도, record.학과_원본명);
  if (evidence?.kind === "not-recruited") return evidence.description;
  if (record.모집인원 === 0) {
    return `${record.연도}학년도 일반편입 모집계획인원이 0명인 모집단위로, 이 연도는 미모집입니다. ${label} 평균을 개인정보 보호로 숨긴 경우와 구분해야 합니다.`
      + (record.모집인원_근거 ? ` 근거: ${record.모집인원_근거}` : " 근거: 해당 연도 공식 모집인원 자료.");
  }
  const formula = getConversionFormula(record.대학명, record.연도, record.학과_원본명);
  const profile = formula?.admissionProfile;
  const reflected = profile
    ? profile.weights[metric === "toeic" ? "english" : "gpa"] > 0
    : metric === "toeic" ? formula?.convertEnglish !== null : formula?.convertGpa !== null;

  if (formula !== null && !reflected) {
    const subject = metric === "toeic" ? "공인영어 성적" : "전적대 성적";
    const verifiedPages: Record<string, string> = {
      강원대학교: "2026 모집요강 PDF 13쪽(인쇄 10쪽)",
      부경대학교: "2026 모집요강 PDF 14·25쪽(인쇄 12·23쪽)",
      인천대학교: "2026 모집요강 PDF 17쪽(인쇄 14쪽)",
      충남대학교: "2026 모집요강 PDF 20쪽(인쇄 16쪽)",
      충북대학교: "2026 모집요강 PDF 25쪽(인쇄 23쪽)",
    };
    const sourcePage = record.연도 === "2026"
      ? verifiedPages[record.대학명] ?? profile?.sourcePage : profile?.sourcePage;
    const supplementaryUse = metric === "gpa" && record.대학명 === "인천대학교"
      ? " 다만 전적대 성적은 면접 참고자료·동점자 처리에 활용될 수 있습니다."
      : metric === "gpa" && record.대학명 === "충북대학교" && record.연도 === "2026"
        ? " 다만 전적대 성적은 1단계 동점자 처리에 활용됩니다." : "";
    return `${record.연도}학년도 ${shortName} 편입학 모집요강의 전형요소별 배점표에 따라 이 전형은 ${subject}을 반영하지 않아 ${label} 합격 평균이 없습니다.`
      + (profile ? ` ${formatAdmissionWeights(profile)}. 근거: ${sourcePage}.` : "")
      + supplementaryUse
      + (evidence ? ` 이 모집단위의 별도 입결 비고: ${evidence.description}` : "");
  }

  const rule = getOfficialDisclosureRule(record);
  const source = `근거: ${record.연도}학년도 ${shortName} 공식 편입학 입시결과의 성적 공개 안내.`;
  // 강원대는 최종등록인원과 최초합격자 평균의 모집단이 달라 0명 판정을 금지한다.
  if (record.합격인원 === 0 && record.대학명 !== "강원대학교") {
    return `${record.연도}학년도 합격(등록) 인원이 0명으로 공개되어 ${label} 평균이 없습니다. ${rule ?? ""} ${source}`;
  }
  if (rule !== null) {
    return `${record.연도}학년도 ${label} 평균은 비공개입니다. ${evidence?.description ?? `${rule} ${source}`}`;
  }
  return `${record.연도}학년도 ${shortName} 공식 입결 자료에 ${label} 평균이 공개되지 않았습니다. 해당 자료에 구체적인 비공개 사유는 명시되지 않았습니다. 0점이라는 뜻은 아닙니다.`
    + (record.대학명 === "강원대학교"
      ? " 성적은 최초합격자 기준이므로 최종등록인원만으로 평균 미산출 여부를 판단할 수 없습니다." : "");
}
