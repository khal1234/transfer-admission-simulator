import { memo } from "react";
import { AlertTriangle, UserCheck } from "lucide-react";
import { getGpaMax, type GpaType } from "../utils/scoreInput";

type SpecInputPanelProps = {
  toeicInput: string;
  toeic: number | null;
  gpaType: GpaType;
  gpaRawInput: string;
  gpaRaw: number | null;
  gpa100: number | null;
  onToeicInputChange: (value: string) => void;
  onGpaRawInputChange: (value: string) => void;
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
  onGpaRawInputChange,
  onGpaTypeChange,
}: SpecInputPanelProps) {
  return (
    <section className="dashboard-column">
      <div className="card">
        <h2 className="card-title">
          <UserCheck size={20} color="#1e3a8a" />
          내 편입 스펙 입력
        </h2>

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
            value={toeic ?? 100}
            onChange={(event) => onToeicInputChange(event.target.value)}
          />
          {toeic === null && (
            <p className="validation-message">
              TOEIC은 100~990점 범위에서 5점 단위로 입력해 주세요.
            </p>
          )}
        </div>

        <div className="spec-input-group">
          <label htmlFor="gpa-score">전적대학 평점 성적 (GPA)</label>
          <div className="spec-tabs">
            {(["100", "4.5", "4.3"] as const).map((type) => (
              <button
                type="button"
                key={type}
                className={`spec-tab ${gpaType === type ? "active" : ""}`}
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
              step={gpaType === "100" ? 1 : 0.05}
              min={gpaType === "100" ? 0 : 0.01}
              max={getGpaMax(gpaType)}
              value={gpaRawInput}
              onChange={(event) => onGpaRawInputChange(event.target.value)}
            />
            <span>점 / {gpaType === "100" ? "100" : gpaType}점</span>
          </div>
          {gpaRaw === null && (
            <p className="validation-message">
              선택한 GPA 만점 범위 안의 점수를 입력해 주세요.
            </p>
          )}

          {gpaType !== "100" && (
            <div className="gpa-estimate">
              💡 100점 백분위 환산 추정치:{" "}
              <strong>{gpa100 !== null ? `${gpa100}점` : "계산 불가"}</strong>
            </div>
          )}
        </div>

        <div className="disclaimer-box">
          <AlertTriangle
            className="disclaimer-icon"
            size={18}
            color="#b45309"
          />
          <p className="disclaimer-text">
            4.5 및 4.3 평점 환산은 일반적인 선형 근사치이며, 대학별 산정 기준과 다를 수 있습니다.
            정확한 비교를 위해 성적 증명서 상의 <strong>'백분위 성적(100만점)'</strong>을 직접
            입력하는 것을 강력히 권장합니다.
          </p>
        </div>
      </div>
    </section>
  );
}

export default memo(SpecInputPanel);
