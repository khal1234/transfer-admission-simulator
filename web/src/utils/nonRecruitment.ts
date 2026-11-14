import type { DepartmentRecord } from "./converter";
import { getDisclosureEvidence } from "./disclosureEvidence";

export function partitionNonRecruitment(records: DepartmentRecord[]) {
  const years = [...new Set(records.map(r => r.연도))].sort((a, b) => Number(b) - Number(a)).slice(0, 3);
  const groups = new Map<string, DepartmentRecord[]>();
  for (const record of records) {
    const key = `${record.대학명}|${record.학과}`;
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  const excluded: { university: string; department: string; years: string[]; evidence: string[] }[] = [];
  const excludedKeys = new Set<string>();
  for (const [key, history] of groups) {
    const latest = [...history].sort((a, b) => Number(b.연도) - Number(a.연도))[0];
    if (!latest) continue;
    const aliases = history.map(r => r.학과_원본명);
    const evidence = years.map(year => getDisclosureEvidence(latest.대학명, year, latest.학과, aliases));
    // Missing data is not proof of zero recruitment. A newly positive quota restores the group.
    if (years.length !== 3 || history.some(r => years.includes(r.연도) && (r.모집인원 ?? 0) > 0)
      || !evidence.every(item => item?.kind === "not-recruited")) continue;
    excludedKeys.add(key);
    excluded.push({ university: latest.대학명, department: latest.학과, years, evidence: evidence.map(item => item!.description) });
  }
  return { records: records.filter(r => !excludedKeys.has(`${r.대학명}|${r.학과}`)), excluded };
}
