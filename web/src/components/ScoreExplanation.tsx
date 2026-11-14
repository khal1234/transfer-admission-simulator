import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Info, X } from "lucide-react";
import { useAnchoredPopover } from "../hooks/useAnchoredPopover";

export default function ScoreExplanation({ children, description, label, className = "" }: {
  children: ReactNode; description: string; label: string; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const style = useAnchoredPopover({ open, triggerRef, popoverRef });
  function close() { setOpen(false); triggerRef.current?.focus(); }
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !popoverRef.current?.contains(target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return <>
    <button type="button" className={`score-explanation-trigger ${className}`}
      ref={triggerRef} title={description} aria-label={`${label} 설명 보기`}
      aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => setOpen(current => !current)}>
      {children}<Info size={14} aria-hidden="true" />
    </button>
    {open && createPortal(<div id={id} role="region" aria-label={`${label} 설명`}
      ref={popoverRef} className="score-explanation-panel" style={style}>
      <div className="score-explanation-heading"><strong>{label}</strong>
        <button type="button" aria-label="성적 설명 닫기" onClick={close}><X size={20} /></button>
      </div>
      <p>{description}</p>
    </div>, document.body)}
  </>;
}
