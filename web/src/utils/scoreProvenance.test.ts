import { describe, expect, it } from "vitest";
import {
  getGpaDisclosure,
  getToeicDisclosure,
  isDerived,
} from "./scoreProvenance";

describe("getToeicDisclosure", () => {
  it("treats a university that publishes raw TOEIC as published", () => {
    // 부경대는 '공인영어성적(TOEIC 해당자)' 열을 그대로 싣는다.
    const note = getToeicDisclosure("부경대학교");

    expect(note.disclosure).toBe("published");
    expect(note.marker).toBeNull();
    expect(isDerived(note)).toBe(false);
  });

  it("marks a proportional-formula university as exact derivation", () => {
    // 경북대는 환산점수만 싣지만 환산식이 100 x TOEIC / 990 이라 되짚기가 정확하다.
    const note = getToeicDisclosure("경북대학교");

    expect(note.disclosure).toBe("derived-exact");
    expect(note.marker).toBe("환산 역산");
    expect(note.description).toContain("정확");
    expect(isDerived(note)).toBe(true);
  });

  it("warns that a lookup-table university is only approximate", () => {
    for (const university of ["충남대학교", "충북대학교"]) {
      const note = getToeicDisclosure(university);

      expect(note.disclosure).toBe("derived-approximate");
      expect(note.marker).toContain("근사");
      expect(note.description).toContain("다를 수 있습니다");
    }
  });

  it("defaults to published for an unknown university", () => {
    expect(getToeicDisclosure("없는대학교").disclosure).toBe("published");
  });
});

describe("getGpaDisclosure", () => {
  it("marks derived GPA as exact because every such formula is proportional", () => {
    for (const university of ["경북대학교", "충남대학교", "충북대학교"]) {
      expect(getGpaDisclosure(university).disclosure).toBe("derived-exact");
    }
  });

  it("treats a university that publishes 백분위 as published", () => {
    // 전남대-전북대-부산대는 전적대 백분위를 그대로 싣는다.
    for (const university of ["전남대학교", "전북대학교", "부산대학교"]) {
      expect(getGpaDisclosure(university).disclosure).toBe("published");
      expect(isDerived(getGpaDisclosure(university))).toBe(false);
    }
  });
});
