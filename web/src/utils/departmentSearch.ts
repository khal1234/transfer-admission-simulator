import type { DepartmentRecord } from "./converter";

const KOREAN_CHOSUNG = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

const KOREAN_JUNGSUNG = [
  "ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ",
  "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ",
];

const KOREAN_JONGSUNG = [
  "", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ",
  "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

export type SearchableDepartmentRecord = {
  record: DepartmentRecord;
  normalizedDepartment: string;
  normalizedOriginalDepartment: string;
  departmentChosung: string;
  originalDepartmentChosung: string;
  departmentJamo: string;
  originalDepartmentJamo: string;
};

/**
 * 한글을 자모로 풀어 늘어놓는다. '기계' -> 'ㄱㅣㄱㅖ'
 *
 * 이러면 타이핑 중간 상태가 자연스럽게 걸린다. '기계공'을 치는 도중에는 반드시
 * '기곅'을 거치는데('기계'+ㄱ), 글자 단위로 비교하면 그 순간 결과가 사라진다.
 * 자모로 펴면 'ㄱㅣㄱㅖㄱ'이 'ㄱㅣㄱㅖㄱㅗㅇ'의 앞부분이라 계속 걸린다.
 * 사용자가 '오타'라고 부른 것도 실은 이 중간 상태였다.
 */
export function decomposeToJamo(text: string): string {
  let result = "";

  for (const character of text) {
    const code = character.charCodeAt(0) - 44032;

    if (code >= 0 && code <= 11171) {
      result += KOREAN_CHOSUNG[Math.floor(code / 588)] ?? "";
      result += KOREAN_JUNGSUNG[Math.floor((code % 588) / 28)] ?? "";
      result += KOREAN_JONGSUNG[code % 28] ?? "";
    } else {
      result += character;
    }
  }

  return result;
}

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
/** 두 문자열이 한 글자 이내로 다른가 (치환·삽입·삭제 각 1회까지). */
function isWithinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) {
    return false;
  }

  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  let i = 0;
  let j = 0;
  let edits = 0;

  while (i < shorter.length && j < longer.length) {
    if (shorter[i] === longer[j]) {
      i += 1;
      j += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) {
      return false;
    }

    if (shorter.length === longer.length) {
      i += 1;
    }
    j += 1;
  }

  return edits + (longer.length - j) + (shorter.length - i) <= 1;
}

/**
 * 자모 한 개 차이까지 봐주는 부분 일치.
 *
 * '기곜'은 '기계' 뒤에 ㅋ 을 잘못 누른 것이라 자모로 펴도 'ㄱㅣㄱㅖㅋ' 가 되어
 * 'ㄱㅣㄱㅖㄱㅗㅇ' 의 부분 문자열이 아니다. 이런 진짜 오타는 편집거리로만 잡힌다.
 * 정확히 친 사람의 결과를 흐리지 않도록, 정확 일치가 하나도 없을 때만 쓴다.
 */
export function fuzzyJamoIncludes(haystack: string, needle: string): boolean {
  if (needle.length < 3) {
    return false;
  }

  for (let start = 0; start <= haystack.length - needle.length + 1; start += 1) {
    for (const length of [needle.length - 1, needle.length, needle.length + 1]) {
      if (length <= 0 || start + length > haystack.length) {
        continue;
      }
      if (isWithinOneEdit(haystack.slice(start, start + length), needle)) {
        return true;
      }
    }
  }

  return false;
}

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

/**
 * 정렬용 표준명 — 같은 과인데 대학마다 다르게 부르는 꼬리를 뗀다.
 *
 * '기계'로 검색하면 기계공학과·기계공학부·기계공학전공이 학과명 가나다순에
 * 밀려 사이사이 다른 과를 끼고 흩어졌다. 찾는 사람 입장에서 이 셋은 같은 과라
 * 한 뭉텅이로 보여야 한다.
 *
 * 꼬리는 '전공 → 과 → 부' 순서로 딱 하나만 뗀다. '학과'를 통째로 떼면
 * '기계공학과'가 '기계공'이 되어 '기계공학부'(→'기계공학')와 도리어 갈라진다.
 * '학'은 이름의 일부라 떼지 않는다 — 간호학과·간호학부가 모두 '간호학'으로
 * 모인다.
 *
 * '교육'이 붙은 학과는 이 규칙에서 저절로 갈라진다. '기계공학교육과'는
 * '기계공학교육'이 되어 '기계공학'과 다른 자리에 놓인다. 사용자 말대로 교육과
 * 여부가 학부/학과 표기 차이보다 훨씬 큰 차이라서 그래야 맞다.
 */
export function getDepartmentGroupKey(department: string): string {
  const withoutDetail = department
    .replace(/[（(].*?[)）]/g, "")
    .replace(/[ㆍ‧・･]/g, "·")
    .replace(/\s/g, "")
    .trim();

  for (const suffix of ["전공", "과", "부"]) {
    if (withoutDetail.length > suffix.length && withoutDetail.endsWith(suffix)) {
      return withoutDetail.slice(0, -suffix.length);
    }
  }

  return withoutDetail;
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
    departmentJamo: decomposeToJamo(normalizeSearchText(record.학과)),
    originalDepartmentJamo: decomposeToJamo(
      normalizeSearchText(record.학과_원본명),
    ),
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

    // 자모로 편 비교는 글자 단위 비교를 포함한다('기계'가 걸리면 'ㄱㅣㄱㅖ'도
    // 걸린다). 그래서 글자 비교는 따로 두지 않고 자모 비교로 대신한다.
    const queryJamo = decomposeToJamo(normalizedQuery);

    const matches = isChosungOnly
      ? searchable.departmentChosung.includes(normalizedQuery)
        || searchable.originalDepartmentChosung.includes(normalizedQuery)
      : searchable.departmentJamo.includes(queryJamo)
        || searchable.originalDepartmentJamo.includes(queryJamo)
        || aliasTargets.some((target) =>
          searchable.normalizedDepartment.includes(target)
          || searchable.normalizedOriginalDepartment.includes(target));

    return matches ? [searchable.record] : [];
  });

  // 정확히 친 사람의 결과를 흐리지 않도록, 하나도 안 걸렸을 때만 오타를 봐준다.
  const results = matched.length > 0 || normalizedQuery === "" || isChosungOnly
    ? matched
    : searchableRecords.flatMap((searchable) => {
      if (
        selectedUniversities.size > 0
        && !selectedUniversities.has(searchable.record.대학명)
      ) {
        return [];
      }

      const queryJamo = decomposeToJamo(normalizedQuery);
      return fuzzyJamoIncludes(searchable.departmentJamo, queryJamo)
        || fuzzyJamoIncludes(searchable.originalDepartmentJamo, queryJamo)
        ? [searchable.record]
        : [];
    });

  // 표준명 기준으로 모은다. 원본 JSON이 대학별로 묶여 있어 그대로 두면
  // '기계공학과'와 '기계공학부'가 대학 순서에 밀려 멀리 떨어져 나온다.
  // 찾는 사람은 같은 과를 대학끼리 견주고 싶어 하므로 과가 먼저다.
  return results.sort((a, b) => {
    const byGroup = getDepartmentGroupKey(a.학과)
      .localeCompare(getDepartmentGroupKey(b.학과), "ko");
    if (byGroup !== 0) {
      return byGroup;
    }

    const byDepartment = a.학과.localeCompare(b.학과, "ko");
    return byDepartment !== 0
      ? byDepartment
      : a.대학명.localeCompare(b.대학명, "ko");
  });
}
