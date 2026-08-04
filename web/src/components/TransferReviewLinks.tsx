import { memo, useMemo, useState } from "react";
import { BookOpenCheck, ChevronDown, ExternalLink, Search, X } from "lucide-react";
import {
  getReviewKind,
  REVIEW_UNIVERSITIES,
  TRANSFER_REVIEWS,
  type TransferReview,
} from "../data/transferReviews";
import UniversityName from "./UniversityName";

const ALL_FILTER = "전체";
const COMPARISON_FILTER = "복수 대학 비교";

function getGroupTitle(review: TransferReview, selectedFilter: string) {
  if (selectedFilter !== ALL_FILTER) {
    return review.departmentGroup;
  }

  const university = review.comparison
    ? COMPARISON_FILTER
    : (review.universities[0] ?? "학교 미상");

  return `${university} · ${review.departmentGroup}`;
}

function getShortUniversityName(university: string) {
  if (university === "울산과학기술원(UNIST)") {
    return "UNIST";
  }

  return university.replace("대학교", "대");
}

function TransferReviewLinks() {
  const [selectedFilter, setSelectedFilter] = useState(ALL_FILTER);
  const [searchQuery, setSearchQuery] = useState("");

  const filterOptions = useMemo(() => [
    {
      id: ALL_FILTER,
      label: "전체 후기",
      count: TRANSFER_REVIEWS.length,
    },
    ...REVIEW_UNIVERSITIES.map((university) => ({
      id: university,
      label: getShortUniversityName(university),
      count: TRANSFER_REVIEWS.filter((review) => (
        review.universities.includes(university)
      )).length,
    })),
    {
      id: COMPARISON_FILTER,
      label: COMPARISON_FILTER,
      count: TRANSFER_REVIEWS.filter((review) => review.comparison).length,
    },
  ], []);

  const filteredReviews = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase("ko-KR");

    return TRANSFER_REVIEWS.filter((review) => {
      const matchesFilter = selectedFilter === ALL_FILTER
        || (selectedFilter === COMPARISON_FILTER && review.comparison)
        || review.universities.includes(selectedFilter);

      if (!matchesFilter || normalizedQuery === "") {
        return matchesFilter;
      }

      const searchableText = [
        review.title,
        review.departmentGroup,
        ...review.universities,
      ].join(" ").toLocaleLowerCase("ko-KR");

      return searchableText.includes(normalizedQuery);
    });
  }, [searchQuery, selectedFilter]);

  const reviewGroups = useMemo(() => {
    const groups = new Map<string, TransferReview[]>();

    for (const review of filteredReviews) {
      const title = getGroupTitle(review, selectedFilter);
      const group = groups.get(title) ?? [];
      group.push(review);
      groups.set(title, group);
    }

    return Array.from(groups.entries());
  }, [filteredReviews, selectedFilter]);

  return (
    <section className="card transfer-reviews-card" aria-labelledby="transfer-review-title">
      <details className="transfer-reviews-disclosure">
        <summary className="transfer-reviews-summary">
          <span className="transfer-reviews-heading-copy">
            <span
              className="card-title"
              id="transfer-review-title"
              role="heading"
              aria-level={2}
            >
              <BookOpenCheck size={20} color="var(--secondary-color)" aria-hidden="true" />
              실전 편입·면접 후기
            </span>
            <span className="transfer-reviews-description">
              실제 전공 공부법·시험 복원·면접 질문이 있는 글만 선별했습니다.
              펼치면 후기 검색과 원문 링크를 확인할 수 있습니다.
            </span>
          </span>
          <span className="transfer-reviews-summary-meta">
            <strong className="transfer-reviews-total">
              검증된 원문 {TRANSFER_REVIEWS.length}개
            </strong>
            <ChevronDown
              className="transfer-reviews-chevron"
              size={20}
              aria-hidden="true"
            />
          </span>
        </summary>

        <div className="transfer-reviews-content">
          <div className="transfer-review-controls">
            <div className="transfer-review-tabs" role="group" aria-label="후기 대학 필터">
              {filterOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selectedFilter === option.id}
                  className={`transfer-review-tab ${selectedFilter === option.id ? "active" : ""}`}
                  onClick={() => setSelectedFilter(option.id)}
                >
                  {REVIEW_UNIVERSITIES.includes(option.id as typeof REVIEW_UNIVERSITIES[number]) ? (
                    <UniversityName university={option.id} logoSize="small" />
                  ) : (
                    <span>{option.label}</span>
                  )}
                  <span className="transfer-review-tab-count">{option.count}</span>
                </button>
              ))}
            </div>

            <label className="transfer-review-search">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">후기 검색</span>
              <input
                type="search"
                value={searchQuery}
                placeholder="학과·과목·면접 내용 검색"
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              {searchQuery !== "" && (
                <button
                  type="button"
                  aria-label="후기 검색어 지우기"
                  onClick={() => setSearchQuery("")}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </label>
          </div>

          <p className="transfer-review-result-count" aria-live="polite">
            {filterOptions.find((option) => option.id === selectedFilter)?.label} · 원문 {filteredReviews.length}개
          </p>

          {reviewGroups.length === 0 ? (
            <div className="transfer-review-empty">
              일치하는 후기가 없습니다. 다른 학과명이나 전공 키워드로 검색해 보세요.
            </div>
          ) : (
            <div className="transfer-review-groups">
              {reviewGroups.map(([groupTitle, reviews]) => (
                <section className="transfer-review-group" key={groupTitle}>
                  <div className="transfer-review-group-heading">
                    <h3>{groupTitle}</h3>
                    <span>{reviews.length}개</span>
                  </div>
                  <div className="transfer-review-links">
                    {reviews.map((review) => (
                      <a
                        className="transfer-review-link"
                        href={review.url}
                        target="_blank"
                        rel="noreferrer"
                        key={review.id}
                        aria-label={`${review.title} 원문 새 탭에서 열기`}
                      >
                        <span className="transfer-review-link-content">
                          <span className="transfer-review-badges">
                            <span className="transfer-review-kind">{getReviewKind(review.title)}</span>
                            {review.comparison && (
                              <span className="transfer-review-comparison">여러 학교 비교</span>
                            )}
                          </span>
                          <strong>{review.title}</strong>
                          <span className="transfer-review-meta">
                            {review.publishedAt} · 글번호 {review.id}
                            {review.comparison && review.universities.length > 0
                              ? ` · ${review.universities.map(getShortUniversityName).join(" · ")}`
                              : ""}
                          </span>
                        </span>
                        <ExternalLink size={17} aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          <p className="transfer-review-source-note">
            디시인사이드 국립대 편입갤러리 공개 글을 본문·댓글 기준으로 선별한 비공식 자료입니다.
            연도별 전형과 질문은 달라질 수 있습니다.
          </p>
        </div>
      </details>
    </section>
  );
}

export default memo(TransferReviewLinks);
