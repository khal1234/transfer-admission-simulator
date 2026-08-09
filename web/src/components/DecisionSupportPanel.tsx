import { memo, useEffect, useMemo, useState } from "react";
import { BarChart3, SlidersHorizontal, TableProperties } from "lucide-react";
import { calculateScore } from "../utils/converter";
import {
  countDecisionCategories,
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

type DecisionSupportTab = "scenario" | "compare";

type DecisionSupportPanelProps = {
  candidates: DecisionCandidate[];
  toeic: number | null;
  gpaRaw: number | null;
  gpaType: GpaType;
};

const CATEGORY_META: Record<DecisionCategory, { shortLabel: string }> = {
  safe: { shortLabel: "상회" },
  borderline: { shortLabel: "근접" },
  risk: { shortLabel: "도전" },
  unknown: { shortLabel: "자료 없음" },
};

const TAB_OPTIONS: {
  value: DecisionSupportTab;
  label: string;
  icon: typeof SlidersHorizontal;
}[] = [
  { value: "scenario", label: "성적 시뮬레이션", icon: SlidersHorizontal },
  { value: "compare", label: "지망 비교표", icon: TableProperties },
];

function formatDiff(diff: number | null): string {
  if (diff === null) return "비교 불가";
  return `${diff >= 0 ? "+" : ""}${diff.toFixed(2)}점`;
}

function getStatusRank(status: DecisionCategory): number {
  if (status === "safe") return 3;
  if (status === "borderline") return 2;
  if (status === "risk") return 1;
  return 0;
}

function ScenarioSimulator({
  candidates,
  toeic,
  gpaRaw,
  gpaType,
}: DecisionSupportPanelProps) {
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
    getStatusRank(candidate.score.status)
      > getStatusRank(candidates[index]?.score.status ?? "unknown")
  )).length;
  const toeicMaxGain = toeic === null ? 0 : 990 - toeic;
  const gpaMaxGain = gpaRaw === null ? 0 : Math.max(0, maxGpa - gpaRaw);
  const gpaStep = gpaType === "100" ? 0.5 : 0.05;

  if (toeic === null || gpaRaw === null) {
    return (
      <p className="decision-empty">
        유효한 TOEIC과 GPA를 입력하면 목표 성적 시뮬레이션을 사용할 수 있습니다.
      </p>
    );
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
        <p className="decision-empty">
          지망을 추가하면 목표 점수 적용 전후를 비교할 수 있습니다.
        </p>
      ) : (
        <div className="scenario-result-list">
          {projectedCandidates.map((candidate, index) => {
            const current = candidates[index];
            if (current === undefined) return null;
            return (
              <div key={candidate.key}>
                <span>
                  {candidate.target.univ.replace("대학교", "대")} · {candidate.target.dept}
                </span>
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
  toeic,
  gpaRaw,
  gpaType,
}: DecisionSupportPanelProps) {
  const [activeTab, setActiveTab] = useState<DecisionSupportTab>("scenario");

  return (
    <section className="card decision-support-card" aria-labelledby="decision-support-title">
      <div className="decision-support-heading">
        <div>
          <h2 className="card-title" id="decision-support-title">
            <BarChart3 size={20} />
            지망 분석 도구
          </h2>
          <p>담아 둔 지망의 목표 성적 변화와 핵심 지표를 비교합니다.</p>
        </div>
        <span className="decision-support-disclaimer">합격 확률이 아닌 참고 분석</span>
      </div>

      <div className="decision-tabs" role="tablist" aria-label="지망 분석 기능">
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
            {value === "compare" && candidates.length > 0 && (
              <strong>{candidates.length}</strong>
            )}
          </button>
        ))}
      </div>

      <div className="decision-panel" role="tabpanel">
        {activeTab === "scenario" ? (
          <ScenarioSimulator
            candidates={candidates}
            toeic={toeic}
            gpaRaw={gpaRaw}
            gpaType={gpaType}
          />
        ) : candidates.length === 0 ? (
          <p className="decision-empty">
            지망을 추가하면 핵심 지표를 한 표에서 비교할 수 있습니다.
          </p>
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
                {candidates.map((candidate) => (
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
                    <td>
                      <DataConfidenceBadge
                        align="end"
                        confidence={candidate.dataConfidence}
                        compact
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export default memo(DecisionSupportPanel);
