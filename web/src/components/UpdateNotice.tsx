import { Bell, CheckCircle2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAnchoredPopover } from "../hooks/useAnchoredPopover";
import { UPDATE_ITEMS, UPDATE_NOTICE_DATE } from "./updateNoticeContent";

export default function UpdateNotice() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const panelStyle = useAnchoredPopover({
    align: "end",
    open,
    popoverRef: panelRef,
    triggerRef,
  });

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target)
        && !panelRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      setOpen(false);
      triggerRef.current?.focus();
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
        ref={triggerRef}
      >
        <Bell size={18} aria-hidden="true" />
        <span>업데이트 알림</span>
        <span className="update-notice-badge">NEW</span>
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <section
          className="update-notice-panel"
          id={panelId}
          ref={panelRef}
          role="dialog"
          aria-label="최근 업데이트 사항"
          style={panelStyle}
        >
          <header>
            <div>
              <span>최근 업데이트</span>
              <time dateTime={UPDATE_NOTICE_DATE.iso}>{UPDATE_NOTICE_DATE.label}</time>
            </div>
            <p>계산 정확도, 기록 판정 및 로딩 성능 개선 사항을 반영했습니다.</p>
          </header>
          <ul>
            {UPDATE_ITEMS.map((item) => (
              <li key={item}>
                <CheckCircle2 size={16} aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>,
        document.body,
      )}
    </div>
  );
}
