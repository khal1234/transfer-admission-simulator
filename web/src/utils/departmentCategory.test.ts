import { describe, expect, it } from "vitest";
import data from "../data/편입_성적_통합.json";
import type { DepartmentRecord } from "./converter";
import { getCategoryTrack, getDepartmentCategory } from "./departmentCategory";

describe("getDepartmentCategory", () => {
  // 규칙 순서가 틀리면 바로 뒤집히는 경계 사례들
  it.each([
    ["수학교육과", "사범"],
    ["화학공학과", "공학"],
    ["식품공학과", "공학"],
    ["안전공학과", "공학"],
    ["섬유패션디자인학부(섬유공학전공)", "공학"],
    ["섬유패션디자인학부(패션디자인전공)", "예체능"],
    ["식물의학과", "농생명"],
    ["간호학과", "의약보건"],
    ["국제경영학과", "상경"],
    ["문헌정보학과", "사회"],
    ["인문사회과학전공", "사회"],
    ["언어정보학과", "인문"],
    ["천문우주과학과", "자연"],
    ["물리학과", "자연"],
    ["자율전공학부(4년)", "기타"],
  ])("%s → %s", (department, category) => {
    expect(getDepartmentCategory(department)).toBe(category);
  });

  it("maps categories to tracks", () => {
    expect(getCategoryTrack("공학")).toBe("이과");
    expect(getCategoryTrack("상경")).toBe("문과");
    expect(getCategoryTrack("사범")).toBe("그 외");
  });

  // 데이터에 새 학과가 들어와 '기타'가 불어나면 규칙을 손볼 때가 된 것이다.
  it("leaves only a handful of real departments unclassified", () => {
    const records = data as DepartmentRecord[];
    const names = new Set(records.map((record) => record.학과));
    const unclassified = [...names].filter((name) => getDepartmentCategory(name) === "기타");
    expect(names.size).toBeGreaterThan(500);
    expect(unclassified.length).toBeLessThanOrEqual(5);
  });
});
