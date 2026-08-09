import { memo, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Compass,
  LayoutDashboard,
  SlidersHorizontal,
  Star,
  TableProperties,
} from "lucide-react";
import { calculateScore } from "../utils/converter";
import {
  countDecisionCategories,
  sortDecisionCandidates,
  type CandidateSort,
  type DecisionCandidate,
  type DecisionCategory,
} from "../utils/decisionSupport";
import { formatCompetitionRatio } from "../utils/competition";
import {
  getGpa100ForInput,
  getGpaMax,
  type GpaType,
} from "../utils/scoreInput";
import UniversityName from "./UniversityName";
import DataConfidenceBadge from "./DataConfidenceBadge";

type DecisionSupportTab = "recommend" | "strategy" | "scenario" | "compare";
type RecommendationCategory = "all" | Exclude<DecisionCategory, "unknown">;

type DecisionSupportPanelProps = {
  candidates: DecisionCandidate[];
  targetKeys: ReadonlySet<string>;
  toeic: number | null;
  gpaRaw: number | null;
  gpaType: GpaType;
  onToggleTarget: (univ: string, dept: string) => void;
};

const CATEGORY_META: Record<DecisionCategory, { label: string; shortLabel: string }> = {
  safe: { label: "평균 상회", shortLabel: "상회" },
  borderline: { label: "평균 근접", shortLabel: "근접" },
  risk: { label: "도전", shortLabel: "도전" },
  unknown: { label: "비교 불가", shortLabel: "자료 없음" },
};

const TAB_OPTIONS: { value: DecisionSupportTab; label: string; icon: typeof Compass }[] = [
  { value: "recommend", label: "맞춤 추천", icon: Compass },
  { value: "strategy", label: "전략 보드", icon: LayoutDashboard },
  { value: "scenario", label: "성적 시뮬레이션", icon: SlidersHorizontal },
  { value: "compare", label: "지망 비교표", icon: TableProperties },
];

const CATEGORY_OPTIONS: { value: RecommendationCategory; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "safe", label: "평균 상회" },
  { value: "borderline", label: "평균 근접" },
  { value: "risk", label: "도전" },
];

const SORT_OPTIONS: { value: CandidateSort; label: string }[] = [
  { value: "gap", label: "내 점수 차이순" },
  { value: "recruited", label: "모집인원 많은 순" },
  { value: "competition", label: "경쟁률 낮은 순" },
];

function formatDiff(diff: number | null): string {
  if (diff === null) return "비교 불가";
  return `${diff >= 0 ? "+" : ""}${diff.toFixed(2)}점`;
}

function formatNormalizedDiff(diff: number | null): string {
  if (diff === null) return "비교 불가";
  return `${diff >= 0 ? "+" : ""}${diff.toFixed(2)}%`;
}

function getStatusRank(status: DecisionCategory): number {
  if (status === "safe") return 3;
  if (status === "borderline") return 2;
  if (status === "risk") return 1;
  return 0;
}

function StrategySummary({ candidates }: { candidates: DecisionCandidate[] }) {
  const counts = countDecisionCategories(candidates);
  const knownCount = candidates.length - counts.unknown;
  const dominantEntry = (Object.entries(counts) as [DecisionCategory, number][])
    .filter(([status]) => status !== "unknown")
    .sort((left, right) => right[1] - left[1])[0];
  const isConcentrated = knownCount >= 3
    && dominantEntry !== undefined
    && dominantEntry[1] / knownCount >= 0.75;

  return (
    <div className="strategy-content">
      <div className="strategy-count-grid" aria-label="지망 판정 분포">
        {(Object.keys(CATEGORY_META) as DecisionCategory[]).map((status) => (
          <div className={`strategy-count strategy-count-${status}`} key={status}>
            <span>{CATEGORY_META[status].label}</span>
            <strong>{counts[status]}</strong>
          </div>
        ))}
      </div>

      {candidates.length === 0 ? (
        <p className="decision-empty">맞춤 추천이나 모집단위 탐색에서 지망을 먼저 추가해 주세요.</p>
      ) : (
        <div className="strategy-guidance">
          <h3>현재 구성 점검</h3>
          <ul>
            <li>
              판정 가능한 지망은 총 {knownCount}개이며, 과거 합격 평균 대비 위치만
              분류한 결과입니다.
            </li>
            {counts.safe === 0 && (
              <li>평균 상회 지망이 없습니다. 점수 차이순 추천에서 선택지를 넓혀 보세요.</li>
            )}
            {counts.borderline === 0 && knownCount > 0 && (
              <li>평균 근접 지망이 없습니다. 상회와 도전 사이의 선택지를 보완해 보세요.</li>
            )}
            {isConcentrated && dominantEntry !== undefined && (
              <li>
                지망의 75% 이상이 ‘{CATEGORY_META[dominantEntry[0]].label}’ 구간에 몰려
                있습니다. 다른 구간도 함께 검토해 보세요.
              </li>
            )}
            {counts.unknown > 0 && (
              <li>비교 불가 {counts.unknown}개는 성적 비공개 또는 계산 근거 부족으로 분류에서 제외됩니다.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function ScenarioSimulator({
  candidates,
  toeic,
  gpaRaw,
  gpaType,
}: {
  candidates: DecisionCandidate[];
  toeic: number | null;
  gpaRaw: number | null;
  gpaType: GpaType;
}) {
  const [toeicGain, setToeicGain] = useState(0);
  const [gpaGain, setGpaGain] = useState(0);

  useEffect(() => {
    setToeicGain(0);
    setGpaGain(0);
  }, [gpaRaw, gpaType, toeic]);

  const maxGpa = getGpaMax(gpaType);
  const projectedToeic = toeic === null ? null : Math.min(990, toeic + toeicGain);
  const projectedGpaRaw = gpaRaw === null ? null : Math.min(maxGpa, gpaRaw + gpaGain);
  const projectedGpa100 = projectedGpaRaw === null
    ? null
    : getGpa100ForInput(gpaType, projectedGpaRaw);
  const projectedCandidates = useMemo(() => candidates.map((candidate) => ({
    ...candidate,
    score: calculateScore(
      candidate.target.univ,
      candidate.referenceRecord.연도,
      projectedToeic,
      projectedGpa100,
      candidate.score.acceptedIndexSum === null ? null : candidate.referenceRecord,
      candidate.target.dept,
    ),
  })), [candidates, projectedGpa100, projectedToeic]);
  const currentCounts = countDecisionCategories(candidates);
  const projectedCounts = countDecisionCategories(projectedCandidates);
  const improvedCount = projectedCandidates.filter((candidate, index) => (
    getStatusRank(candidate.score.status) > getStatusRank(candidates[index]?.score.status ?? "unknown")
  )).length;
  const toeicMaxGain = toeic === null ? 0 : 990 - toeic;
  const gpaMaxGain = gpaRaw === null ? 0 : Math.max(0, maxGpa - gpaRaw);
  const gpaStep = gpaType === "100" ? 0.5 : 0.05;

  if (toeic === null || gpaRaw === null) {
    return <p className="decision-empty">유효한 TOEIC과 GPA를 입력하면 목표 성적 시뮬레이션을 사용할 수 있습니다.</p>;
  }

  return (
    <div className="scenario-content">
      <div className="scenario-controls">
        <label>
          <span>
            TOEIC 목표
            <span className="scenario-goal-value">
              {toeic} →
              <input
                type="number"
                aria-label="TOEIC 목표 점수"
                min={toeic}
                max="990"
                step="5"
                value={projectedToeic ?? toeic}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isFinite(value)) {
                    setToeicGain(Math.max(0, Math.min(990, value) - toeic));
                  }
                }}
              />
            </span>
          </span>
          <input
            type="range"
            min="0"
            max={toeicMaxGain}
            step="5"
            value={toeicGain}
            onChange={(event) => setToeicGain(Number(event.target.value))}
          />
          <small>현재보다 +{toeicGain}점</small>
        </label>
        <label>
          <span>
            GPA 목표
            <span className="scenario-goal-value">
              {gpaRaw} →
              <input
                type="number"
                aria-label={`GPA 목표 점수 (${gpaType} 기준)`}
                min={gpaRaw}
                max={maxGpa}
                step={gpaStep}
                value={projectedGpaRaw?.toFixed(2) ?? gpaRaw}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isFinite(value)) {
                    setGpaGain(Math.max(0, Math.min(maxGpa, value) - gpaRaw));
                  }
                }}
              />
            </span>
          </span>
          <input
            type="range"
            min="0"
            max={gpaMaxGain}
            step={gpaStep}
            value={gpaGain}
            onChange={(event) => setGpaGain(Number(event.target.value))}
          />
          <small>현재보다 +{gpaGain.toFixed(2)} ({gpaType} 기준)</small>
        </label>
      </div>

      <div className="scenario-impact" aria-live="polite">
        <div>
          <span>평균 상회</span>
          <strong>{currentCounts.safe} → {projectedCounts.safe}</strong>
        </div>
        <div>
          <span>평균 근접</span>
          <strong>{currentCounts.borderline} → {projectedCounts.borderline}</strong>
        </div>
        <div>
          <span>판정 개선</span>
          <strong>{improvedCount}개</strong>
        </div>
      </div>

      {candidates.length === 0 ? (
        <p className="decision-empty">지망을 추가하면 목표 점수 적용 전후를 비교할 수 있습니다.</p>
      ) : (
        <div className="scenario-result-list">
          {projectedCandidates.map((candidate, index) => {
            const current = candidates[index];
            if (current === undefined) return null;
            return (
              <div key={candidate.key}>
                <span>{candidate.target.univ.replace("대학교", "대")} · {candidate.target.dept}</span>
                <span className={`decision-status decision-status-${current.score.status}`}>
                  {CATEGORY_META[current.score.status].shortLabel}
                </span>
                <span aria-hidden="true">→</span>
                <span className={`decision-status decision-status-${candidate.score.status}`}>
                  {CATEGORY_META[candidate.score.status].shortLabel}
                </span>
                <strong>{formatDiff(candidate.score.diff)}</strong>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DecisionSupportPanel({
  candidates,
  targetKeys,
  toeic,
  gpaRaw,
  gpaType,
  onToggleTarget,
}: DecisionSupportPanelProps) {
  const [activeTab, setActiveTab] = useState<DecisionSupportTab>("recommend");
  const [category, setCategory] = useState<RecommendationCategory>("all");
  const [university, setUniversity] = useState("");
  const [sort, setSort] = useState<CandidateSort>("gap");
  const [visibleCount, setVisibleCount] = useState(8);
  const selectedCandidates = useMemo(
    () => candidates.filter((candidate) => targetKeys.has(candidate.key)),
    [candidates, targetKeys],
  );
  const universities = useMemo(
    () => [...new Set(candidates.map((candidate) => candidate.target.univ))].sort(),
    [candidates],
  );
  const recommended = useMemo(() => {
    const filtered = candidates.filter((candidate) => (
      candidate.score.diff !== null
      && (category === "all" || candidate.score.status === category)
      && (university === "" || candidate.target.univ === university)
    ));
    return sortDecisionCandidates(filtered, sort);
  }, [candidates, category, sort, university]);

  return (
    <section className="card decision-support-card" aria-labelledby="decision-support-title">
      <div className="decision-support-heading">
        <div>
          <h2 className="card-title" id="decision-support-title">
            <BarChart3 size={20} />
            지원 결정 도우미
          </h2>
          <p>과거 합격 평균과의 차이를 바탕으로 탐색·구성·목표 변화를 한곳에서 확인합니다.</p>
        </div>
        <span className="decision-support-disclaimer">합격 확률이 아닌 참고 분류</span>
      </div>

      <div className="decision-tabs" role="tablist" aria-label="지원 결정 도우미 기능">
        {TAB_OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === value}
            className={activeTab === value ? "active" : ""}
            key={value}
            onClick={() => setActiveTab(value)}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
            {value === "compare" && targetKeys.size > 0 && <strong>{targetKeys.size}</strong>}
          </button>
        ))}
      </div>

      <div className="decision-panel" role="tabpanel">
        {activeTab === "recommend" && (
          <div className="recommendation-content">
            <div className="recommendation-controls">
              <div className="recommendation-category" role="group" aria-label="추천 구간 필터">
                {CATEGORY_OPTIONS.map((option) => (
                  <button
                    type="button"
                    className={category === option.value ? "active" : ""}
                    aria-pressed={category === option.value}
                    key={option.value}
                    onClick={() => {
                      setCategory(option.value);
                      setVisibleCount(8);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <select
                aria-label="추천 대학 필터"
                value={university}
                onChange={(event) => {
                  setUniversity(event.target.value);
                  setVisibleCount(8);
                }}
              >
                <option value="">전체 대학</option>
                {universities.map((item) => <option key={item}>{item}</option>)}
              </select>
              <select
                aria-label="추천 정렬"
                value={sort}
                onChange={(event) => setSort(event.target.value as CandidateSort)}
              >
                {SORT_OPTIONS.map((option) => (
                  <option value={option.value} key={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {recommended.length === 0 ? (
              <p className="decision-empty">
                유효한 성적을 입력하거나 다른 대학·판정 구간을 선택해 주세요.
              </p>
            ) : (
              <>
                <p className="recommendation-result-count">조건에 맞는 모집단위 {recommended.length}개</p>
                <div className="recommendation-grid">
                  {recommended.slice(0, visibleCount).map((candidate) => {
                    const isSelected = targetKeys.has(candidate.key);
                    return (
                      <article className="recommendation-item" key={candidate.key}>
                        <div className="recommendation-item-heading">
                          <UniversityName university={candidate.target.univ} logoSize="small" />
                          <span className={`decision-status decision-status-${candidate.score.status}`}>
                            {CATEGORY_META[candidate.score.status].label}
                          </span>
                        </div>
                        <h3>{candidate.target.dept}</h3>
                        <dl>
                          <div title="대학별 환산 지표 만점 대비 합격 평균과의 격차 비율">
                            <dt>환산 만점 대비 격차</dt>
                            <dd>{formatNormalizedDiff(candidate.normalizedDiffPercent)}</dd>
                          </div>
                          <div><dt>모집인원</dt><dd>{candidate.referenceRecord.모집인원 ?? "-"}명</dd></div>
                          <div><dt>경쟁률</dt><dd>{formatCompetitionRatio(candidate.referenceRecord)}</dd></div>
                        </dl>
                        <div className="recommendation-item-footer">
                          <DataConfidenceBadge confidence={candidate.dataConfidence} compact />
                          <button
                            type="button"
                            className={`btn-add-cart ${isSelected ? "added" : ""}`}
                            onClick={() => onToggleTarget(candidate.target.univ, candidate.target.dept)}
                          >
                            <Star size={14} fill={isSelected ? "white" : "none"} />
                            {isSelected ? "지망 중" : "지망 추가"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
                {visibleCount < recommended.length && (
                  <button
                    type="button"
                    className="decision-more-button"
                    onClick={() => setVisibleCount((current) => current + 8)}
                  >
                    추천 더 보기
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "strategy" && <StrategySummary candidates={selectedCandidates} />}

        {activeTab === "scenario" && (
          <ScenarioSimulator
            candidates={selectedCandidates}
            toeic={toeic}
            gpaRaw={gpaRaw}
            gpaType={gpaType}
          />
        )}

        {activeTab === "compare" && (
          selectedCandidates.length === 0 ? (
            <p className="decision-empty">지망을 추가하면 핵심 지표를 한 표에서 비교할 수 있습니다.</p>
          ) : (
            <div className="decision-compare-wrapper">
              <table className="decision-compare-table">
                <thead>
                  <tr>
                    <th>대학·모집단위</th>
                    <th>판정</th>
                    <th>점수 차이</th>
                    <th>기준 연도</th>
                    <th>모집</th>
                    <th>경쟁률</th>
                    <th>비교 연도</th>
                    <th>데이터 근거</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCandidates.map((candidate) => (
                    <tr key={candidate.key}>
                      <th scope="row">
                        <UniversityName university={candidate.target.univ} logoSize="small" />
                        <span>{candidate.target.dept}</span>
                      </th>
                      <td>
                        <span className={`decision-status decision-status-${candidate.score.status}`}>
                          {CATEGORY_META[candidate.score.status].shortLabel}
                        </span>
                      </td>
                      <td className="decision-compare-diff">{formatDiff(candidate.score.diff)}</td>
                      <td>{candidate.referenceRecord.연도}</td>
                      <td>{candidate.referenceRecord.모집인원 ?? "-"}명</td>
                      <td>{formatCompetitionRatio(candidate.referenceRecord)}</td>
                      <td>{candidate.comparableYearCount}개년</td>
                      <td><DataConfidenceBadge confidence={candidate.dataConfidence} compact /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </section>
  );
}

export default memo(DecisionSupportPanel);
