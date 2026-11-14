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
        aria-label="업데이트 알림"
        onClick={() => setOpen((current) => !current)}
        ref={triggerRef}
      >
        <Bell size={18} aria-hidden="true" />
        {/* «NEW»는 눌러도 사라지지 않아 뜻이 없었다(2026-11-15 사용자 지적). 글자도 «업데이트»만 둔다. */}
        <span>업데이트</span>
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
            <p>표시된 날짜에 반영한 변경 사항만 안내합니다.</p>
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
