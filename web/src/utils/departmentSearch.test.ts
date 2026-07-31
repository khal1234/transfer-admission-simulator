import { describe, expect, it } from "vitest";
import type { DepartmentRecord } from "./converter";
import {
  buildDepartmentSearchIndex,
  decomposeToJamo,
  filterDepartmentSearchIndex,
  getDepartmentGroupKey,
  resolveDepartmentAliases,
} from "./departmentSearch";

function createRecord(
  university: string,
  department: string,
  originalDepartment = department,
): DepartmentRecord {
  return {
    대학명: university,
    연도: "2026",
    학과: department,
    학과_원본명: originalDepartment,
    모집인원: 10,
    지원인원: 30,
    합격인원: 10,
    최종합격_토익환산점수: null,
    최종합격_토익원점수: 850,
    최종합격_학점환산점수: null,
    최종합격_학점원점수_100점만점: 90,
  };
}

const records = [
  createRecord("부산대학교", "기계공학부"),
  createRecord("경북대학교", "컴퓨터학부", "컴퓨터공학과"),
  createRecord("부산대학교", "생명과학과"),
];
const searchIndex = buildDepartmentSearchIndex(records);

describe("department search", () => {
  it("matches normalized department and historical names", () => {
    expect(
      filterDepartmentSearchIndex(searchIndex, "컴퓨터 공학", new Set())
        .map((record) => record.학과),
    ).toEqual(["컴퓨터학부"]);
  });

  it("matches Korean consonant initials", () => {
    expect(
      filterDepartmentSearchIndex(searchIndex, "ㄱㄱㄱㅎㅂ", new Set())
        .map((record) => record.학과),
    ).toEqual(["기계공학부"]);
  });

  it("applies the university filter together with the query", () => {
    expect(
      filterDepartmentSearchIndex(
        searchIndex,
        "학",
        new Set(["경북대학교"]),
      ).map((record) => record.학과),
    ).toEqual(["컴퓨터학부"]);
  });

  it("returns every selected-university record for a blank query", () => {
    expect(
      filterDepartmentSearchIndex(
        searchIndex,
        "  ",
        new Set(["부산대학교"]),
      ).map((record) => record.학과),
    ).toEqual(["기계공학부", "생명과학과"]);
  });
});

describe("abbreviation search", () => {
  // 검색이 부분 문자열 일치만 하던 시절에는 '컴공'으로 '컴퓨터공학과'가 안 나왔다.
  // 안내 문구에 예시로 적혀 있는데도 그랬다.
  it("finds a department by the abbreviation people actually use", () => {
    expect(
      filterDepartmentSearchIndex(searchIndex, "컴공", new Set())
        .map((record) => record.학과),
    ).toEqual(["컴퓨터학부"]);
  });

  it("matches while the abbreviation is still being typed", () => {
    expect(
      filterDepartmentSearchIndex(searchIndex, "컴", new Set())
        .map((record) => record.학과),
    ).toEqual(["컴퓨터학부"]);
  });

  it("expands an abbreviation to every spelling it covers", () => {
    expect(resolveDepartmentAliases("컴공")).toContain("컴퓨터공학");
    expect(resolveDepartmentAliases("전전")).toContain("전기전자");
    expect(resolveDepartmentAliases("사복")).toContain("사회복지");
  });

  it("returns nothing for a word that is not an abbreviation", () => {
    expect(resolveDepartmentAliases("존재하지않는말")).toEqual([]);
  });
});

describe("typing mid-syllable", () => {
  // '기계공'을 치는 도중에는 반드시 '기곅'을 거친다('기계' + ㄱ).
  // 글자 단위로 비교하면 그 순간 결과가 사라져 오타처럼 느껴진다.
  it("keeps matching while a syllable is still being assembled", () => {
    expect(
      filterDepartmentSearchIndex(searchIndex, "기곅", new Set())
        .map((record) => record.학과),
    ).toEqual(["기계공학부"]);
  });

  it("matches the completed word the same way", () => {
    expect(
      filterDepartmentSearchIndex(searchIndex, "기계공", new Set())
        .map((record) => record.학과),
    ).toEqual(["기계공학부"]);
  });

  it("decomposes Hangul into its jamo in order", () => {
    expect(decomposeToJamo("기계")).toBe("ㄱㅣㄱㅖ");
    expect(decomposeToJamo("기곅")).toBe("ㄱㅣㄱㅖㄱ");
    expect(decomposeToJamo("공")).toBe("ㄱㅗㅇ");
  });

  it("leaves non-Hangul untouched", () => {
    expect(decomposeToJamo("AI융합")).toBe("AIㅇㅠㅇㅎㅏㅂ");
  });
});

describe("result ordering", () => {
  // 원본 JSON이 대학별로 묶여 있어 그대로 두면 같은 과가 대학 순서에 밀려
  // 멀리 떨어져 나왔다. 찾는 사람은 같은 과를 대학끼리 견주고 싶어 한다.
  it("groups the same department across universities", () => {
    const grouped = buildDepartmentSearchIndex([
      createRecord("충남대학교", "기계공학부"),
      createRecord("강원대학교", "화학공학과"),
      createRecord("경북대학교", "기계공학과"),
      createRecord("부산대학교", "기계공학부"),
    ]);

    expect(
      filterDepartmentSearchIndex(grouped, "", new Set())
        .map((record) => `${record.학과}/${record.대학명}`),
    ).toEqual([
      "기계공학과/경북대학교",
      "기계공학부/부산대학교",
      "기계공학부/충남대학교",
      "화학공학과/강원대학교",
    ]);
  });
});

describe("getDepartmentGroupKey", () => {
  it("treats 과/부/전공 as the same unit", () => {
    expect(getDepartmentGroupKey("기계공학과")).toBe("기계공학");
    expect(getDepartmentGroupKey("기계공학부")).toBe("기계공학");
    expect(getDepartmentGroupKey("기계공학전공")).toBe("기계공학");
  });

  // 교육과 여부는 학부/학과 표기 차이보다 훨씬 큰 차이다.
  it("keeps teaching departments apart", () => {
    expect(getDepartmentGroupKey("기계공학교육과")).toBe("기계공학교육");
    expect(getDepartmentGroupKey("기계공학교육과"))
      .not.toBe(getDepartmentGroupKey("기계공학과"));
  });

  it("drops the parenthesised sub-track and normalises the middle dot", () => {
    expect(getDepartmentGroupKey("기계의용·메카트로닉스공학부(기계의용공학전공)"))
      .toBe("기계의용·메카트로닉스공학");
    expect(getDepartmentGroupKey("농업토목ㆍ생물산업공학부 (농업토목공학전공)"))
      .toBe("농업토목·생물산업공학");
  });

  // '학'까지 떼면 '기계공학과'가 '기계공'이 되어 도리어 갈라진다.
  it("does not strip 학 from the stem", () => {
    expect(getDepartmentGroupKey("간호학과")).toBe("간호학");
    expect(getDepartmentGroupKey("간호학부")).toBe("간호학");
    expect(getDepartmentGroupKey("기계설계공학")).toBe("기계설계공학");
  });
});

describe("grouped ordering", () => {
  it("puts 학과/학부/전공 of the same department in one block", () => {
    const grouped = buildDepartmentSearchIndex([
      createRecord("부경대학교", "기계공학전공"),
      createRecord("경북대학교", "기계공학교육과"),
      createRecord("인천대학교", "기계공학과"),
      createRecord("부산대학교", "기계공학부"),
    ]);

    expect(
      filterDepartmentSearchIndex(grouped, "기계", new Set())
        .map((record) => record.학과),
    ).toEqual([
      "기계공학과",
      "기계공학부",
      "기계공학전공",
      "기계공학교육과",
    ]);
  });
});
