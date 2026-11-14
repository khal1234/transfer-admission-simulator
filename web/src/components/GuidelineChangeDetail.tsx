import type { GuidelineChangeItem, UniversityGuidelineChange } from "../utils/guidelineChanges";

/**
 * 달라진 점 하나의 전·후와 볼 쪽. 첫 화면의 «달라진 점» 상자와 지망 카드가 같이 쓴다.
 */
export default function GuidelineChangeDetail({
  entry,
  change,
  baseYear,
  targetYear,
}: {
  entry: UniversityGuidelineChange;
  change: GuidelineChangeItem;
  baseYear: string;
  targetYear: string;
}) {
  return (
    <div className="guideline-change-detail">
      <p className="guideline-change-scope">해당: {change.scope}</p>
      <dl>
        <div>
          <dt>{baseYear}</dt>
          <dd>{change.before}</dd>
        </div>
        <div className="guideline-change-after">
          <dt>{targetYear}</dt>
          <dd>{change.after}</dd>
        </div>
      </dl>
      {change.impact !== null && (
        <p className="guideline-change-impact">→ {change.impact}</p>
      )}
      <p className="guideline-change-pages">
        확인할 곳:{" "}
        {change.pageBefore === null ? "" : `${baseYear} 요강 ${change.pageBefore} · `}
        {targetYear} {entry.documentKind} {change.pageAfter}
      </p>
    </div>
  );
}
