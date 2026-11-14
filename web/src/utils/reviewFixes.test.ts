import { describe, expect, it } from "vitest";
import rawRecords from "../data/편입_성적_통합.json";
import {
  analyzeScoreDeficit,
  calculateScore,
  getBorderlineMargin,
  type DepartmentRecord,
} from "./converter";
import {
  fuzzyJamoIncludes,
  getSourceNameNote,
  splitUniversityFromQuery,
} from "./departmentSearch";
import { checkEligibility, describeEligibilityFailure } from "./eligibility";
import { formatScore, formatSignedScore } from "./formatScore";
import { getConversionFormula } from "./formulaRegistry";
import {
  GUIDELINE_CHANGES,
  getGuidelineGroups,
  getRelevantChanges,
  getScoreCautions,
  getScoreChangeReach,
  isCommonChange,
} from "./guidelineChanges";
import { isComparableRecord } from "./records";
import { getUnavailableScoreDescription } from "./scoreAvailability";
import { buildShareHash, parseShareHash } from "./shareLink";

// 2026-11-14 검토에서 나온 결함이 되살아나지 않는지 본다.

const UNIVERSITIES = [
  "강원대학교", "경북대학교", "부경대학교", "부산대학교", "인천대학교",
  "전남대학교", "전북대학교", "충남대학교", "충북대학교",
];

function record(overrides: Partial<DepartmentRecord>): DepartmentRecord {
  return {
    대학명: "강원대학교",
    연도: "2026",
    학과: "수의학과",
    학과_원본명: "수의학과",
    모집인원: 4,
    지원인원: 10,
    합격인원: 4,
    최종합격_토익환산점수: null,
    최종합격_토익원점수: 990,
    최종합격_학점환산점수: null,
    최종합격_학점원점수_100점만점: null,
    합격자기준: "최초",
    ...overrides,
  };
}

describe("근접 문턱 (13번)", () => {
  it("반영 만점의 5% 를 쓴다", () => {
    expect(getBorderlineMargin("부산대학교", "2026", "기계공학부")).toEqual({
      fullMarks: 60,
      margin: 3,
    });
    expect(getBorderlineMargin("전남대학교", "2026", "기계공학부")?.margin).toBe(30);
  });

  it("영어 30점 만점 전형에서 3점 넘게 모자라면 근접이 아니다", () => {
    const margin = getBorderlineMargin("강원대학교", "2026", "수의학과");
    expect(margin).toEqual({ fullMarks: 30, margin: 1.5 });

    // TOEIC 880 → 26.67점, 합격 평균 990 → 30점. 예전에는 «근접 −3.33» 이었다.
    const score = calculateScore("강원대학교", "2026", 880, 100, record({}), "수의학과");
    expect(score.diff).toBe(-3.33);
    expect(score.status).toBe("risk");
  });
});

describe("어느 쪽이 유리 (9번)", () => {
  it("입력 척도를 바꿔도 답이 같다", () => {
    const on100 = analyzeScoreDeficit("부산대학교", "2026", "100", 0, 100, 990, "기계공학부");
    const on45 = analyzeScoreDeficit("부산대학교", "2026", "4.5", 0, 4.5, 990, "기계공학부");
    expect(on45.recommendedMetric).toBe(on100.recommendedMetric);
    expect(on45.gpaEfficiencyPer100).toBe(on100.gpaEfficiencyPer100);
  });

  // 전적대를 반영하지 않는 강원대 수의학과에 «전적대 백분위 1점 상승 시 +0점»과
  // «영어 쪽이 유리»가 떴다(2026-11-14 사용자 지적). 한쪽만 반영하는 전형 전부를 본다.
  it("한쪽만 반영하는 전형에는 견주는 말을 하지 않는다", () => {
    const seen = new Set<string>();
    const oneSided: string[] = [];

    (rawRecords as DepartmentRecord[]).forEach((row) => {
      const key = `${row.대학명}|${row.연도}|${row.학과}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);

      const formula = getConversionFormula(row.대학명, row.연도, row.학과);
      if (formula === null) {
        return;
      }

      const analysis = analyzeScoreDeficit(row.대학명, row.연도, "100", 1, 90, 800, row.학과);
      expect(analysis.usesEnglish, key).toBe(formula.convertEnglish !== null);
      expect(analysis.usesGpa, key).toBe(formula.convertGpa !== null);
      if (formula.convertEnglish === null || formula.convertGpa === null) {
        oneSided.push(key);
        expect(analysis.recommendedMetric, key).toBe("none");
      }
    });

    // 분모: 한쪽만 반영하는 전형이 자료에 실제로 있어야 이 검사가 뜻이 있다.
    expect(oneSided.length).toBeGreaterThan(0);
    expect(oneSided).toContain("강원대학교|2026|수의학과");
  });
});

describe("지원 자격 (2번)", () => {
  it("강원대 수의학과는 TOEIC 850 미만이면 지원 자격 미달이다", () => {
    const failed = checkEligibility("강원대학교", "수의학과", 830, 100);
    expect(describeEligibilityFailure(failed)).toBe("TOEIC 850점 이상");
    expect(describeEligibilityFailure(
      checkEligibility("강원대학교", "수의학과", 850, 100),
    )).toBeNull();
  });

  it("점수를 안 넣은 항목은 미달로 치지 않는다", () => {
    expect(checkEligibility("강원대학교", "수의학과", null, null).failures).toHaveLength(0);
  });

  it("없어진 옛 기준은 쓰지 않는다", () => {
    // 부산대 국제학부 TOEIC 800 은 2025 요강에만 있었다.
    expect(checkEligibility("부산대학교", "국제학부", 700, 90).failures).toHaveLength(0);
  });

  it("전남대는 전적대 백분위 80 미만이면 미달이다", () => {
    expect(describeEligibilityFailure(
      checkEligibility("전남대학교", "기계공학부", 900, 79),
    )).toBe("전적대 백분위 80 이상");
  });
});

describe("등록 0명인데 평균이 있는 줄 (8번)", () => {
  it("최초 합격자 평균이면 견준다", () => {
    expect(isComparableRecord(record({ 합격인원: 0, 합격자기준: "최초" }))).toBe(true);
  });

  it("최종 합격자 기준이면 견주지 않는다", () => {
    expect(isComparableRecord(record({ 합격인원: 0, 합격자기준: "최종" }))).toBe(false);
  });
});

describe("검색 (15번)", () => {
  it("검색어에서 대학 이름을 떼어 낸다", () => {
    expect(splitUniversityFromQuery("부산대 기계", UNIVERSITIES)).toEqual({
      universities: ["부산대학교"],
      rest: "기계",
    });
    expect(splitUniversityFromQuery("충북대학교", UNIVERSITIES)).toEqual({
      universities: ["충북대학교"],
      rest: "",
    });
    expect(splitUniversityFromQuery("기계", UNIVERSITIES)).toEqual({
      universities: [],
      rest: "기계",
    });
  });

  it("두 글자 낱말에는 오타 봐주기를 하지 않는다", () => {
    // 「의예」가 「공예」에 걸리던 경우
    expect(fuzzyJamoIncludes("ㄱㅗㅇㅇㅖㅈㅓㄴㄱㅗㅇ", "ㅇㅢㅇㅖ")).toBe(false);
    // 「기곜」(오타)은 여전히 「기계공」에 걸린다
    expect(fuzzyJamoIncludes("ㄱㅣㄱㅖㄱㅗㅇ", "ㄱㅣㄱㅖㅋ")).toBe(true);
  });
});

describe("점수 표시 자릿수 (21번)", () => {
  it("소수 둘째 자리까지만 낸다", () => {
    expect(formatScore(267.7171)).toBe("267.72");
    expect(formatScore(56.5)).toBe("56.5");
    expect(formatSignedScore(1.6666)).toBe("+1.67");
    expect(formatSignedScore(-1.3333)).toBe("-1.33");
  });
});

describe("구성 주소 (16번)", () => {
  it("만든 주소를 다시 읽으면 같은 구성이 나온다", () => {
    const setup = {
      toeic: "850",
      gpaRaw: "3.8",
      gpaType: "4.5" as const,
      targets: [{ univ: "부산대학교", dept: "기계공학부" }],
    };
    expect(parseShareHash(buildShareHash(setup))).toEqual(setup);
  });

  it("깨진 주소는 버린다", () => {
    expect(parseShareHash("#s=%7Bnot-json")).toBeNull();
    expect(parseShareHash("#guideline-changes")).toBeNull();
    expect(parseShareHash("")).toBeNull();
  });
});

describe("새 학년도 달라진 점 자료 (3번)", () => {
  it("수록한 9개 대학이 한 번씩 들어 있다", () => {
    expect(GUIDELINE_CHANGES.universities.map((entry) => entry.univ).sort())
      .toEqual([...UNIVERSITIES].sort());
  });

  it("달라졌다고 한 대학에는 무엇이 달라졌는지와 볼 쪽이 있다", () => {
    GUIDELINE_CHANGES.universities
      .filter((entry) => entry.verdict === "changed")
      .forEach((entry) => {
        expect(entry.changes.length, entry.univ).toBeGreaterThan(0);
        entry.changes.forEach((change) => {
          expect(change.pageAfter, `${entry.univ} ${change.area}`).not.toBe("");
        });
      });
  });

  it("항목마다 한 줄 제목이 있고, 학과를 가리지 않는 항목에는 계열이 없다", () => {
    const all = GUIDELINE_CHANGES.universities.flatMap((entry) => entry.changes);
    expect(all.length).toBeGreaterThan(0);
    all.forEach((change) => {
      expect(change.title.length, change.scope).toBeGreaterThan(0);
      expect(change.title.length, change.title).toBeLessThanOrEqual(44);
      if (change.scope.includes("전체 모집단위")) {
        expect(isCommonChange(change), change.title).toBe(true);
      }
    });
  });

  it("같은 계열이 달라진 대학을 한데 모은다", () => {
    const groups = getGuidelineGroups();
    const universitiesOf = (name: string) => [
      ...new Set(groups.find((item) => item.group === name)?.rows.map((row) => row.entry.univ)),
    ];

    expect(universitiesOf("간호")).toEqual(["강원대학교", "전북대학교", "충북대학교"]);
    expect(universitiesOf("수의")).toEqual(["강원대학교", "전북대학교", "충북대학교"]);
    // 겹치는 대학이 많은 계열이 앞에 온다.
    const counts = groups.map((item) => item.universityCount);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    // 학과를 가리지 않는 항목은 어느 계열에도 들어가지 않는다.
    groups.forEach((item) => item.rows.forEach((row) => {
      expect(isCommonChange(row.change), row.change.title).toBe(false);
    }));
  });

  it("점수 계산이 일부 학과에서만 달라지는 대학을 구별한다", () => {
    const reach = (univ: string) => getScoreChangeReach(
      GUIDELINE_CHANGES.universities.find((entry) => entry.univ === univ)!,
    );

    expect(reach("인천대학교")).toBe("some");
    expect(reach("충북대학교")).toBe("all");
    expect(reach("경북대학교")).toBe("none");
  });

  it("카드의 주의는 올해 점수 계산이 달라지는 학과에만 붙는다", () => {
    const cautions = (univ: string, dept: string) => getScoreCautions(
      GUIDELINE_CHANGES.universities.find((entry) => entry.univ === univ)!,
      dept,
    ).length;

    expect(cautions("충북대학교", "기계공학부")).toBe(2); // 영어 식 · 환산표
    expect(cautions("충북대학교", "약학과")).toBe(3); // + TOEIC 불가
    expect(cautions("인천대학교", "한국화전공")).toBe(1);
    expect(cautions("인천대학교", "경영학부")).toBe(0);
    expect(cautions("충남대학교", "약학과")).toBe(1);
    expect(cautions("충남대학교", "기계공학부")).toBe(0);
    expect(cautions("부산대학교", "기계공학부")).toBe(0);
  });

  // 부산대 기계공학부 카드에 «세 학과의 서류·면접 배점 변경»이 떴다(2026-11-14 사용자 지적).
  it("카드는 그 학과에 해당하는 것만 알린다", () => {
    const relevant = (univ: string, dept: string) => getRelevantChanges(
      GUIDELINE_CHANGES.universities.find((entry) => entry.univ === univ)!,
      dept,
    ).map((change) => change.title);

    // 부산대는 모든 학과에 해당하는 변경이 없다 — 기계공학부 카드에는 알릴 것이 없다.
    expect(relevant("부산대학교", "기계공학부")).toEqual([]);
    expect(relevant("부산대학교", "산업공학과")).toEqual(["산업공학과: 면접 40 → 서류 20 + 면접 20"]);
    // 내 학과 것이 앞에, 모든 학과 것이 뒤에 온다.
    const nursing = relevant("강원대학교", "간호학과");
    expect(nursing[0]).toBe("간호학과 1단계 선발인원 기준 변경");
    expect(nursing.slice(1)).toEqual([
      "전적대 성적은 최근 2개 대학까지만 반영",
      "TOEFL·TEPS 환산표 교체(TOEIC 제출자는 무관)",
    ]);
    // 목록에 이름만 나오고 배수는 그대로인 학과에는 «선발 배수» 항목을 알리지 않는다.
    expect(relevant("전남대학교", "전자컴퓨터공학부").some((title) => title.includes("배수"))).toBe(false);
    expect(relevant("전남대학교", "산업공학과").some((title) => title.includes("배수"))).toBe(true);
  });

  // 영어 성적 인정 기간은 해마다 1년씩 밀릴 뿐이라 어느 대학이든 같다 — 달라진 점이 아니다(2026-11-15 사용자 지적).
  it("영어 성적 인정 기간이 한 해 밀린 것은 달라진 점으로 싣지 않는다", () => {
    const all = GUIDELINE_CHANGES.universities.flatMap((entry) => entry.changes);
    const rolling = all.filter((change) => /시험만 인정|인정 기간/.test(change.title));

    expect(all.length).toBeGreaterThan(30);
    expect(rolling.map((change) => change.title)).toEqual([]);
    GUIDELINE_CHANGES.universities.forEach((entry) => {
      expect(entry.headline, entry.univ).not.toContain("인정 기간");
    });
  });

  it("학과별 항목에 실린 학과 이름은 사이트 자료에 있는 이름이다", () => {
    const known = new Set((rawRecords as DepartmentRecord[]).map((row) => `${row.대학명}|${row.학과}`));
    let checked = 0;

    GUIDELINE_CHANGES.universities.forEach((entry) => entry.changes.forEach((change) => {
      change.departments.forEach((department) => {
        checked += 1;
        expect(known.has(`${entry.univ}|${department}`), `${entry.univ} ${department}`).toBe(true);
      });
      // 학과를 가리지 않는 항목에는 학과 이름이 없다.
      if (isCommonChange(change)) {
        expect(change.departments, change.title).toEqual([]);
      }
    }));

    expect(checked).toBeGreaterThan(30);
  });
});

describe("평균이 없는 까닭 설명 (11번 자료 수정 뒤)", () => {
  const records = rawRecords as DepartmentRecord[];
  const find = (univ: string, year: string, dept: string) => {
    const found = records.find((row) =>
      row.대학명 === univ && row.연도 === year && row.학과 === dept);
    if (!found) throw new Error(`${univ} ${year} ${dept} 줄이 없다`);
    return found;
  };

  it("부산대 2026 「-」 줄에 0명·1명이라는 말을 붙이지 않는다", () => {
    const text = getUnavailableScoreDescription(find("부산대학교", "2026", "불어불문학과"), "toeic");
    expect(text).toContain("「-」로만 적혀");
    expect(text).not.toContain("0명으로 공개");
    expect(text).not.toContain("합격자가 1명인 경우");
  });

  it("충북대는 등록 0명이어도 0명 판정을 하지 않는다", () => {
    const text = getUnavailableScoreDescription(find("충북대학교", "2024", "프랑스언어문화학과"), "toeic");
    expect(text).not.toContain("0명으로 공개");
  });

  it("충남대에서 비고가 없는 줄에 「합격자 2명 이하」를 붙이지 않는다", () => {
    const text = getUnavailableScoreDescription(find("충남대학교", "2025", "기계공학교육과"), "toeic");
    expect(text).not.toContain("2명 이하");
  });
});

describe("원문 이름 딱지 (경북 2026 묶음 줄)", () => {
  const base = { 대학명: "경북대학교", 연도: "2026" };

  it("묶음 줄에 「이전 명칭」을 붙이지 않는다", () => {
    const note = getSourceNameNote({ ...base, 학과: "음악학과", 학과_원본명: "성악전공" });
    expect(note).toContain("여러 줄");
    expect(note).not.toContain("이전 명칭");
  });

  it("이름이 정말 다른 줄은 그대로 「이전 명칭」이다", () => {
    expect(getSourceNameNote({ ...base, 학과: "기계공학부", 학과_원본명: "기계공학과" }))
      .toBe("이전 명칭: 기계공학과");
    expect(getSourceNameNote({ ...base, 학과: "산림과학·조경학부", 학과_원본명: "산림과학ㆍ조경학부" }))
      .toBeNull();
  });
});
