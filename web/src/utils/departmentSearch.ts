import type { DepartmentRecord } from "./converter";

const KOREAN_CHOSUNG = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

export type SearchableDepartmentRecord = {
  record: DepartmentRecord;
  normalizedDepartment: string;
  normalizedOriginalDepartment: string;
  departmentChosung: string;
  originalDepartmentChosung: string;
};

/**
 * 줄여 부르는 이름 → 실제 학과명에 들어 있는 조각.
 *
 * 검색이 부분 문자열 일치만 하다 보니 '컴공'으로는 '컴퓨터공학과'가 안 나왔다.
 * 안내 문구에는 예시로 '컴공'이 적혀 있는데도 그랬다. 한국어 합성어를 기계적으로
 * 쪼갤 방법이 마땅치 않아, 실제로 쓰는 줄임말만 표로 둔다. 없는 말을 지어내면
 * 엉뚱한 학과가 섞이므로 실제로 통용되는 것만 넣는다.
 */
const DEPARTMENT_ALIASES: Record<string, string[]> = {
  컴공: ["컴퓨터공학", "컴퓨터학", "컴퓨터과학", "컴퓨터정보", "컴퓨터소프트웨어"],
  컴퓨: ["컴퓨터"],
  전컴: ["전기컴퓨터", "전자컴퓨터"],
  전전: ["전기전자"],
  전기전자: ["전기전자", "전기공학", "전자공학"],
  기공: ["기계공학"],
  기계공: ["기계공학", "기계시스템", "기계설계"],
  산공: ["산업공학", "산업경영공학"],
  화공: ["화학공학", "화공생명", "화학공정"],
  신소재: ["신소재공학", "재료공학"],
  건환: ["건설환경"],
  토목: ["토목공학", "건설환경"],
  정보통신: ["정보통신", "전자통신"],
  소웨: ["소프트웨어"],
  소공: ["소프트웨어"],
  인공지능: ["인공지능", "지능형"],
  데사: ["데이터과학", "데이터공학", "빅데이터"],
  국문: ["국어국문"],
  영문: ["영어영문"],
  중문: ["중어중문", "중국학", "중어중국"],
  일문: ["일어일문", "일본학", "일본지역"],
  불문: ["불어불문", "프랑스"],
  독문: ["독어독문"],
  노문: ["노어노문"],
  정외: ["정치외교"],
  행정: ["행정학"],
  사복: ["사회복지"],
  미컴: ["미디어커뮤니케이션", "미디어", "언론정보"],
  신방: ["미디어커뮤니케이션", "신문방송", "언론정보"],
  경영: ["경영학", "경영·회계", "경영회계"],
  경제: ["경제학", "경제통상", "경제·정보통계"],
  무역: ["무역학", "국제무역", "통상"],
  통계: ["통계학", "정보통계"],
  간호: ["간호학"],
  식영: ["식품영양"],
  식공: ["식품공학"],
  생명: ["생명공학", "생명과학", "생명시스템"],
  생공: ["생명공학"],
  환공: ["환경공학", "환경시스템"],
  건축: ["건축학", "건축공학", "건축디자인"],
  도시: ["도시공학", "도시계획", "도시행정"],
  의공: ["의공학", "의용공학", "바이오메디컬"],
  약학: ["약학과", "제약"],
  수의: ["수의학", "수의예"],
  체교: ["체육교육"],
  유교: ["유아교육"],
  수교: ["수학교육"],
  영교: ["영어교육"],
  국교: ["국어교육"],
};

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/\s/g, "");
}

/**
 * 입력이 줄임말이면 대응하는 학과명 조각들을 돌려준다.
 * 타이핑 도중에도 걸리도록 줄임말이 입력으로 시작하는 경우까지 본다
 * ('컴' -> '컴공' -> 컴퓨터공학...).
 */
export function resolveDepartmentAliases(normalizedQuery: string): string[] {
  if (normalizedQuery === "") {
    return [];
  }

  const targets = new Set<string>();
  for (const [alias, expansions] of Object.entries(DEPARTMENT_ALIASES)) {
    if (alias === normalizedQuery || alias.startsWith(normalizedQuery)) {
      expansions.forEach((expansion) => targets.add(normalizeSearchText(expansion)));
    }
  }

  return [...targets];
}

function getChosung(text: string): string {
  let result = "";

  for (const character of text) {
    const code = character.charCodeAt(0) - 44032;

    if (code >= 0 && code <= 11172) {
      result += KOREAN_CHOSUNG[Math.floor(code / 588)] ?? "";
    } else {
      result += character;
    }
  }

  return result;
}

export function buildDepartmentSearchIndex(
  records: DepartmentRecord[],
): SearchableDepartmentRecord[] {
  return records.map((record) => ({
    record,
    normalizedDepartment: normalizeSearchText(record.학과),
    normalizedOriginalDepartment: normalizeSearchText(record.학과_원본명),
    departmentChosung: getChosung(record.학과),
    originalDepartmentChosung: getChosung(record.학과_원본명),
  }));
}

export function filterDepartmentSearchIndex(
  searchableRecords: SearchableDepartmentRecord[],
  searchQuery: string,
  selectedUniversities: ReadonlySet<string>,
): DepartmentRecord[] {
  const normalizedQuery = normalizeSearchText(searchQuery);
  const isChosungOnly = /^[ㄱ-ㅎ\s]+$/.test(searchQuery);
  const aliasTargets = isChosungOnly ? [] : resolveDepartmentAliases(normalizedQuery);

  const matched = searchableRecords.flatMap((searchable) => {
    if (
      selectedUniversities.size > 0
      && !selectedUniversities.has(searchable.record.대학명)
    ) {
      return [];
    }

    if (normalizedQuery === "") {
      return [searchable.record];
    }

    const matches = isChosungOnly
      ? searchable.departmentChosung.includes(normalizedQuery)
        || searchable.originalDepartmentChosung.includes(normalizedQuery)
      : searchable.normalizedDepartment.includes(normalizedQuery)
        || searchable.normalizedOriginalDepartment.includes(normalizedQuery)
        || aliasTargets.some((target) =>
          searchable.normalizedDepartment.includes(target)
          || searchable.normalizedOriginalDepartment.includes(target));

    return matches ? [searchable.record] : [];
  });

  // 학과명 기준으로 모은다. 원본 JSON이 대학별로 묶여 있어 그대로 두면
  // '기계공학과'와 '기계공학부'가 대학 순서에 밀려 멀리 떨어져 나온다.
  // 찾는 사람은 같은 과를 대학끼리 견주고 싶어 하므로 과가 먼저다.
  return matched.sort((a, b) => {
    const byDepartment = a.학과.localeCompare(b.학과, "ko");
    return byDepartment !== 0
      ? byDepartment
      : a.대학명.localeCompare(b.대학명, "ko");
  });
}
