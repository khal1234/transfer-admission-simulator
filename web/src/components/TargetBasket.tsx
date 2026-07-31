import { memo } from "react";
import {
  BookOpen,
  ChevronDown,
  Star,
  Trash2,
  TrendingUp,
} from "lucide-react";
import type {
  analyzeScoreDeficit,
  calculateScore,
  DepartmentRecord,
} from "../utils/converter";
import { formatCompetitionRatio } from "../utils/competition";
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
import type { ComparisonBasis, Target } from "../utils/targets";
import {
  getRecentHistoryStatus,
  type RecentHistoryRow,
} from "../utils/historyStatus";
import RawScoreValue from "./RawScoreValue";
import ScoreBasis from "./ScoreBasis";
import UniversityName from "./UniversityName";

type YearlyComparison = {
  year: string;
  /** 그 해에 이 모집단위를 아예 안 뽑았는지, 뽑았는데 성적을 안 냈는지는 다르다. */
  hasRecord: boolean;
  /** 그 해에 같은 계열을 뽑은 다른 모집단위 이름들. 자료가 빈 이유를 설명한다. */
  siblingDepartments: string[];
  score: ReturnType<typeof calculateScore>;
};

export type TargetSummary = {
  key: string;
  target: Target;
  referenceRecord: DepartmentRecord;
  score: ReturnType<typeof calculateScore>;
  yearlyComparisons: YearlyComparison[];
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
  comparisonBasis: ComparisonBasis;
  onComparisonBasisChange: (basis: ComparisonBasis) => void;
  onToggleTarget: (univ: string, dept: string) => void;
  onSelectChart: (univ: string, dept: string, trigger: HTMLButtonElement) => void;
};

/**
 * 판정을 어느 해에 걸지 고르는 자리.
 *
 * 최신 한 해로 고정하면 그 해가 유독 빡셌을 때 실제보다 비관적으로 읽힌다.
 * 반대로 무른 해였으면 낙관적으로 읽힌다. 3개년 줄에 숫자는 이미 다 있지만,
 * 뱃지와 필요 점수는 한 해에만 걸리므로 그 한 해를 고를 수 있어야 한다.
 */
const COMPARISON_BASIS_OPTIONS: {
  value: ComparisonBasis;
  label: string;
  title: string;
}[] = [
  {
    value: "latest",
    label: "최신",
    title: "가장 최근에 합격 평균이 공개된 연도를 기준으로 판정합니다.",
  },
  {
    value: "lowest",
    label: "합격선 낮은 해",
    title: "최근 3개년 중 내 격차가 가장 작았던 해 — 그 해였다면 가장 붙기 "
      + "쉬웠던 해입니다. 연도마다 배점이 달라 합격선 숫자끼리 직접 견주지 않고 "
      + "격차로 고릅니다.",
  },
  {
    value: "highest",
    label: "합격선 높은 해",
    title: "최근 3개년 중 내 격차가 가장 컸던 해 — 가장 빡셌던 해 기준으로 "
      + "보수적으로 잡고 싶을 때 씁니다.",
  },
];

/**
 * 부족한 점수를 메우는 경로를 한 줄로 적는다.
 *
 * 필요량만 그대로 적으면 'GPA +20.95' 같은 말이 나온다. 4.5 만점에서 도달할 수
 * 없는 값인데 마치 방법이 있는 것처럼 읽힌다. 만점을 넘는 경로는 빼고, 둘 다
 * 넘으면 단독으로는 안 된다고 밝힌다. 상세 분석 패널도 같은 기준을 쓴다.
 *
 * 구간 환산표를 근사한 대학은 값 앞에 ≈ 를 붙인다. 원점수 칸에서 쓰는 표기와
 * 같은 뜻이다(RawScoreValue.tsx).
 */
function buildImprovementText(
  analysis: NonNullable<TargetSummary["analysis"]>,
  toeic: number | null,
  gpaRaw: number | null,
  gpaType: GpaType,
): string {
  const paths: string[] = [];

  if (analysis.toeicNeeded !== null && toeic !== null) {
    if (toeic + analysis.toeicNeeded <= 990) {
      paths.push(`TOEIC +${analysis.toeicNeeded}`);
    }
  }

  if (analysis.gpaNeeded !== null && gpaRaw !== null) {
    if (gpaRaw + analysis.gpaNeeded <= getGpaMax(gpaType)) {
      paths.push(`전적대 +${analysis.gpaNeeded}`);
    }
  }

  if (paths.length > 0) {
    const text = `${paths.join(" 또는 ")} 필요`;
    return analysis.isLookupBased ? `≈ ${text}` : text;
  }

  return "한 요소만으로는 도달 불가";
}

const LOOKUP_APPROXIMATION_HINT =
  "구간 환산표를 직선으로 근사해 역산한 추정치입니다. 실제 환산표에서는 구간 "
  + "경계에 따라 몇 점 차이가 날 수 있습니다.";

/**
 * 합격자 기준 뱃지 한 칸.
 *
 * 최초합격자 평균과 최종등록자 평균은 성격이 다르다 — 최초 평균은 상위권이
 * 빠지기 전 값이라 보통 더 높다. 그런데 두 뱃지가 같은 회색이라 나란히 놓고도
 * 구별이 안 됐다. 색을 나누고, 대학이 어느 쪽인지 밝히지 않은 경우(경북대·
 * 전남대 전체, 부산대 일부)는 뱃지 자체가 사라져 '왜 얘만 없지'가 됐던 것을
 * 미공개라고 적어 드러낸다.
 */
function getAcceptanceBasisBadge(
  basis: DepartmentRecord["합격자기준"],
): { modifier: string; label: string; title: string } {
  if (basis === "최초") {
    return {
      modifier: "acceptance-basis-first",
      label: "최초합격자 기준",
      title: "합격자 발표 직후의 최초합격자 평균입니다. 상위권이 다른 대학으로 "
        + "빠지기 전 값이라 최종등록자 평균보다 높게 잡히는 편입니다.",
    };
  }

  if (basis === "최종") {
    return {
      modifier: "acceptance-basis-final",
      label: "최종합격자 기준",
      title: "추가합격까지 끝난 뒤의 최종등록자 평균입니다. 최초합격자 평균보다 "
        + "낮게 잡히는 편입니다.",
    };
  }

  return {
    modifier: "acceptance-basis-unknown",
    label: "합격자 기준 미공개",
    title: "이 대학은 공개한 평균이 최초합격자 기준인지 최종등록자 기준인지 "
      + "밝히지 않았습니다. 다른 대학과 견줄 때 이 점을 감안해 주세요.",
  };
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
  comparisonBasis,
  onComparisonBasisChange,
  onToggleTarget,
  onSelectChart,
}: TargetBasketProps) {
  return (
    <div className="card basket-card" id="target-basket">
      <div className="basket-title-row">
        <h2 className="card-title">
          <Star
            size={20}
            color="var(--status-borderline)"
            fill="var(--status-borderline)"
          />
          내 지망 대학 장바구니 (동시 환산 비교)
        </h2>

        {targetCount > 0 && (
          <div
            className="basis-switch"
            role="group"
            aria-label="판정 기준 연도"
          >
            <span className="basis-switch-label">판정 기준</span>
            {COMPARISON_BASIS_OPTIONS.map(({ value, label, title }) => (
              <button
                key={value}
                type="button"
                className={`basis-switch-option ${
                  comparisonBasis === value ? "active" : ""
                }`}
                aria-pressed={comparisonBasis === value}
                title={title}
                onClick={() => onComparisonBasisChange(value)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

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
            yearlyComparisons,
            deficit,
            analysis,
            comparisonYearNotice,
            formulaNotice,
            renamedHistoryText,
            recentHistoryRows,
          }) => {
            // 입력 필수 여부는 선택한 대학·연도 공식이 결정한다. 영어만 반영하는
            // 전형은 GPA가 비어 있어도 지표합을 정상 계산할 수 있다.
            const scoreInputInvalid = score.myIndexSum === null;
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
                    {(() => {
                      const badge = getAcceptanceBasisBadge(
                        referenceRecord.합격자기준,
                      );

                      return (
                        <span
                          className={`acceptance-basis ${badge.modifier}`}
                          title={badge.title}
                        >
                          [{badge.label}]
                        </span>
                      );
                    })()}
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
                          <span className="compare-my-label">내 점수</span>
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

                      {/* 사용자가 실제로 하는 판단은 '뭘 얼마나 올려야 하나'다.
                          그게 상세 분석 안에 접혀 있고, 참고용인 과거 평균이
                          앞자리를 차지하고 있었다. 접힌 상태에서도 보이게 올린다. */}
                      {analysis !== null && (
                        <span
                          className="compare-action"
                          title={needsImprovement && analysis.isLookupBased
                            ? LOOKUP_APPROXIMATION_HINT
                            : undefined}
                        >
                          {needsImprovement
                            ? buildImprovementText(
                              analysis,
                              toeic,
                              gpaRaw,
                              gpaType,
                            )
                            : analysis.recommendedMetric === "toeic"
                              ? `TOEIC이 유리 (+10 → +${analysis.toeicEfficiency}점)`
                              : analysis.recommendedMetric === "gpa"
                                ? `전적대가 유리 (+0.1 → +${analysis.gpaEfficiency}점)`
                                : ""}
                        </span>
                      )}
                    </div>

                    {/* 한 해만 대조하면 그 해가 유독 빡셌는지 무른 해였는지
                        알 수 없다. 배점이 바뀐 해는 내 지표합도 같이 움직이므로
                        연도마다 내 점수와 합격선을 나란히 둔다. */}
                    <ul className="compare-years">
                      {yearlyComparisons.map(({
                        year,
                        hasRecord,
                        siblingDepartments,
                        score: yearScore,
                      }) => (
                        <li
                          key={year}
                          className={`compare-year ${
                            year === referenceRecord.연도 ? "compare-year-reference" : ""
                          }`}
                        >
                          <span className="compare-year-label">{year}</span>
                          {/* 좁은 화면에서는 요약 줄의 '2025 합격선' 라벨을
                              감추므로, 어느 해로 판정했는지는 여기서만 읽힌다.
                              색·굵기로만 표시하면 그 화면에서 근거가 사라진다. */}
                          {year === referenceRecord.연도 && (
                            <span className="compare-year-basis">기준</span>
                          )}
                          {!hasRecord ? (
                            // '모집 없음'이라고 단정하면 안 된다. 그 해에 안 뽑은
                            // 경우와 다른 이름으로 뽑은 경우를 지금 데이터로는
                            // 구별하지 못한다(강원대 기계의용 계열 등).
                            <span
                              className="compare-year-empty"
                              title={siblingDepartments.length > 0
                                ? `이 이름으로는 자료가 없습니다. 그 해에는 ${
                                  siblingDepartments.map((dept) => `「${dept}」`).join(", ")
                                }(으)로 뽑았습니다.`
                                : "그 해에 모집하지 않았거나, 학과 이름이 달라 이 모집단위로 잡히지 않은 경우입니다."}
                            >
                              {siblingDepartments.length > 0
                                ? `다른 이름으로 모집 (${siblingDepartments.length}개)`
                                : "자료 없음"}
                            </span>
                          ) : yearScore.acceptedIndexSum === null ? (
                            <span className="compare-year-empty">합격선 비공개</span>
                          ) : (
                            <>
                              <span className="compare-year-scores">
                                {yearScore.myIndexSum ?? "-"}
                                <span className="compare-year-versus">vs</span>
                                {yearScore.acceptedIndexSum}
                              </span>
                              <span
                                className={`compare-year-diff ${
                                  yearScore.diff !== null && yearScore.diff >= 0
                                    ? "positive"
                                    : "negative"
                                }`}
                              >
                                {yearScore.diff === null
                                  ? "-"
                                  : yearScore.diff >= 0
                                    ? `+${yearScore.diff}`
                                    : yearScore.diff}
                              </span>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>

                    {/* '왜 26년도밖에 없지'에 답하는 줄. 어느 칸에 있는지까지
                        짚어줘야 사용자가 그 모집단위를 따로 담아 볼 수 있다.
                        수치를 합치지는 않는다 — 쪼개진 전공의 평균을 우리가
                        섞으면 대학이 낸 적 없는 숫자를 만들어내는 셈이다. */}
                    {(() => {
                      const splitYears = yearlyComparisons.filter(
                        (comparison) => comparison.siblingDepartments.length > 0,
                      );

                      if (splitYears.length === 0) {
                        return null;
                      }

                      const relatedDepartments = [...new Set(
                        splitYears.flatMap((comparison) => comparison.siblingDepartments),
                      )];

                      return (
                        <p className="compare-split-notice">
                          📌 {splitYears.map((comparison) => comparison.year).join("·")}에는
                          같은 계열을{" "}
                          {relatedDepartments.map((dept) => `「${dept}」`).join(", ")}
                          (으)로 뽑았습니다. 그 해 입결은 해당 모집단위를 따로 담아
                          확인해 주세요.
                        </p>
                      );
                    })()}

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
                      <span className="details-closed-label">
                        <span className="summary-label-wide">상세 분석 보기</span>
                        <span className="summary-label-narrow">상세 분석</span>
                      </span>
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
                        {analysis.toeicNeeded === null
                          && analysis.gpaNeeded === null ? (
                          <p className="lookup-warning">
                            ⚠️ 만점까지 올려도 한 요소만으로는 이 격차를 메울 수 없습니다.
                          </p>
                        ) : (
                          <ul className="improvement-list">
                            {analysis.toeicNeeded !== null && (
                              <li>
                                • <strong>TOEIC만</strong> 올릴 시:{" "}
                                <strong className="analysis-target">
                                  {analysis.isLookupBased ? "≈ " : ""}
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
                                  {analysis.isLookupBased ? "≈ " : ""}
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
                        {analysis.isLookupBased && (
                          <p className="lookup-warning">
                            ⚠️ 이 대학은 구간 등급제 환산표를 씁니다. 위 값은 환산표를 직선으로
                            근사해 역산한 <strong>추정치</strong>이며, 실제 환산표에서는 구간
                            경계에 따라 몇 점 차이가 날 수 있습니다. 원서 접수 전에 모집요강
                            환산표로 확인해 주세요.
                          </p>
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
                              siblingDepartments,
                            }) => {
                              const status = getRecentHistoryStatus({
                                year,
                                record,
                                exclusionReason,
                                exceptionLookupStatus,
                                siblingDepartments,
                              });
                              if (record === null) {
                                return (
                                  <tr key={year}>
                                    <td>{year}년</td>
                                    <td
                                      colSpan={5}
                                      className={`history-unavailable history-${status.kind}`}
                                      title={status.title}
                                    >
                                      {status.label}
                                    </td>
                                  </tr>
                                );
                              }

                              return (
                                <tr key={record.연도}>
                                  <td>
                                    {record.연도}년
                                    <span className="sr-only"> · {status.label}</span>
                                  </td>
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
                    onClick={(event) => onSelectChart(
                      target.univ,
                      target.dept,
                      event.currentTarget,
                    )}
                  >
                    <TrendingUp size={14} />
                    <span className="summary-label-wide">입결 추이 차트</span>
                    <span className="summary-label-narrow">추이 차트</span>
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
