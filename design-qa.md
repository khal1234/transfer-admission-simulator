# Design QA

## Evidence

- Source visual truth: `/var/folders/hw/cc0kzpsj13q8f9_zhcs6bzrc0000gn/T/codex-clipboard-733a801c-5f21-4b2b-80be-bb7c62ec36d1.png`
- Final implementation: `/Users/choikang/Documents/transfer-admission-simulator/web/tmp/ux-audit/13-compare-portal-final.png`
- Side-by-side comparison input: `/Users/choikang/Documents/transfer-admission-simulator/web/tmp/ux-audit/compare-source-vs-final.png`
- Source size: 1994 × 1138 px
- Implementation capture: 1912 × 1146 px, normalized to 1994 × 1138 px only for the side-by-side review
- Compared state: dark theme, 지망 비교표 selected, rightmost low-confidence explanation open

The source contains nine comparison rows while the local test state contains two. The QA target is the same right-edge popover geometry and interaction state; the surrounding product styling was intentionally preserved.

## Full-view comparison

The original popover extends past the right viewport edge and is clipped by the comparison table's scrolling container. In the final implementation, the same explanation opens inside the viewport with a stable right margin and remains visible above the following section.

## Focused region review

- Horizontal boundary: passed — the panel is clamped to a 12 px viewport margin.
- Vertical boundary: passed — the panel selects above or below based on available space and caps its height to the viewport.
- Overflow containers: passed — the panel is rendered at the document body, so table scrolling and card overflow cannot clip it.
- Transformed cards: passed — card hover transforms no longer redefine the panel's fixed-position coordinate space.
- Mobile: passed — confidence details use a contained bottom sheet; update notices use the same viewport-safe positioning.
- Visual fidelity: passed — existing color tokens, typography, spacing, borders, radii, and copy remain unchanged.

## Interaction QA

- Clicking outside an open panel closes it.
- Escape closes the panel and returns focus to its trigger.
- Opening another confidence panel closes the previous one.
- Resize and scroll recalculate desktop placement.
- Browser console warnings/errors: none.

## Comparison history

1. `07-compare-overflow-before.png`: blocked by right-edge and vertical clipping.
2. `08-compare-overflow-after.png`: table placement improved, but transformed target cards still created an incorrect fixed-position context.
3. `09-target-popover-after.png`, `10-update-notice-after.png`, `11-mobile-portal-after.png`, and `13-compare-portal-final.png`: all required surfaces contained within the viewport.

final result: passed
