import { memo } from "react";
import type { DisclosureNote } from "../utils/scoreProvenance";
import ScoreExplanation from "./ScoreExplanation";

type RawScoreValueProps = {
  value: number | null;
  note: DisclosureNote;
  suffix?: string;
  unavailableDescription?: string;
  /** 좁은 표 칸용: 값과 표시를 두 칸 틀에 넣어 줄마다 같은 자리에 오게 하고, 폰에서는 소수 한 자리로 보인다. */
  aligned?: boolean;
};

/** 소수 둘째 자리에서 반올림한 한 자리 표기(94.85 → 94.9). 폭을 맞추려고 정수도 «95.0»으로 쓴다. */
function formatOneDecimal(value: number): string {
  return (Math.round((value + Number.EPSILON) * 10) / 10).toFixed(1);
}

/**
 * 합격자 평균 원점수 한 칸.
 *
 * 대학이 발표한 값과 우리가 환산점수에서 되짚은 값이 화면에서 똑같이 보이면
 * 사용자가 구별할 수 없다. 되짚은 값에는 표시를 붙이고, 구간 환산표를 쓰는
 * 대학은 근사라는 것까지 드러낸다(scoreProvenance.ts).
 */
function RawScoreValue({
  value,
  note,
  suffix = "점",
  unavailableDescription,
  aligned = false,
}: RawScoreValueProps) {
  if (aligned) {
    if (value === null) {
      return (
        <span className="raw-score-cell raw-score-cell--empty">
          <RawScoreValue value={null} note={note} suffix={suffix} unavailableDescription={unavailableDescription} />
        </span>
      );
    }
    const short = formatOneDecimal(value);
    const isApproximateMark = note.disclosure === "derived-approximate";
    return (
      <span className="raw-score-cell">
        <span className="raw-score-num">
          {String(value) === short ? value : (
            <>
              <span className="raw-score-full">{value}</span>
              <span className="raw-score-short" aria-hidden="true">{short}</span>
            </>
          )}
          {suffix}
        </span>
        <span className="raw-score-slot">
          {note.marker !== null && (
            <ScoreExplanation
              className={`score-derived-mark ${isApproximateMark ? "approximate" : ""}`}
              description={note.description ?? "공개된 환산점수에서 원점수를 역산한 값입니다."}
              label={isApproximateMark ? "환산 역산(근사)" : "환산 역산"}
            >
              {isApproximateMark ? "≈" : "*"}
            </ScoreExplanation>
          )}
        </span>
      </span>
    );
  }

  if (value === null) {
    if (unavailableDescription !== undefined) return (
      <ScoreExplanation className="score-unavailable" label="비공개 사유" description={unavailableDescription}>
        비공개
      </ScoreExplanation>
    );
    return (
      <span
        className="score-unavailable"
        title={unavailableDescription}
        aria-label={unavailableDescription === undefined
          ? "비공개"
          : `비공개: ${unavailableDescription}`}
        tabIndex={unavailableDescription === undefined ? undefined : 0}
      >
        비공개
      </span>
    );
  }

  if (note.marker === null) {
    return <>{value}{suffix}</>;
  }

  const isApproximate = note.disclosure === "derived-approximate";

  return (
    <>
      {value}{suffix}
      <ScoreExplanation
        className={`score-derived-mark ${isApproximate ? "approximate" : ""}`}
        description={note.description ?? "공개된 환산점수에서 원점수를 역산한 값입니다."}
        label={isApproximate ? "환산 역산(근사)" : "환산 역산"}
      >
        {isApproximate ? "≈" : "*"}
      </ScoreExplanation>
    </>
  );
}

export default memo(RawScoreValue);
