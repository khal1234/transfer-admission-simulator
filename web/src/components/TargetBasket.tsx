import { memo } from "react";
import {
  BookOpen,
  ChevronDown,
  HelpCircle,
  Star,
  Trash2,
  TrendingUp,
} from "lucide-react";
import type {
  analyzeScoreDeficit,
  calculateScore,
  DepartmentRecord,
} from "../utils/converter";
import { getGpaMax, type GpaType } from "../utils/scoreInput";
import {
  explainAcceptedScore,
  explainMyScore,
  getFormulaBasis,
} from "../utils/scoreExplanation";
import {
  getGpaDisclosure,
  getToeicDisclosure,
} from "../utils/scoreProvenance";
import type { Target } from "../utils/targets";
import RawScoreValue from "./RawScoreValue";
import ScoreBasis from "./ScoreBasis";
import UniversityName from "./UniversityName";

type RecentHistoryRow = {
  year: string;
  record: DepartmentRecord | null;
  exclusionReason: string | null;
  exceptionLookupStatus: "loading" | "ready" | "error";
};

export type TargetSummary = {
  key: string;
  target: Target;
  referenceRecord: DepartmentRecord;
  score: ReturnType<typeof calculateScore>;
  deficit: number | null;
  analysis: ReturnType<typeof analyzeScoreDeficit> | null;
  comparisonYearNotice: string | null;
  formulaNotice: string | null;
  renamedHistoryText: string;
  recentHistoryRows: RecentHistoryRow[];
};

type TargetBasketProps = {
  summaries: TargetSummary[];
  targetCount: number;
  toeic: number | null;
  gpaRaw: number | null;
  gpaType: GpaType;
  onToggleTarget: (univ: string, dept: string) => void;
  onSelectChart: (univ: string, dept: string) => void;
};

function getCompetitionRatio(record: DepartmentRecord): number | null {
  if (!record.모집인원 || !record.지원인원 || record.모집인원 <= 0) {
    return null;
  }

  return Math.round((record.지원인원 / record.모집인원) * 100) / 100;
}

function formatCompetitionRatio(record: DepartmentRecord): string {
  const ratio = getCompetitionRatio(record);
  return ratio === null ? "-" : `${Math.round(ratio * 10) / 10}:1`;
}

function getAnalysisPanelState(
  comparisonUnavailable: boolean,
  needsImprovement: boolean,
): "unavailable" | "risk" | "safe" {
  if (comparisonUnavailable) {
    return "unavailable";
  }

  return needsImprovement ? "risk" : "safe";
}

function TargetBasket({
  summaries,
  targetCount,
  toeic,
  gpaRaw,
  gpaType,
  onToggleTarget,
  onSelectChart,
}: TargetBasketProps) {
  const scoreInputInvalid = toeic === null || gpaRaw === null;

  return (
    <div className="card basket-card" id="target-basket">
      <h2 className="card-title">
        <Star
          size={20}
          color="var(--status-borderline)"
          fill="var(--status-borderline)"
        />
        내 지망 대학 장바구니 (동시 환산 비교)
      </h2>

      {targetCount === 0 ? (
        <div className="basket-empty">
          <BookOpen size={40} color="var(--text-muted)" />
          <p>현재 담겨 있는 지망 대학이 없습니다.</p>
          <span className="basket-empty-description">
            <strong>모집단위 탐색</strong>에서 관심 있는 학과의
            ‘지망 추가’ 버튼을 눌러보세요.
          </span>
        </div>
      ) : (
        <div className="basket-grid">
          {summaries.map(({
            key,
            target,
            referenceRecord,
            score,
            deficit,
            analysis,
            comparisonYearNotice,
            formulaNotice,
            renamedHistoryText,
            recentHistoryRows,
          }) => {
            const comparisonUnavailable = deficit === null || analysis === null;
            const needsImprovement = !comparisonUnavailable && deficit > 0;
            const analysisPanelState = getAnalysisPanelState(
              comparisonUnavailable,
              needsImprovement,
            );

            // 결과 숫자만으로는 무엇을 근거로 나온 값인지 알 수 없다.
            // 특히 합격선은 대학 공개값과 우리가 환산한 값이 섞여 있다.
            const myScoreBasis = explainMyScore(
              target.univ,
              referenceRecord.연도,
              toeic,
              gpaType,
              gpaRaw,
            );
            const acceptedScoreBasis = explainAcceptedScore(referenceRecord);
            const formulaBasis = getFormulaBasis(
              target.univ,
              referenceRecord.연도,
            );

            return (
              <div className="target-card" key={key}>
                <div className="target-card-header">
                  <div className="target-card-meta">
                    <h3>{target.dept}</h3>
                    <p>
                      <UniversityName university={target.univ} logoSize="small" />
                    </p>
                    {(referenceRecord.합격자기준 === "최초"
                      || referenceRecord.합격자기준 === "최종") && (
                      <span
                        className="acceptance-basis"
                        title="이 대학이 공개하는 합격자 평균 성적이 최초합격자 기준인지 최종등록자 기준인지를 나타냅니다"
                      >
                        [{referenceRecord.합격자기준}합격자 기준]
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn-remove-target"
                    aria-label={`${target.univ} ${target.dept} 지망 삭제`}
                    onClick={() => onToggleTarget(target.univ, target.dept)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="target-card-body">
                  <div className="compare-container">
                    {/* 접힌 상태에서 한 줄로 읽히게 묶는다. 예전에는 라벨-내
                        지표합-합격선-차이가 각각 한 줄씩 차지해 카드 하나가
                        419px 였고, 지망 여럿을 동시에 볼 수가 없었다. */}
                    <div className="compare-summary">
                      {score.status === "safe" && (
                        <span className="status-badge status-safe">🟢 상회</span>
                      )}
                      {score.status === "borderline" && (
                        <span className="status-badge status-borderline">🟡 근접</span>
                      )}
                      {score.status === "risk" && (
                        <span className="status-badge status-risk">🔴 미달</span>
                      )}
                      {score.status === "unknown" && (
                        <span className="status-badge status-unknown">
                          {scoreInputInvalid ? "⚪ 입력 확인" : "⚪ 자료 부족"}
                        </span>
                      )}

                      <span className="compare-scores">
                        <span
                          className="compare-score compare-score-primary"
                          title="지표합 = 공인영어 환산점수 + 전적대 환산점수. 대학마다 배점이 달라 절대값 비교는 의미 없으며, 같은 대학 내 합격선과의 격차만 참고하세요"
                        >
                          {score.myIndexSum !== null
                            ? score.myIndexSum
                            : scoreInputInvalid
                              ? "입력 확인 필요"
                              : "계산 불가"}
                          <HelpCircle size={12} className="compare-help" />
                        </span>
                        <span className="compare-versus">vs</span>
                        <span className="compare-score compare-score-secondary">
                          {score.acceptedIndexSum !== null
                            ? score.acceptedIndexSum
                            : "비공개"}
                        </span>
                        <span className="compare-accepted-label">
                          {referenceRecord.연도} 합격선
                        </span>
                      </span>

                      {score.diff !== null && (
                        <span className={`score-diff ${score.diff >= 0 ? "positive" : "negative"}`}>
                          {score.diff >= 0 ? `+${score.diff}` : score.diff}점
                        </span>
                      )}
                    </div>

                    {comparisonYearNotice !== null && (
                      <p className="comparison-notice">{comparisonYearNotice}</p>
                    )}
                    {formulaNotice !== null && (
                      <p className="formula-notice">⚠️ {formulaNotice}</p>
                    )}

                    {score.myIndexSum !== null
                      && score.acceptedIndexSum !== null && (
                        <div className="compare-progress-track compare-progress-spaced">
                          <div
                            className="compare-progress-fill"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  10,
                                  (score.myIndexSum / (score.acceptedIndexSum * 1.15)) * 100,
                                ),
                              )}%`,
                              backgroundColor: score.status === "safe"
                                ? "var(--status-safe)"
                                : score.status === "borderline"
                                  ? "var(--status-borderline)"
                                  : "var(--status-risk)",
                            }}
                          />
                        </div>
                      )}
                  </div>

                  <ScoreBasis
                    mine={myScoreBasis}
                    accepted={acceptedScoreBasis}
                    formulaBasis={formulaBasis}
                  />

                  <details className="target-details">
                    <summary className="target-details-summary">
                      <span className="details-closed-label">상세 분석 보기</span>
                      <span className="details-open-label">상세 분석 접기</span>
                      <ChevronDown size={18} />
                    </summary>
                    <div className="target-details-content">
                      {renamedHistoryText !== "" && (
                        <div className="renamed-history">
                          <span className="renamed-history-label">
                            📍 구 명칭 변천사:
                          </span>
                          <span>{renamedHistoryText}</span>
                        </div>
                      )}

                      <div className={`analysis-panel analysis-panel-${analysisPanelState}`}>
                        <h4>📊 {referenceRecord.연도} 평균 대조 및 역산 분석</h4>

                    {scoreInputInvalid ? (
                      <p className="analysis-unavailable-message">
                        유효한 TOEIC과 GPA를 입력하면 합격 평균 대조 및 역산 분석을 확인할 수
                        있습니다.
                      </p>
                    ) : comparisonUnavailable ? (
                      <p className="analysis-unavailable-message">
                        비교 가능한 합격 평균 성적이 없어 대조 및 역산 분석을 제공할 수 없습니다.
                      </p>
                    ) : deficit > 0 ? (
                      <div className="analysis-scenario">
                        <p className="analysis-scenario-intro">
                          {referenceRecord.연도} 평균선 도달(격차:{" "}
                          <strong>{deficit.toFixed(2)}점</strong>)을 위한 가상 보완 시나리오:
                        </p>
                        {analysis.isLookupBased ? (
                          <p className="lookup-warning">
                            ⚠️ 이 대학은 구간 등급제 환산표를 사용하므로 산식으로 정확한 역산이
                            불가능합니다. 홈페이지의 모집요강 환산표를 참고해 주세요.
                          </p>
                        ) : (
                          <ul className="improvement-list">
                            {analysis.toeicNeeded !== null && (
                              <li>
                                • <strong>TOEIC만</strong> 올릴 시:{" "}
                                <strong className="analysis-target">
                                  +{analysis.toeicNeeded}점
                                </strong>{" "}
                                {toeic === null
                                  ? "(현재 TOEIC 입력 확인 필요)"
                                  : toeic + analysis.toeicNeeded > 990
                                    ? "(만점 초과로 불가)"
                                    : `(목표: ${toeic + analysis.toeicNeeded}점)`}
                              </li>
                            )}
                            {analysis.gpaNeeded !== null && (
                              <li>
                                • <strong>GPA만</strong> 올릴 시:{" "}
                                <strong className="analysis-target">
                                  +{analysis.gpaNeeded}점
                                </strong>{" "}
                                {gpaRaw === null
                                  ? "(현재 GPA 입력 확인 필요)"
                                  : gpaRaw + analysis.gpaNeeded > getGpaMax(gpaType)
                                    ? "(만점 초과로 불가)"
                                    : `(목표: ${(gpaRaw + analysis.gpaNeeded).toFixed(2)}점)`}
                              </li>
                            )}
                          </ul>
                        )}
                      </div>
                    ) : (
                      <p className="analysis-success-message">
                        🎉 {referenceRecord.연도} 합격자 평균 성적을 상회하고 있습니다. (단,
                        실제 합격 여부는 면접 및 대학별 고사가 주요 변수로 작용합니다.)
                      </p>
                    )}

                    {analysis !== null && (
                      <div className="efficiency-section">
                        <div className="efficiency-row">
                          <span>• TOEIC 10점 상승 시:</span>
                          <strong>+{analysis.toeicEfficiency}점</strong>
                        </div>
                        <div className="efficiency-row efficiency-row-last">
                          <span>• GPA 0.1점 상승 시:</span>
                          <strong>+{analysis.gpaEfficiency}점</strong>
                        </div>
                        {analysis.recommendedMetric !== "none" && (
                          <p className="efficiency-recommendation">
                            💡 수식상 획득 효율: 이 대학은{" "}
                            <strong>
                              [{analysis.recommendedMetric === "toeic"
                                ? "공인영어"
                                : "전적대학 성적"}]
                            </strong>
                            을 올릴 때 환산점수가 상대적으로 더 많이 상승합니다.{" "}
                            <span>(실제 공부 난이도 무관)</span>
                          </p>
                        )}
                      </div>
                    )}
                      </div>

                      <div className="target-history-scroll">
                        <table className="mini-table">
                          <thead>
                            <tr>
                              <th>연도</th>
                              <th>모집</th>
                              <th>지원</th>
                              <th>경쟁률</th>
                              <th>TOEIC 평균</th>
                              <th>GPA 평균</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentHistoryRows.map(({
                              year,
                              record,
                              exclusionReason,
                              exceptionLookupStatus,
                            }) => {
                              if (record === null) {
                                const unavailableLabel = exceptionLookupStatus === "loading"
                                  ? "예외 이력 확인 중"
                                  : exceptionLookupStatus === "error"
                                    ? "이력 확인 불가"
                                    : exclusionReason === null
                                      ? "미선발"
                                      : "별도 전형 · 비교 제외";

                                return (
                                  <tr key={year}>
                                    <td>{year}년</td>
                                    <td
                                      colSpan={5}
                                      className="history-unavailable"
                                      title={exclusionReason ?? undefined}
                                    >
                                      {unavailableLabel}
                                    </td>
                                  </tr>
                                );
                              }

                              return (
                                <tr key={record.연도}>
                                  <td>{record.연도}년</td>
                                  <td>{record.모집인원 ?? "-"}</td>
                                  <td>{record.지원인원 ?? "-"}</td>
                                  <td>{formatCompetitionRatio(record)}</td>
                                  <td>
                                    <RawScoreValue
                                      value={record.최종합격_토익원점수}
                                      note={getToeicDisclosure(record.대학명)}
                                      suffix=""
                                    />
                                  </td>
                                  <td>
                                    <RawScoreValue
                                      value={record.최종합격_학점원점수_100점만점}
                                      note={getGpaDisclosure(record.대학명)}
                                      suffix=""
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </details>
                </div>

                <div className="target-card-footer">
                  <button
                    type="button"
                    className="btn-card-action"
                    onClick={() => onSelectChart(target.univ, target.dept)}
                  >
                    <TrendingUp size={14} />
                    입결 추이 차트
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default memo(TargetBasket);
