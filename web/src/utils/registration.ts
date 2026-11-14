import supplementalCounts from "../data/registrationCounts.json";
import type { DepartmentRecord } from "./converter";

type RegistrationInfo = { count: number | null; description: string; sourceLabel?: string };
type SupplementalRow = [string, string, string, number | null, number | null, number | null, string];
const supplemental = new Map((supplementalCounts as SupplementalRow[])
  .map(row => [`${row[0]}|${row[1]}|${row[2]}`, row]));

/** 합격인원을 무조건 등록인원으로 취급하지 않는다. 원문의 인원 열을 확인한 대학만 재사용한다. */
export function getRegistrationInfo(record: DepartmentRecord): RegistrationInfo {
  const row = supplemental.get(`${record.대학명}|${record.연도}|${record.학과_원본명}`);
  if (row) {
    const [, , , count, initial, additional, source] = row;
    return { count, sourceLabel: record.대학명 === "충북대학교" ? (record.연도 === "2026" ? "입학인원" : "최종등록인원") : undefined, description: record.대학명 === "충남대학교" && count !== null
      ? `등록인원 ${count}명 = 최초합격 등록 ${initial}명 + 충원합격 등록 ${additional}명. 원문 두 등록 열의 합계이며, 최초 합격인원이나 충원 후보 최종순위를 더한 값이 아닙니다. 근거: ${source}.`
      : count !== null ? `등록인원 ${count}명. 근거: ${source}.`
        : `등록인원을 원문에서 숫자로 확인하지 못했습니다. 근거: ${source}.` };
  }
  const sourceLabels: Record<string, string> = {
    강원대학교: "최종등록인원", 부경대학교: "등록인원", 전남대학교: "등록자수",
    전북대학교: "등록인원", 경북대학교: record.연도 === "2026" ? "최종등록자" : "입학인원",
  };
  const sourceLabel = sourceLabels[record.대학명];
  if (sourceLabel && ["2024", "2025", "2026"].includes(record.연도)) {
    return { count: record.합격인원, sourceLabel, description: `${record.연도}학년도 공식 입결의 ‘${sourceLabel}’ 열 기준입니다.` };
  }
  return { count: null, description: "현재 확보한 공식 자료에서 등록인원을 확인하지 못했습니다. 합격인원·지원인원·후보순위를 등록인원으로 대신 표시하지 않습니다." };
}
