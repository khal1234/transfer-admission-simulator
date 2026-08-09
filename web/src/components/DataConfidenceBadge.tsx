import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAnchoredPopover } from "../hooks/useAnchoredPopover";
import type { DataConfidence } from "../utils/decisionSupport";
import type { PopoverAlignment } from "../utils/popoverPosition";

type DataConfidenceBadgeProps = {
  align?: PopoverAlignment;
  confidence: DataConfidence;
  compact?: boolean;
};

export default function DataConfidenceBadge({
  align = "start",
  confidence,
  compact = false,
}: DataConfidenceBadgeProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDetailsElement>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverStyle = useAnchoredPopover({
    align,
    open,
    popoverRef,
    triggerRef,
  });

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target)
        && !popoverRef.current?.contains(target)
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
    <details
      className={`confidence-badge confidence-${confidence.level}`}
      open={open}
      ref={rootRef}
    >
      <summary
        aria-controls={panelId}
        aria-expanded={open}
        aria-label={`데이터 신뢰도: ${confidence.label}`}
        onClick={(event) => {
          event.preventDefault();
          setOpen((current) => !current);
        }}
        ref={triggerRef}
      >
        <span aria-hidden="true">{confidence.level === "high" ? "●" : "▲"}</span>
        {compact ? confidence.label.replace(" 필요", "") : confidence.label}
      </summary>
      {open && typeof document !== "undefined" && createPortal(
        <div
          aria-label="데이터 판단 근거"
          className="confidence-popover"
          id={panelId}
          ref={popoverRef}
          role="region"
          style={popoverStyle}
        >
          <strong>데이터 판단 근거</strong>
          <ul>
            {confidence.reasons.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
          <p>지원 전 해당 연도 공식 모집요강과 입학처 자료를 다시 확인하세요.</p>
        </div>,
        document.body,
      )}
    </details>
  );
}
