import { describe, expect, it } from "vitest";
import records from "../data/편입_성적_통합.json";
import supplemental from "../data/registrationCounts.json";
import { getRegistrationInfo } from "./registration";
import type { DepartmentRecord } from "./converter";

function find(university: string, year: string, department: string) {
  return records.find(r => r.대학명 === university && r.연도 === year && r.학과 === department)! as DepartmentRecord;
}
describe("registration cohort", () => {
  it("includes Chungnam additional registrants, not just initial registrants", () => {
    const result = getRegistrationInfo(find("충남대학교", "2026", "간호학과"));
    expect(result.count).toBe(8);
    expect(result.description).toContain("최초합격 등록 3명 + 충원합격 등록 5명");
  });
  it("preserves the requested source sum instead of capping it to recruitment", () => {
    const result = getRegistrationInfo(find("충남대학교", "2025", "약학과"));
    expect(result.count).toBe(8);
    expect(result.description).toContain("최초합격 등록 5명 + 충원합격 등록 3명");
  });
  it("checks the phase sum for every numeric Chungnam supplemental row", () => {
    for (const row of supplemental) {
      if (row[0] !== "충남대학교" || row[3] === null) continue;
      expect(row[3]).toBe(Number(row[4]) + Number(row[5]));
    }
    const keys = supplemental.map(row => row.slice(0, 3).join("|"));
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("uses Chungbuk's actual registration column rather than initial admissions", () => {
    const record = find("충북대학교", "2024", "국어국문학과");
    expect(getRegistrationInfo(record).count).toBe(4);
    expect(getRegistrationInfo(record).description).toContain("최종등록인원");
  });
  it("does not call Pusan's admissions count or missing Incheon count registration", () => {
    expect(getRegistrationInfo(find("부산대학교", "2026", "도시공학과")).count).toBeNull();
    expect(getRegistrationInfo(find("인천대학교", "2026", "경영학부")).count).toBeNull();
  });
  it("retains a real zero registration count", () => {
    const record = find("강원대학교", "2026", "디지털밀리터리학과");
    expect(getRegistrationInfo(record).count).toBe(0);
  });
});
