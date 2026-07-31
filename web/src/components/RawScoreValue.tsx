import { memo } from "react";
import type { DisclosureNote } from "../utils/scoreProvenance";

type RawScoreValueProps = {
  value: number | null;
  note: DisclosureNote;
  suffix?: string;
};

/**
 * 합격자 평균 원점수 한 칸.
 *
 * 대학이 발표한 값과 우리가 환산점수에서 되짚은 값이 화면에서 똑같이 보이면
 * 사용자가 구별할 수 없다. 되짚은 값에는 표시를 붙이고, 구간 환산표를 쓰는
 * 대학은 근사라는 것까지 드러낸다(scoreProvenance.ts).
 */
function RawScoreValue({ value, note, suffix = "점" }: RawScoreValueProps) {
  if (value === null) {
    return <>비공개</>;
  }

  if (note.marker === null) {
    return <>{value}{suffix}</>;
  }

  const isApproximate = note.disclosure === "derived-approximate";

  return (
    <>
      {value}{suffix}
      <span
        className={`score-derived-mark ${isApproximate ? "approximate" : ""}`}
        title={note.description ?? undefined}
        aria-label={note.marker}
      >
        {isApproximate ? "≈" : "*"}
      </span>
    </>
  );
}

export default memo(RawScoreValue);
