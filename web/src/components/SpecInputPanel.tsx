import { memo, useState } from "react";
import { AlertTriangle, UserCheck } from "lucide-react";
import {
  getGpaInputProblem,
  getGpaMax,
  getToeicInputProblem,
  type GpaType,
} from "../utils/scoreInput";

type SpecInputPanelProps = {
  toeicInput: string;
  toeic: number | null;
  gpaType: GpaType;
  gpaRawInput: string;
  gpaRaw: number | null;
  gpa100: number | null;
  onToeicInputChange: (value: string) => void;
  onLoadExample: () => void;
  onGpaRawInputChange: (value: string) => void;
  onGpaRawInputBlur: () => void;
  onGpaTypeChange: (type: GpaType) => void;
};

function SpecInputPanel({
  toeicInput,
  toeic,
  gpaType,
  gpaRawInput,
  gpaRaw,
  gpa100,
  onToeicInputChange,
  onLoadExample,
  onGpaRawInputChange,
  onGpaRawInputBlur,
  onGpaTypeChange,
}: SpecInputPanelProps) {
  // 한 번 입력하고 나면 다시 볼 일이 드문 영역이다. 예전에는 이것이 좌측
  // 380px 세로 컬럼을 상시 점유해서, 정작 계속 보는 장바구니가 남는 폭에서
  // 2열까지밖에 못 폈다. 평소에는 값만 한 줄로 접어두고 필요할 때 편다.
  const summaryText = [
    toeic === null ? "TOEIC 미입력" : `TOEIC ${toeic}점`,
    gpaRaw === null
      ? "GPA 미입력"
      : gpaType === "100"
        ? `GPA ${gpaRaw}/100`
        : `GPA ${gpaRaw}/${getGpaMax(gpaType)}`,
    gpa100 === null || gpaType === "100" ? null : `백분위 약 ${gpa100} (추정)`,
  ].filter(Boolean).join(" · ");

  // 점수가 비어 있으면 펼친 채로 시작한다. 처음 온 사람이 할 일이 여기라서다.
  const [startsOpen] = useState(toeic === null || gpaRaw === null);
  const toeicProblem = getToeicInputProblem(toeicInput);
  const gpaProblem = getGpaInputProblem(gpaRawInput, gpaType);
  const isBlank = toeicProblem === "empty" && gpaProblem === "empty";

  return (
    <section className="dashboard-column spec-section">
      <details className="card spec-panel" open={startsOpen || undefined}>
        <summary className="spec-panel-summary">
          <span className="card-title spec-panel-title">
            <UserCheck size={20} />
            내 편입 스펙
          </span>
          <span className="spec-panel-values">{summaryText}</span>
          <span className="spec-panel-toggle">
            <span className="spec-open-label">수정</span>
            <span className="spec-close-label">접기</span>
          </span>
        </summary>

        <div className="spec-panel-body">
        <div className="spec-input-group">
          <label htmlFor="toeic-score">공인영어성적 (TOEIC)</label>
          <div className="input-with-suffix input-with-suffix-spaced">
            <input
              id="toeic-score"
              type="number"
              min={100}
              max={990}
              step={5}
              value={toeicInput}
              onChange={(event) => onToeicInputChange(event.target.value)}
              placeholder="예: 850"
              aria-invalid={toeic === null}
              aria-describedby={toeic === null ? "toeic-validation" : undefined}
            />
            <span>점 / 990점</span>
          </div>
          <input
            className="spec-range"
            aria-label="TOEIC 점수 조절"
            type="range"
            min={100}
            max={990}
            step={5}
            value={toeic ?? 850}
            onChange={(event) => onToeicInputChange(event.target.value)}
          />
          {toeic === null && (
            <p
              className={`validation-message ${toeicProblem === "empty" ? "validation-message-hint" : ""}`}
              id="toeic-validation"
              role={toeicProblem === "empty" ? undefined : "alert"}
            >
              {toeicProblem === "empty"
                ? "TOEIC 점수를 입력해 주세요."
                : toeicProblem === "out-of-range"
                  ? "TOEIC은 100~990점 사이로 입력해 주세요. 입력한 값은 계산에 쓰지 않았습니다."
                  : toeicProblem === "not-step"
                    ? "TOEIC 점수는 5점 단위입니다(예: 850, 855). 입력한 값은 계산에 쓰지 않았습니다."
                    : "숫자로 입력해 주세요."}
            </p>
          )}
        </div>

        <div className="spec-input-group">
          <label htmlFor="gpa-score">전적대학 평점 성적 (GPA)</label>
          <div className="spec-tabs" role="group" aria-label="GPA 척도 선택">
            {(["100", "4.5", "4.3"] as const).map((type) => (
              <button
                type="button"
                key={type}
                className={`spec-tab ${gpaType === type ? "active" : ""}`}
                aria-pressed={gpaType === type}
                onClick={() => onGpaTypeChange(type)}
              >
                {type === "100" ? "백분위 (100)" : `${type} 만점`}
              </button>
            ))}
          </div>

          <div className="input-with-suffix">
            <input
              id="gpa-score"
              type="number"
              step={0.01}
              min={gpaType === "100" ? 0 : 0.01}
              max={getGpaMax(gpaType)}
              value={gpaRawInput}
              onChange={(event) => onGpaRawInputChange(event.target.value)}
              onBlur={onGpaRawInputBlur}
              placeholder={gpaType === "100" ? "예: 90" : "예: 3.8"}
              aria-invalid={gpaRaw === null}
              aria-describedby={gpaRaw === null ? "gpa-validation" : undefined}
            />
            <span>점 / {gpaType === "100" ? "100" : gpaType}점</span>
          </div>
          {gpaRaw === null && (
            <p
              className={`validation-message ${gpaProblem === "empty" ? "validation-message-hint" : ""}`}
              id="gpa-validation"
              role={gpaProblem === "empty" ? undefined : "alert"}
            >
              {gpaProblem === "empty"
                ? "전적대 성적을 입력해 주세요. 성적증명서에 백분위(100점 만점)가 있으면 그 값을 넣는 것이 가장 정확합니다."
                : gpaProblem === "above-max"
                  ? gpaType === "100"
                    ? "백분위는 100 이하로 입력해 주세요. 입력한 값은 계산에 쓰지 않았습니다."
                    : `${gpaType} 이하로 입력해 주세요. 백분위 점수(예: 90)라면 위에서 ‘백분위 (100)’을 고르세요. 입력한 값은 계산에 쓰지 않았습니다.`
                  : gpaProblem === "below-min"
                    ? "0보다 큰 값을 입력해 주세요."
                    : "숫자로 입력해 주세요."}
            </p>
          )}

          {gpaType !== "100" && (
            <div className="gpa-estimate">
              💡 100점 백분위 환산 추정치:{" "}
              <strong>{gpa100 !== null ? `${gpa100}점` : "계산 불가"}</strong>
            </div>
          )}
        </div>

        {isBlank && (
          <p className="spec-example-row">
            어떻게 보이는지 먼저 보고 싶다면{" "}
            <button type="button" className="spec-example-button" onClick={onLoadExample}>
              예시로 보기 (TOEIC 850 · 백분위 90)
            </button>
          </p>
        )}

        <div className="disclaimer-box">
          <AlertTriangle
            className="disclaimer-icon"
            size={18}
          />
          <p className="disclaimer-text">
            4.5 및 4.3 평점 환산은 일반적인 선형 근사치이며, 대학별 산정 기준과 다를 수 있습니다.
            정확한 비교를 위해 성적 증명서 상의 <strong>'백분위 성적(100만점)'</strong>을 직접
            입력하는 것을 강력히 권장합니다.
          </p>
        </div>
        </div>
      </details>
    </section>
  );
}

export default memo(SpecInputPanel);
