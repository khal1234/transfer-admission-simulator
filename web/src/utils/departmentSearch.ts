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

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/\s/g, "");
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

  return searchableRecords.flatMap((searchable) => {
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
        || searchable.normalizedOriginalDepartment.includes(normalizedQuery);

    return matches ? [searchable.record] : [];
  });
}
