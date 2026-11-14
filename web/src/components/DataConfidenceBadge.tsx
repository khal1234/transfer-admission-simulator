import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
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

  // 걸리는 것이 없으면 아무것도 띄우지 않는다. 초록 «근거 높음»이 «미달» 카드에 붙으면 합격 근거가
  // 높다는 말로 읽혔고, 판정(상회·근접·미달)보다 먼저 눈에 들어왔다(2026-11-15 사용자 지적).
  if (confidence.level === "high") {
    return null;
  }

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
        <Info size={13} aria-hidden="true" />
        {compact ? `자료 ${confidence.label.replace(" 필요", "")}` : `자료 ${confidence.label}`}
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
          <strong>이 판정에서 확인해 둘 점</strong>
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
