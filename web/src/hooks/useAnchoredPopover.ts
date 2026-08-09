import { useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";
import {
  calculatePopoverPosition,
  type PopoverAlignment,
} from "../utils/popoverPosition";

type UseAnchoredPopoverOptions = {
  align?: PopoverAlignment;
  mobileBreakpoint?: number;
  open: boolean;
  popoverRef: RefObject<HTMLElement | null>;
  triggerRef: RefObject<HTMLElement | null>;
};

export function useAnchoredPopover({
  align = "start",
  mobileBreakpoint = 767,
  open,
  popoverRef,
  triggerRef,
}: UseAnchoredPopoverOptions): CSSProperties | undefined {
  const [style, setStyle] = useState<CSSProperties>();

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      if (window.matchMedia(`(max-width: ${mobileBreakpoint}px)`).matches) {
        setStyle(undefined);
        return;
      }

      const trigger = triggerRef.current;
      const popover = popoverRef.current;
      if (trigger === null || popover === null) return;

      const position = calculatePopoverPosition({
        align,
        popoverHeight: popover.offsetHeight,
        popoverWidth: popover.offsetWidth,
        triggerRect: trigger.getBoundingClientRect(),
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
      });

      setStyle(position);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [align, mobileBreakpoint, open, popoverRef, triggerRef]);

  return style;
}
