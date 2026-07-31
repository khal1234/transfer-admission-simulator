import { memo } from "react";
import type {
  AcceptedScoreExplanation,
  ComponentSource,
  FormulaBasis,
  ScoreComponent,
  ScoreExplanation,
} from "../utils/scoreExplanation";

/** 값의 출처를 한눈에 구별시키는 짧은 꼬리표. */
const SOURCE_LABEL: Record<ComponentSource, string> = {
  "computed-from-my-input": "내 입력",
  "university-published": "대학 공개",
  "derived-from-published-raw": "환산 계산",
  "not-reflected": "미반영",
  unavailable: "비공개",
};

type ScoreBasisProps = {
  mine: ScoreExplanation | null;
  accepted: AcceptedScoreExplanation | null;
  formulaBasis: FormulaBasis | null;
};

function ComponentRow({ component }: { component: ScoreComponent }) {
  return (
    <li className="score-basis-item">
      <div className="score-basis-item-head">
        <span className="score-basis-name">{component.label}</span>
        <span className={`score-basis-tag source-${component.source}`}>
          {SOURCE_LABEL[component.source]}
        </span>
        <span className="score-basis-value">
          {component.value === null ? "-" : `${component.value}점`}
        </span>
      </div>
      <p className="score-basis-detail">{component.detail}</p>
    </li>
  );
}

function FormulaBasisNote({ basis }: { basis: FormulaBasis }) {
  const warnings: string[] = [];

  if (basis.confidence === "estimated") {
    warnings.push("공개된 원문으로 배율을 확정하지 못해 추정식을 적용했습니다");
  }
  if (basis.confidence === "lookup-approximation") {
    warnings.push("대학이 구간 환산표를 쓰므로 연속식으로 근사했습니다");
  }
  if (basis.provenance === "assumed-from-other-year") {
    warnings.push("이 연도의 모집요강을 확보하지 못해 다른 연도 공식을 가정했습니다");
  }
  if (basis.documentedFormulaUnverified) {
    warnings.push("모집요강 원문 표기와 대조가 끝나지 않아 원문을 표시하지 않습니다");
  }

  return (
    <div className="score-basis-formula">
      <p className="score-basis-heading">환산식 근거</p>

      {basis.englishFormulaText !== null && (
        <p className="score-basis-formula-text">
          공인영어 · {basis.englishFormulaText}
        </p>
      )}
      {basis.gpaFormulaText !== null && (
        <p className="score-basis-formula-text">
          전적대성적 · {basis.gpaFormulaText}
        </p>
      )}

      {warnings.length === 0
        ? (
          <p className="score-basis-verified">
            모집요강 표기와 계산식이 일치하는 것을 확인했습니다
          </p>
        )
        : (
          <ul className="score-basis-warnings">
            {warnings.map((warning) => (
              <li key={warning}>⚠️ {warning}</li>
            ))}
          </ul>
        )}
    </div>
  );
}

function ScoreBasis({ mine, accepted, formulaBasis }: ScoreBasisProps) {
  if (mine === null && accepted === null && formulaBasis === null) {
    return null;
  }

  return (
    <details className="score-basis">
      <summary className="score-basis-summary">
        이 점수가 나온 근거 보기
      </summary>

      <div className="score-basis-body">
        {mine !== null && (
          <section className="score-basis-section">
            <p className="score-basis-heading">
              내 스펙 지표합{" "}
              <strong>{mine.total === null ? "계산 불가" : `${mine.total}점`}</strong>
            </p>
            <ul className="score-basis-list">
              {mine.components.map((component) => (
                <ComponentRow key={component.label} component={component} />
              ))}
            </ul>
          </section>
        )}

        {accepted !== null && (
          <section className="score-basis-section">
            <p className="score-basis-heading">
              합격선 지표합{" "}
              <strong>
                {accepted.total === null ? "비공개" : `${accepted.total}점`}
              </strong>
              {accepted.admissionBasis === "최초"
                || accepted.admissionBasis === "최종"
                ? (
                  <span className="score-basis-note">
                    · {accepted.admissionBasis}합격자 기준
                  </span>
                )
                : null}
            </p>
            <ul className="score-basis-list">
              {accepted.components.map((component) => (
                <ComponentRow key={component.label} component={component} />
              ))}
            </ul>
          </section>
        )}

        {formulaBasis !== null && <FormulaBasisNote basis={formulaBasis} />}

        <p className="score-basis-disclaimer">
          지표합은 공인영어와 전적대 성적만 더한 값입니다. 면접·실기 등 나머지
          전형요소는 포함되지 않으므로 실제 총점과 다릅니다.
        </p>
      </div>
    </details>
  );
}

export default memo(ScoreBasis);
