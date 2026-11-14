import { memo, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Search,
  Star,
  X,
} from "lucide-react";
import type { DepartmentRecord } from "../utils/converter";
import {
  buildDepartmentSearchIndex,
  filterDepartmentSearchIndex,
  getDepartmentGroupKey,
  getSourceNameNote,
  splitUniversityFromQuery,
} from "../utils/departmentSearch";
import { checkEligibility, describeEligibilityFailure } from "../utils/eligibility";
import {
  getGpaDisclosure,
  getToeicDisclosure,
} from "../utils/scoreProvenance";
import { getUnavailableScoreDescription } from "../utils/scoreAvailability";
import {
  CATEGORY_TRACKS,
  getDepartmentCategory,
  type DepartmentCategory,
} from "../utils/departmentCategory";
import {
  EXPLORER_SORT_LABELS,
  getExplorerMargin,
  sortExplorerRecords,
  type ExplorerMargin,
  type ExplorerSort,
} from "../utils/explorerSort";
import { getRecordKey } from "../utils/targets";
import RawScoreValue from "./RawScoreValue";
import RecruitmentCount from "./RecruitmentCount";
import UniversityName from "./UniversityName";

const ITEMS_PER_PAGE = 10;
const UNKNOWN_MARGIN: ExplorerMargin = { diff: null, ratio: null, status: "unknown" };
const NO_UNIVERSITY_FILTER: ReadonlySet<string> = new Set();

type DepartmentExplorerProps = {
  records: DepartmentRecord[];
  nonRecruitmentExceptions?: { university: string; department: string; years: string[]; evidence: string[] }[];
  targetKeys: ReadonlySet<string>;
  onToggleTarget: (univ: string, dept: string) => void;
  toeic?: number | null;
  gpa100?: number | null;
};

const MARGIN_LABELS: Record<ExplorerMargin["status"], string> = {
  safe: "평균 이상",
  borderline: "평균 근접",
  risk: "평균 미달",
  unknown: "판정 불가",
};

function MarginBadge({
  margin,
  ineligibleText,
}: {
  margin: ExplorerMargin;
  ineligibleText: string | null;
}) {
  const sign = margin.diff !== null && margin.diff > 0 ? "+" : "";
  if (ineligibleText !== null) {
    return (
      <span className="explorer-margin explorer-margin--ineligible">
        지원 자격 미달 (요강: {ineligibleText})
      </span>
    );
  }
  return (
    <span className={`explorer-margin explorer-margin--${margin.status}`}>
      {MARGIN_LABELS[margin.status]}
      {margin.diff !== null && ` ${sign}${margin.diff}점`}
      {margin.ratio !== null && ` (${sign}${(margin.ratio * 100).toFixed(1)}%)`}
    </span>
  );
}

function DepartmentExplorer({
  records,
  nonRecruitmentExceptions = [],
  targetKeys,
  onToggleTarget,
  toeic = null,
  gpa100 = null,
}: DepartmentExplorerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUnivs, setSelectedUnivs] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<DepartmentCategory[]>([]);
  const [sort, setSort] = useState<ExplorerSort>("default");
  const hasMyScore = toeic !== null || gpa100 !== null;
  const [currentPage, setCurrentPage] = useState(1);
  const resultsStartRef = useRef<HTMLParagraphElement | null>(null);

  const universities = useMemo(
    () => Array.from(new Set(records.map((record) => record.대학명))).sort(),
    [records],
  );
  const searchableRecords = useMemo(
    () => buildDepartmentSearchIndex(records),
    [records],
  );
  const selectedUnivSet = useMemo(
    () => new Set(selectedUnivs),
    [selectedUnivs],
  );
  // 「부산대 기계」처럼 대학 이름을 같이 치면 그 대학 안에서 찾는다. 예전에는
  // 학과 이름만 뒤져 0개가 나왔다(2026-11-14 검토 15번).
  const parsedQuery = useMemo(
    () => splitUniversityFromQuery(searchQuery, universities),
    [searchQuery, universities],
  );
  const effectiveUnivSet = useMemo(
    () => (parsedQuery.universities.length > 0
      ? new Set(parsedQuery.universities)
      : selectedUnivSet),
    [parsedQuery.universities, selectedUnivSet],
  );
  const searchedDepartments = useMemo(
    () => filterDepartmentSearchIndex(
      searchableRecords,
      parsedQuery.rest,
      effectiveUnivSet,
    ),
    [effectiveUnivSet, parsedQuery.rest, searchableRecords],
  );
  // 목록의 숫자가 몇 학년도 것인지. 가장 최근 학년도 자료가 없는 줄은 흐리게 한다.
  const latestYear = useMemo(
    () => records.reduce(
      (latest, record) => (Number(record.연도) > Number(latest) ? record.연도 : latest),
      "0",
    ),
    [records],
  );
  const getIneligibleText = (record: DepartmentRecord) => describeEligibilityFailure(
    checkEligibility(record.대학명, record.학과, toeic, gpa100),
  );
  // 계열 칩 옆 숫자는 대학·검색어까지 거른 뒤의 개수다. 0인 칩을 눌러 빈 화면을 보는 일을 막는다.
  const categoryCounts = useMemo(() => {
    const counts = new Map<DepartmentCategory, number>();
    searchedDepartments.forEach((record) => {
      const category = getDepartmentCategory(record.학과);
      counts.set(category, (counts.get(category) ?? 0) + 1);
    });
    return counts;
  }, [searchedDepartments]);
  const selectedCategorySet = useMemo(
    () => new Set(selectedCategories),
    [selectedCategories],
  );
  // 대학 칩 옆 숫자는 검색어·계열까지 거른 뒤 그 대학에 남는 개수다. 대학 고른 것은 넣지 않고 센다 —
  // 넣으면 고르지 않은 대학이 전부 0이 된다. 0인 대학을 눌러 빈 화면을 보는 일을 막는다.
  const universityCounts = useMemo(() => {
    const counts = new Map<string, number>();
    filterDepartmentSearchIndex(searchableRecords, parsedQuery.rest, NO_UNIVERSITY_FILTER)
      .forEach((record) => {
        if (
          selectedCategorySet.size > 0
          && !selectedCategorySet.has(getDepartmentCategory(record.학과))
        ) {
          return;
        }
        counts.set(record.대학명, (counts.get(record.대학명) ?? 0) + 1);
      });
    return counts;
  }, [parsedQuery.rest, searchableRecords, selectedCategorySet]);
  const effectiveSort: ExplorerSort = sort === "myMargin" && !hasMyScore ? "default" : sort;
  const marginByKey = useMemo(() => {
    const margins = new Map<string, ExplorerMargin>();
    if (effectiveSort !== "myMargin") {
      return margins;
    }
    searchedDepartments.forEach((record) => {
      margins.set(
        getRecordKey(record.대학명, record.학과),
        getExplorerMargin(record, toeic, gpa100),
      );
    });
    return margins;
  }, [effectiveSort, gpa100, searchedDepartments, toeic]);
  const getMargin = (record: DepartmentRecord): ExplorerMargin => (
    marginByKey.get(getRecordKey(record.대학명, record.학과)) ?? UNKNOWN_MARGIN
  );
  const filteredDepartments = useMemo(() => {
    const inCategory = selectedCategorySet.size === 0
      ? searchedDepartments
      : searchedDepartments.filter((record) => (
        selectedCategorySet.has(getDepartmentCategory(record.학과))
      ));
    return sortExplorerRecords(inCategory, effectiveSort, (record) => (
      marginByKey.get(getRecordKey(record.대학명, record.학과)) ?? UNKNOWN_MARGIN
    ));
  }, [effectiveSort, marginByKey, searchedDepartments, selectedCategorySet]);

  const totalPages = Math.ceil(filteredDepartments.length / ITEMS_PER_PAGE);
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDepartments.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, filteredDepartments]);

  const updateSearchQuery = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const toggleUniversity = (university: string) => {
    setSelectedUnivs((current) => (
      current.includes(university)
        ? current.filter((selected) => selected !== university)
        : [...current, university]
    ));
    setCurrentPage(1);
  };

  const toggleCategory = (category: DepartmentCategory) => {
    setSelectedCategories((current) => (
      current.includes(category)
        ? current.filter((selected) => selected !== category)
        : [...current, category]
    ));
    setCurrentPage(1);
  };

  // 「이과」를 누르면 그 아래 계열을 한꺼번에 켜고, 다 켜져 있으면 한꺼번에 끈다.
  const toggleTrack = (categories: DepartmentCategory[]) => {
    setSelectedCategories((current) => {
      const allOn = categories.every((category) => current.includes(category));
      return allOn
        ? current.filter((selected) => !categories.includes(selected))
        : [...current, ...categories.filter((category) => !current.includes(category))];
    });
    setCurrentPage(1);
  };

  const changePage = (nextPage: number) => {
    setCurrentPage(nextPage);

    if (!window.matchMedia("(max-width: 767px)").matches) {
      return;
    }

    window.requestAnimationFrame(() => {
      resultsStartRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    });
  };

  return (
    <section className="card explorer-card">
      <h2 className="card-title">
        <BookOpen size={20} color="var(--secondary-color)" />
        모집단위 탐색 및 지망 담기
      </h2>

      {nonRecruitmentExceptions.length > 0 && (
        <details className="non-recruitment-exceptions">
          <summary>최근 3개년 미모집 제외 사례 ({nonRecruitmentExceptions.length}개)</summary>
          <p>공식 자료에서 최근 3개년 모두 모집계획 0명이 확인된 학과만 탐색 목록에서 제외합니다. 이력은 보존하며, 새로운 모집인원이 반영되면 다시 표시합니다. 자료가 없다는 이유만으로 제외하지 않습니다.</p>
          <ul>{nonRecruitmentExceptions.map(item => (
            <li key={`${item.university}|${item.department}`}>
              <strong>{item.university} {item.department}</strong> ({[...item.years].reverse().join("·")} 미모집)
              <details><summary>연도별 공식 근거</summary>{item.evidence.map(text => <p key={text}>{text}</p>)}</details>
            </li>
          ))}</ul>
        </details>
      )}

      <div className="explorer-filters">
        <div className="search-input-box">
          <Search size={20} color="var(--text-muted)" />
          <input
            type="text"
            aria-label="학과 검색"
            placeholder="학과 이름을 검색해 보세요 (예: 기계, 컴공, ㄱㄱㄱㅎ)"
            value={searchQuery}
            onChange={(event) => updateSearchQuery(event.target.value)}
          />
          {searchQuery !== "" && (
            <button
              type="button"
              aria-label="검색어 지우기"
              className="search-clear-button"
              onClick={() => updateSearchQuery("")}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="univ-chips-grid" role="group" aria-label="대학 필터">
          <button
            type="button"
            className={`univ-chip ${selectedUnivs.length === 0 ? "active" : ""}`}
            aria-pressed={selectedUnivs.length === 0}
            onClick={() => {
              setSelectedUnivs([]);
              setCurrentPage(1);
            }}
          >
            전체 대학
          </button>
          {universities.map((university) => {
            const count = universityCounts.get(university) ?? 0;
            const isOn = selectedUnivSet.has(university);
            return (
              <button
                type="button"
                key={university}
                className={`univ-chip ${isOn ? "active" : ""}`}
                aria-pressed={isOn}
                disabled={count === 0 && !isOn}
                onClick={() => toggleUniversity(university)}
              >
                <UniversityName university={university} logoSize="small" />
                <span className="explorer-chip-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="explorer-refine">
        <div className="explorer-category-groups" role="group" aria-label="계열 필터">
          <button
            type="button"
            className={`univ-chip ${selectedCategories.length === 0 ? "active" : ""}`}
            aria-pressed={selectedCategories.length === 0}
            onClick={() => {
              setSelectedCategories([]);
              setCurrentPage(1);
            }}
          >
            전체 계열
          </button>
          {CATEGORY_TRACKS.map(({ track, categories }) => {
            const trackOn = categories.every((category) => selectedCategorySet.has(category));
            const trackCount = categories.reduce(
              (sum, category) => sum + (categoryCounts.get(category) ?? 0),
              0,
            );
            // 큰 갈래(이과·문과·그 외)는 줄 머리에, 그 아래 계열은 같은 줄 안쪽에 둔다.
            // 한 줄에 섞어 두면 «이과»가 «공학»과 같은 급의 계열로 읽힌다(2026-11-15 사용자 지적).
            return (
              <div className="explorer-category-row" key={track}>
                <button
                  type="button"
                  className={`explorer-track-chip ${trackOn ? "active" : ""}`}
                  aria-pressed={trackOn}
                  aria-label={`${track} 계열 전체 (${trackCount}개)`}
                  title={`${track}에 드는 계열을 한꺼번에 고릅니다.`}
                  disabled={trackCount === 0 && !trackOn}
                  onClick={() => toggleTrack(categories)}
                >
                  {track}
                  <span className="explorer-chip-count">{trackCount}</span>
                </button>
                <div className="explorer-category-subs">
                {categories.map((category) => {
                  const count = categoryCounts.get(category) ?? 0;
                  const isOn = selectedCategorySet.has(category);
                  return (
                    <button
                      type="button"
                      key={category}
                      className={`univ-chip ${isOn ? "active" : ""}`}
                      aria-pressed={isOn}
                      disabled={count === 0 && !isOn}
                      onClick={() => toggleCategory(category)}
                    >
                      {category}
                      <span className="explorer-chip-count">{count}</span>
                    </button>
                  );
                })}
                </div>
              </div>
            );
          })}
        </div>

        <label className="explorer-sort">
          <span>정렬</span>
          <select
            value={effectiveSort}
            onChange={(event) => {
              setSort(event.target.value as ExplorerSort);
              setCurrentPage(1);
            }}
          >
            {(Object.keys(EXPLORER_SORT_LABELS) as ExplorerSort[]).map((option) => (
              <option
                key={option}
                value={option}
                disabled={option === "myMargin" && !hasMyScore}
              >
                {EXPLORER_SORT_LABELS[option]}
                {option === "myMargin" && !hasMyScore ? " (위에 점수를 넣으면 켜짐)" : ""}
              </option>
            ))}
          </select>
        </label>
        <p className="explorer-sort-note">
          {effectiveSort === "myMargin"
            ? "최신 해 합격 평균과 내 점수를 그 학교 환산식으로 비교해, 평균보다 몇 % 높은지 순으로 세웁니다(학교마다 만점이 달라 점수 차이 대신 비율). 합격 평균이 없는 학과는 맨 뒤에 둡니다. "
            : ""}
          계열은 학과 이름으로 나눈 것이라 학교의 실제 단과대와 다를 수 있습니다.
        </p>
      </div>

      <p
        className="explorer-result-count"
        aria-live="polite"
        ref={resultsStartRef}
      >
        검색 결과 {filteredDepartments.length}개
        {parsedQuery.universities.length > 0 && (
          <span className="explorer-query-note">
            {" "}· {parsedQuery.universities.join(", ")} 안에서
            {parsedQuery.rest === "" ? " 전체를" : ` ‘${parsedQuery.rest}’을(를)`} 찾았습니다
          </span>
        )}
      </p>

      <div className="table-wrapper desktop-department-results">
        <table className="master-table">
          <thead>
            <tr>
              <th className="explorer-university-column">대학명</th>
              <th className="explorer-department-column">학과명 (통합 표준과명)</th>
              <th className="explorer-count-column table-cell-center">등록 / 모집인원 (자료 연도)</th>
              <th className="explorer-score-column table-cell-center">토익합격 평균</th>
              <th className="explorer-score-column table-cell-center">GPA합격 백분위</th>
              <th className="explorer-cart-column table-cell-center">장바구니</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="explorer-empty">
                  검색 결과와 일치하는 모집단위가 없습니다. 학과 이름의 일부만 넣어 보세요.
                  대학은 위의 대학 버튼으로 고르거나 ‘부산대 기계’처럼 띄어서 같이 칠 수 있습니다.
                </td>
              </tr>
            ) : (
              paginatedRecords.map((record, index) => {
                const key = getRecordKey(record.대학명, record.학과);
                const isAdded = targetKeys.has(key);
                // 같은 과 묶음이 어디서 갈리는지 선 하나로 보여준다. 정렬만으로
                // 붙여 놓으면 기계공학과-기계공학부-기계공학전공이 한 덩어리인지
                // 그냥 우연히 이웃한 건지 구별이 안 된다.
                const previousRecord = paginatedRecords[index - 1];
                const startsGroup = previousRecord !== undefined
                  && getDepartmentGroupKey(previousRecord.학과)
                    !== getDepartmentGroupKey(record.학과);

                return (
                  <tr
                    key={key}
                    className={[
                      startsGroup ? "department-group-start" : "",
                      record.연도 !== latestYear ? "explorer-row-stale" : "",
                    ].join(" ").trim()}
                  >
                    <td className="university-name-cell">
                      <UniversityName university={record.대학명} />
                    </td>
                    <td>
                      <div className="dept-name-wrapper">
                        <h4>{record.학과}</h4>
                        {getSourceNameNote(record) && (<span>{getSourceNameNote(record)}</span>)}
                        {record.연도 !== latestYear && (
                          <span className="explorer-stale-note">
                            {record.연도}학년도가 마지막 자료 · {latestYear}학년도 자료 없음
                          </span>
                        )}
                        {effectiveSort === "myMargin" && (
                          <MarginBadge
                            margin={getMargin(record)}
                            ineligibleText={getIneligibleText(record)}
                          />
                        )}
                      </div>
                    </td>
                    <td className="table-cell-center table-cell-semibold">
                      {/* 자료 연도는 늘 왼쪽, 인원은 그 옆 한 줄. 설명 단추가 붙는 줄만 연도 아래로
                          떨어져 줄마다 연도 자리가 달랐다(2026-11-15 사용자 지적). */}
                      <span className="explorer-count-cell">
                        <span className="explorer-year-tag">{record.연도}</span>
                        <RecruitmentCount record={record} />
                      </span>
                    </td>
                    <td className="table-cell-center table-cell-bold">
                      <RawScoreValue
                        value={record.최종합격_토익원점수}
                        note={getToeicDisclosure(record.대학명)}
                        unavailableDescription={getUnavailableScoreDescription(record, "toeic")}
                      />
                    </td>
                    <td className="table-cell-center table-cell-bold">
                      <RawScoreValue
                        value={record.최종합격_학점원점수_100점만점}
                        note={getGpaDisclosure(record.대학명)}
                        unavailableDescription={getUnavailableScoreDescription(record, "gpa")}
                      />
                    </td>
                    <td className="table-cell-center">
                      <button
                        type="button"
                        className={`btn-add-cart ${isAdded ? "added" : ""}`}
                        onClick={() => onToggleTarget(record.대학명, record.학과)}
                      >
                        <Star size={14} fill={isAdded ? "white" : "none"} />
                        {isAdded ? "지망 중" : "지망 추가"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mobile-department-results">
        {paginatedRecords.length === 0 ? (
          <p className="explorer-empty-mobile">
            검색 결과와 일치하는 모집단위가 없습니다. 학과 이름의 일부만 넣어 보세요.
            대학은 위의 대학 버튼으로 고르거나 ‘부산대 기계’처럼 띄어서 같이 칠 수 있습니다.
          </p>
        ) : (
          paginatedRecords.map((record) => {
            const key = getRecordKey(record.대학명, record.학과);
            const isAdded = targetKeys.has(key);

            return (
              <article
                className={`department-result-card ${record.연도 !== latestYear ? "explorer-row-stale" : ""}`}
                key={key}
              >
                <div className="department-result-heading">
                  <UniversityName
                    university={record.대학명}
                    className="department-university"
                    logoSize="small"
                  />
                  <span className="department-count explorer-count-cell">
                    <span className="explorer-year-tag">{record.연도}</span>
                    <RecruitmentCount record={record} mobile />
                  </span>
                </div>
                <div className="dept-name-wrapper">
                  <h3>{record.학과}</h3>
                  {getSourceNameNote(record) && (<span>{getSourceNameNote(record)}</span>)}
                  {record.연도 !== latestYear && (
                    <span className="explorer-stale-note">
                      {record.연도}학년도가 마지막 자료 · {latestYear}학년도 자료 없음
                    </span>
                  )}
                  {effectiveSort === "myMargin" && (
                    <MarginBadge
                      margin={getMargin(record)}
                      ineligibleText={getIneligibleText(record)}
                    />
                  )}
                </div>
                <dl className="department-metrics">
                  <div>
                    <dt>TOEIC 합격 평균</dt>
                    <dd>
                      <RawScoreValue
                        value={record.최종합격_토익원점수}
                        note={getToeicDisclosure(record.대학명)}
                        unavailableDescription={getUnavailableScoreDescription(record, "toeic")}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>GPA 합격 평균</dt>
                    <dd>
                      <RawScoreValue
                        value={record.최종합격_학점원점수_100점만점}
                        note={getGpaDisclosure(record.대학명)}
                        unavailableDescription={getUnavailableScoreDescription(record, "gpa")}
                      />
                    </dd>
                  </div>
                </dl>
                <button
                  type="button"
                  className={`btn-add-cart mobile-add-cart ${isAdded ? "added" : ""}`}
                  onClick={() => onToggleTarget(record.대학명, record.학과)}
                >
                  <Star size={16} fill={isAdded ? "white" : "none"} />
                  {isAdded ? "지망에서 빼기" : "지망 추가"}
                </button>
              </article>
            );
          })
        )}
      </div>

      <p className="explorer-basis-note">
        평균 점수와 인원은 대학마다 공개 기준이 다릅니다. 강원대·충남대·충북대의 평균은
        최초 합격자, 인원은 최종 등록자 기준이라 ‘등록 0명’인데 평균이 있는 줄이 있습니다.
        인원 칸 앞의 숫자는 그 줄이 몇 학년도 자료인지입니다.
      </p>

      {totalPages > 1 && (
        <div className="pagination-row">
          <button
            type="button"
            className="pagination-btn"
            disabled={currentPage === 1}
            onClick={() => changePage(currentPage - 1)}
          >
            <ChevronLeft className="pagination-icon" size={16} />
            이전
          </button>
          <span className="pagination-info">
            {currentPage} / {totalPages} 페이지 (총 {filteredDepartments.length}개 학과)
          </span>
          <button
            type="button"
            className="pagination-btn"
            disabled={currentPage === totalPages}
            onClick={() => changePage(currentPage + 1)}
          >
            다음
            <ChevronRight className="pagination-icon" size={16} />
          </button>
        </div>
      )}
    </section>
  );
}

export default memo(DepartmentExplorer);
