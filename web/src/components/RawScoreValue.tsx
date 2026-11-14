import { memo } from "react";
import type { DisclosureNote } from "../utils/scoreProvenance";
import ScoreExplanation from "./ScoreExplanation";

type RawScoreValueProps = {
  value: number | null;
  note: DisclosureNote;
  suffix?: string;
  unavailableDescription?: string;
};

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
}: RawScoreValueProps) {
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
