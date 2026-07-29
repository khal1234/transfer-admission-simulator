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
} from "../utils/departmentSearch";
import { getRecordKey } from "../utils/targets";

const ITEMS_PER_PAGE = 10;

type DepartmentExplorerProps = {
  records: DepartmentRecord[];
  targetKeys: ReadonlySet<string>;
  onToggleTarget: (univ: string, dept: string) => void;
};

function DepartmentExplorer({
  records,
  targetKeys,
  onToggleTarget,
}: DepartmentExplorerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUnivs, setSelectedUnivs] = useState<string[]>([]);
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
  const filteredDepartments = useMemo(
    () => filterDepartmentSearchIndex(
      searchableRecords,
      searchQuery,
      selectedUnivSet,
    ),
    [searchQuery, searchableRecords, selectedUnivSet],
  );

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
        거점국립대 모집단위 탐색 및 지망 담기
      </h2>

      <div className="explorer-filters">
        <div className="search-input-box">
          <Search size={20} color="var(--text-muted)" />
          <input
            type="text"
            aria-label="학과 검색"
            placeholder="가고 싶은 학과명이나 초성을 검색해 보세요 (예: 기계, 컴공, ㅅㅁ, ㄱㄱㄱㅎㄱ)"
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

        <div className="univ-chips-grid">
          <button
            type="button"
            className={`univ-chip ${selectedUnivs.length === 0 ? "active" : ""}`}
            onClick={() => {
              setSelectedUnivs([]);
              setCurrentPage(1);
            }}
          >
            전체 대학
          </button>
          {universities.map((university) => (
            <button
              type="button"
              key={university}
              className={`univ-chip ${selectedUnivSet.has(university) ? "active" : ""}`}
              onClick={() => toggleUniversity(university)}
            >
              {university}
            </button>
          ))}
        </div>
      </div>

      <p
        className="explorer-result-count"
        aria-live="polite"
        ref={resultsStartRef}
      >
        검색 결과 {filteredDepartments.length}개
      </p>

      <div className="table-wrapper desktop-department-results">
        <table className="master-table">
          <thead>
            <tr>
              <th className="explorer-university-column">대학명</th>
              <th className="explorer-department-column">학과명 (통합 표준과명)</th>
              <th className="explorer-count-column table-cell-center">최신 모집인원</th>
              <th className="explorer-score-column table-cell-center">토익합격 평균</th>
              <th className="explorer-score-column table-cell-center">GPA합격 백분위</th>
              <th className="explorer-cart-column table-cell-center">장바구니</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="explorer-empty">
                  검색 결과와 일치하는 모집단위가 존재하지 않습니다. 다른 검색어를 입력해 보세요.
                </td>
              </tr>
            ) : (
              paginatedRecords.map((record) => {
                const key = getRecordKey(record.대학명, record.학과);
                const isAdded = targetKeys.has(key);

                return (
                  <tr key={key}>
                    <td className="university-name-cell">
                      {record.대학명}
                    </td>
                    <td>
                      <div className="dept-name-wrapper">
                        <h4>{record.학과}</h4>
                        {record.학과 !== record.학과_원본명 && (
                          <span>이전 명칭: {record.학과_원본명}</span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell-center table-cell-semibold">
                      {record.모집인원 !== null ? `${record.모집인원}명` : "-"}
                    </td>
                    <td className="table-cell-center table-cell-bold">
                      {record.최종합격_토익원점수 !== null
                        ? `${record.최종합격_토익원점수}점`
                        : "비공개"}
                    </td>
                    <td className="table-cell-center table-cell-bold">
                      {record.최종합격_학점원점수_100점만점 !== null
                        ? `${record.최종합격_학점원점수_100점만점}점`
                        : "비공개"}
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
            검색 결과와 일치하는 모집단위가 없습니다. 다른 검색어를 입력해 보세요.
          </p>
        ) : (
          paginatedRecords.map((record) => {
            const key = getRecordKey(record.대학명, record.학과);
            const isAdded = targetKeys.has(key);

            return (
              <article className="department-result-card" key={key}>
                <div className="department-result-heading">
                  <span className="department-university">{record.대학명}</span>
                  <span className="department-count">
                    {record.모집인원 !== null ? `${record.모집인원}명 모집` : "인원 비공개"}
                  </span>
                </div>
                <div className="dept-name-wrapper">
                  <h3>{record.학과}</h3>
                  {record.학과 !== record.학과_원본명 && (
                    <span>이전 명칭: {record.학과_원본명}</span>
                  )}
                </div>
                <dl className="department-metrics">
                  <div>
                    <dt>TOEIC 합격 평균</dt>
                    <dd>
                      {record.최종합격_토익원점수 !== null
                        ? `${record.최종합격_토익원점수}점`
                        : "비공개"}
                    </dd>
                  </div>
                  <div>
                    <dt>GPA 합격 평균</dt>
                    <dd>
                      {record.최종합격_학점원점수_100점만점 !== null
                        ? `${record.최종합격_학점원점수_100점만점}점`
                        : "비공개"}
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
