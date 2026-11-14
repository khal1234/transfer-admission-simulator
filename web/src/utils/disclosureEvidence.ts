import rows from "../data/disclosureEvidence.json";

export type DisclosureEvidence = { kind: "not-recruited" | "small-cohort"; code: string; source: string; description: string };
type EvidenceRow = [string, string, string, DisclosureEvidence["kind"], string, string];
function normalize(name: string) { return name.replace(/[\s·.ㆍ‧•・]/g, ""); }
const byKey = new Map((rows as EvidenceRow[]).map(([university, year, department, kind, code, source]) => [
  `${university}|${year}|${normalize(department)}`,
  { kind, code, source, description: kind === "not-recruited"
    ? `${year}학년도 공식 자료의 ${code}: 일반편입 모집계획인원이 0명인 미모집 학과입니다. 근거: ${source}.`
    : `${year}학년도 공식 자료의 ${code}: 합격자가 2명 이하인 모집단위로 평균 성적 공개·산출에서 제외합니다. 이는 모집인원·등록인원의 정확한 숫자를 뜻하지 않습니다. 근거: ${source}.` },
]));
export function getDisclosureEvidence(university: string, year: string, department: string, aliases: string[] = []): DisclosureEvidence | null {
  for (const name of [department, ...aliases]) {
    const evidence = byKey.get(`${university}|${year}|${normalize(name)}`);
    if (evidence) return evidence;
  }
  return null;
}
