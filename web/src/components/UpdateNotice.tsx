import { Bell, CheckCircle2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

const UPDATE_ITEMS = [
  "부산대·경북대·충남대·인천대·충북대·전북대에 2024~2026학년도별 환산식을 적용했습니다.",
  "예술·체육·수의·약학·치의학 등 별도 전형 모집단위는 해당 학과 전용 배점을 적용합니다.",
  "TOEIC 구간표를 사용하는 대학은 연속 근사 대신 공식 구간 점수로 계산합니다.",
  "공식이 확인된 모집단위를 계산 대상으로 복원하고 데이터·계산 코드 일치 검사를 완료했습니다.",
] as const;

export default function UpdateNotice() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="update-notice" ref={rootRef}>
      <button
        type="button"
        className="update-notice-button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
      >
        <Bell size={18} aria-hidden="true" />
        <span>업데이트 알림</span>
        <span className="update-notice-badge">NEW</span>
      </button>

      {open && (
        <section
          className="update-notice-panel"
          id={panelId}
          role="dialog"
          aria-label="최근 업데이트 사항"
        >
          <header>
            <div>
              <span>최근 업데이트</span>
              <time dateTime="2026-08-04">2026. 8. 4.</time>
            </div>
            <p>대학별 모집요강 검증 결과를 계산기에 반영했습니다.</p>
          </header>
          <ul>
            {UPDATE_ITEMS.map((item) => (
              <li key={item}>
                <CheckCircle2 size={16} aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
