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
import { checkEligibility } from "../utils/eligibility";
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
  risk: { shortLabel: "미달" },
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

function getStatusRank(status: DecisionCategory, ineligible = false): number {
  if (ineligible) return 0;
  if (status === "safe") return 3;
  if (status === "borderline") return 2;
  if (status === "risk") return 1;
  return 0;
}

function isIneligible(
  candidate: DecisionCandidate,
  toeic: number | null,
  gpa100: number | null,
): boolean {
  return checkEligibility(
    candidate.target.univ,
    candidate.target.dept,
    toeic,
    gpa100,
  ).failures.length > 0;
}

function StatusChip({
  status,
  ineligible,
}: {
  status: DecisionCategory;
  ineligible: boolean;
}) {
  if (ineligible) {
    return <span className="decision-status decision-status-ineligible">자격 미달</span>;
  }

  return (
    <span className={`decision-status decision-status-${status}`}>
      {CATEGORY_META[status].shortLabel}
    </span>
  );
}

/**
 * 목표 점수 숫자 칸.
 *
 * 예전에는 한 글자 칠 때마다 범위로 눌러서 「950」을 칠 수가 없었다 — 「9」는
 * 현재 점수보다 낮아 무시되고 「5」에서 8505 로 읽혀 990 이 됐다(2026-11-14
 * 검토 10번). 치는 동안에는 손대지 않고, 범위 안의 값이 되면 바로 반영하며,
 * 칸을 벗어날 때 한 번만 범위와 단위에 맞춘다.
 */
function GoalNumberInput({
  ariaLabel,
  value,
  min,
  max,
  step,
  snap,
  onCommit,
}: {
  ariaLabel: string;
  value: string;
  min: number;
  max: number;
  step: number;
  snap: (value: number) => number;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const parse = (text: string): number | null => {
    const parsed = Number(text);
    return text.trim() === "" || !Number.isFinite(parsed) ? null : parsed;
  };

  return (
    <input
      type="number"
      inputMode="decimal"
      aria-label={ariaLabel}
      min={min}
      max={max}
      step={step}
      value={draft ?? value}
      onFocus={(event) => {
        setDraft(event.currentTarget.value);
        event.currentTarget.select();
      }}
      onChange={(event) => {
        const text = event.target.value;
        const parsed = parse(text);
        setDraft(text);
        if (parsed !== null && parsed >= min && parsed <= max) {
          onCommit(parsed);
        }
      }}
      onBlur={() => {
        const parsed = draft === null ? null : parse(draft);
        if (parsed !== null) {
          onCommit(snap(Math.max(min, Math.min(max, parsed))));
        }
        setDraft(null);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
    />
  );
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
  const currentGpa100 = gpaRaw === null ? null : getGpa100ForInput(gpaType, gpaRaw);
  const currentIneligible = candidates.map((candidate) => (
    isIneligible(candidate, toeic, currentGpa100)
  ));
  const projectedIneligible = candidates.map((candidate) => (
    isIneligible(candidate, projectedToeic, projectedGpa100)
  ));
  const currentCounts = countDecisionCategories(
    candidates.filter((_, index) => !currentIneligible[index]),
  );
  const projectedCounts = countDecisionCategories(
    projectedCandidates.filter((_, index) => !projectedIneligible[index]),
  );
  const improvedCount = projectedCandidates.filter((candidate, index) => (
    getStatusRank(candidate.score.status, projectedIneligible[index])
      > getStatusRank(
        candidates[index]?.score.status ?? "unknown",
        currentIneligible[index],
      )
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
              <GoalNumberInput
                ariaLabel="TOEIC 목표 점수"
                min={toeic}
                max={990}
                step={5}
                value={String(projectedToeic ?? toeic)}
                snap={(value) => Math.max(toeic, Math.min(990, Math.round(value / 5) * 5))}
                onCommit={(value) => setToeicGain(Math.max(0, value - toeic))}
              />
            </span>
          </span>
          <input
            type="range"
            min="0"
            max={toeicMaxGain}
            step="5"
            aria-label="TOEIC 목표 점수 슬라이더"
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
              <GoalNumberInput
                ariaLabel={`GPA 목표 점수 (${gpaType} 기준)`}
                min={gpaRaw}
                max={maxGpa}
                step={gpaStep}
                value={projectedGpaRaw?.toFixed(2) ?? String(gpaRaw)}
                snap={(value) => Math.round(value * 100) / 100}
                onCommit={(value) => setGpaGain(
                  Math.max(0, Math.round((value - gpaRaw) * 100) / 100),
                )}
              />
            </span>
          </span>
          <input
            type="range"
            min="0"
            max={gpaMaxGain}
            step={gpaStep}
            aria-label="GPA 목표 점수 슬라이더"
            value={Math.min(gpaGain, gpaMaxGain)}
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
                <StatusChip
                  status={current.score.status}
                  ineligible={currentIneligible[index] ?? false}
                />
                <span aria-hidden="true">→</span>
                <StatusChip
                  status={candidate.score.status}
                  ineligible={projectedIneligible[index] ?? false}
                />
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
                      <StatusChip
                        status={candidate.score.status}
                        ineligible={isIneligible(
                          candidate,
                          toeic,
                          gpaRaw === null ? null : getGpa100ForInput(gpaType, gpaRaw),
                        )}
                      />
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
