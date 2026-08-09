import type { DataConfidence } from "../utils/decisionSupport";

type DataConfidenceBadgeProps = {
  confidence: DataConfidence;
  compact?: boolean;
};

export default function DataConfidenceBadge({
  confidence,
  compact = false,
}: DataConfidenceBadgeProps) {
  return (
    <details className={`confidence-badge confidence-${confidence.level}`}>
      <summary aria-label={`데이터 신뢰도: ${confidence.label}`}>
        <span aria-hidden="true">{confidence.level === "high" ? "●" : "▲"}</span>
        {compact ? confidence.label.replace(" 필요", "") : confidence.label}
      </summary>
      <div className="confidence-popover">
        <strong>데이터 판단 근거</strong>
        <ul>
          {confidence.reasons.map((reason) => <li key={reason}>{reason}</li>)}
        </ul>
        <p>지원 전 해당 연도 공식 모집요강과 입학처 자료를 다시 확인하세요.</p>
      </div>
    </details>
  );
}
