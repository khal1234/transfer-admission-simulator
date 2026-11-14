import { describe, expect, it } from "vitest";
import raw from "../data/편입_성적_통합.json";
import type { DepartmentRecord } from "./converter";
import { partitionNonRecruitment } from "./nonRecruitment";
import { getDisclosureEvidence } from "./disclosureEvidence";
import { UPDATE_ITEMS, UPDATE_ARCHIVE } from "../components/updateNoticeContent";

const records = raw as DepartmentRecord[];
describe("confirmed non-recruitment exceptions", () => {
  it("excludes Chungnam Korean education using all three years' official notes", () => {
    const result = partitionNonRecruitment(records);
    expect(result.excluded.some(r => r.university === "충남대학교" && r.department === "국어교육과")).toBe(true);
    expect(result.records.some(r => r.대학명 === "충남대학교" && r.학과 === "국어교육과")).toBe(false);
    expect(records.some(r => r.대학명 === "충남대학교" && r.학과 === "국어교육과")).toBe(true);
  });
  it("keeps a single-year zero quota and does not turn missing data into zero", () => {
    const result = partitionNonRecruitment(records);
    expect(result.records.some(r => r.대학명 === "충남대학교" && r.학과 === "인문사회과학전공")).toBe(true);
    expect(result.records.some(r => r.대학명 === "충남대학교" && r.학과_원본명.includes("한국무용"))).toBe(true);
  });
  it("automatically restores a department when a later positive quota is added", () => {
    const base = records.find(r => r.대학명 === "충남대학교" && r.학과 === "국어교육과")!;
    const next = { ...base, 연도: "2027", 모집인원: 2 };
    expect(partitionNonRecruitment([...records, next]).records).toContain(next);
  });
  it("distinguishes the Korean dance A note from its previous year's zero quota", () => {
    expect(getDisclosureEvidence("충남대학교", "2026", "무용학과(한국무용)")?.kind).toBe("small-cohort");
    expect(getDisclosureEvidence("충남대학교", "2025", "무용학과(한국무용)")?.kind).toBe("not-recruited");
  });
  it("shows only today's grouped changes while retaining older history", () => {
    // 그날 바뀐 것을 묶어 적는다. 2026-11-14 검토 반영분은 8묶음이다.
    expect(UPDATE_ITEMS).toHaveLength(8);
    expect(UPDATE_ARCHIVE[0].date).toBe("2026-10-05");
    expect(UPDATE_ARCHIVE[0].items).toHaveLength(4);
    expect(UPDATE_ARCHIVE[1].date).toBe("2026-08-12");
    expect(UPDATE_ARCHIVE[1].items).toHaveLength(14);
    expect(UPDATE_ITEMS.some(item => item.includes("인천대 전자"))).toBe(false);
  });
});
