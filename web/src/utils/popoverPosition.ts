export type PopoverAlignment = "start" | "end";

type RectLike = Pick<DOMRect, "bottom" | "left" | "right" | "top">;

type PopoverPositionInput = {
  align: PopoverAlignment;
  popoverHeight: number;
  popoverWidth: number;
  triggerRect: RectLike;
  viewportHeight: number;
  viewportWidth: number;
};

export type PopoverPosition = {
  left: number;
  maxHeight: number;
  top: number;
};

const VIEWPORT_MARGIN = 12;
const TRIGGER_GAP = 6;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

export function calculatePopoverPosition({
  align,
  popoverHeight,
  popoverWidth,
  triggerRect,
  viewportHeight,
  viewportWidth,
}: PopoverPositionInput): PopoverPosition {
  const maxWidth = Math.max(0, viewportWidth - VIEWPORT_MARGIN * 2);
  const width = Math.min(popoverWidth, maxWidth);
  const maxHeight = Math.max(0, viewportHeight - VIEWPORT_MARGIN * 2);
  const height = Math.min(popoverHeight, maxHeight);
  const spaceAbove = triggerRect.top - VIEWPORT_MARGIN - TRIGGER_GAP;
  const spaceBelow = viewportHeight - triggerRect.bottom - VIEWPORT_MARGIN - TRIGGER_GAP;
  const placeAbove = spaceBelow < height && spaceAbove > spaceBelow;
  const preferredTop = placeAbove
    ? triggerRect.top - TRIGGER_GAP - height
    : triggerRect.bottom + TRIGGER_GAP;
  const preferredLeft = align === "end"
    ? triggerRect.right - width
    : triggerRect.left;

  return {
    left: clamp(
      preferredLeft,
      VIEWPORT_MARGIN,
      viewportWidth - VIEWPORT_MARGIN - width,
    ),
    maxHeight,
    top: clamp(
      preferredTop,
      VIEWPORT_MARGIN,
      viewportHeight - VIEWPORT_MARGIN - height,
    ),
  };
}
