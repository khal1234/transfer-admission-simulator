# 연도별 합격선 차이값 간격 Design QA

## Comparison setup

- Source visual truth: `/var/folders/hw/cc0kzpsj13q8f9_zhcs6bzrc0000gn/T/codex-clipboard-fa2c9744-d179-417f-ad01-74c3b7829247.png`
- Browser-rendered implementation: `web/audit/year-diff-spacing/after-multi-1440.png`
- Combined comparison evidence: `web/audit/year-diff-spacing/comparison-source-after.png`
- CSS viewport: 1440 × 1000 at `devicePixelRatio: 1`
- Source pixels: 1512 × 618; supplied component crop, density metadata unavailable
- Implementation pixels: 1440 × 1000; focused comparison crop normalized to 1512 × 335
- Theme/state: dark theme, latest-year basis, collapsed target cards; 부산대 and 강원대 cards shown after the fix

## Full-view comparison evidence

- The existing basket layout, typography, colors, card borders, progress bars, and actions remain unchanged.
- The requested change is isolated to the year-by-year red/green difference values: they now sit directly beside the corresponding score pair instead of being pushed to the card's far edge.
- A second department card was added through the visible `지망 추가` control to verify that the shared rule applies across departments.

## Focused comparison evidence

- `web/audit/year-diff-spacing/comparison-source-after.png` places the supplied source crop and the revised basket region in one image.
- Before the change, the measured gap between each score pair and its difference value was 245–286 px.
- After the change, the measured gap is consistently 8 px for every row with a published comparison in both rendered cards.

## Required fidelity surfaces

- Fonts and typography: Existing font family, weights, sizes, line heights, tabular numerals, and semantic red/green emphasis are preserved.
- Spacing and layout rhythm: Only the automatic left margin on `.compare-year-diff` changed. A 48 px minimum width keeps signs and decimal values readable while the parent 8 px gap supplies consistent spacing.
- Colors and visual tokens: Existing `--status-risk` and `--status-safe` colors remain unchanged.
- Image quality and asset fidelity: No image or icon assets were added or replaced.
- Copy and content: All score, year, basis, and department text remains unchanged.

## Interaction and responsive checks

- Added a second department with the normal `지망 추가` control and confirmed the spacing rule on both cards.
- Confirmed the 1440 px page has no horizontal overflow (`scrollWidth === innerWidth`).
- Browser console checked after HMR; no application errors were introduced.
- Automated validation: 153 tests passed; lint and production build passed.

## Findings

- P0: none.
- P1: none.
- P2: none after the spacing fix.
- P3: none required for the requested scope.

## Comparison history

- Pass 1: P2 spacing issue — the year difference values were visually detached from their score pairs by 245–286 px because `margin-left: auto` consumed the remaining row width.
- Fix: replaced the automatic margin with the existing 8 px flex gap, added a 48 px minimum width, and right-aligned the values.
- Pass 2: passed — published year rows in both tested department cards measure an 8 px score-to-difference gap, with no overflow or neighboring layout regression.

## Follow-up polish

- None required for this scope.

final result: passed
