# 연도별 합격선 차이값 간격 Design QA

## Comparison setup

- Source visual truth: `/var/folders/hw/cc0kzpsj13q8f9_zhcs6bzrc0000gn/T/codex-clipboard-fa2c9744-d179-417f-ad01-74c3b7829247.png`
- Browser-rendered implementation: `web/audit/number-column-recheck/02-aligned.png`
- Combined comparison evidence: `web/audit/number-column-recheck/comparison-before-after.png`
- CSS viewport: 1440 × 1000 at `devicePixelRatio: 1`
- Source pixels: 1512 × 618; supplied component crop, density metadata unavailable
- Implementation pixels: 1440 × 1000; before/after comparison normalized to two 720 × 500 panels
- Theme/state: dark theme, latest-year basis, collapsed target cards; 부산대 and 강원대 cards shown after the fix

## Full-view comparison evidence

- The existing basket layout, typography, colors, card borders, progress bars, and actions remain unchanged.
- The large headline difference and the year-by-year red/green difference values now sit directly beside their corresponding score content.
- A second department card was added through the visible `지망 추가` control to verify that the shared rule applies across departments.

## Focused comparison evidence

- `web/audit/number-column-recheck/comparison-before-after.png` places the browser-rendered pre-fix and revised PC screens in one image.
- Before the change, the measured gap between each score pair and its difference value was 245–286 px.
- After the change, the measured gap is consistently 8 px for every row with a published comparison in both rendered cards.
- The headline difference gap is now 10 px on both tested cards, down from visible gaps of 64 px and 36 px.
- All published yearly differences share one aligned grid column, including rows without the `기준` badge.

## Required fidelity surfaces

- Fonts and typography: Existing font family, weights, sizes, line heights, tabular numerals, and semantic red/green emphasis are preserved.
- Spacing and layout rhythm: The automatic year-difference margin is removed, the headline summary uses content-sized PC columns, and yearly values share a subgrid column. Existing 8–10 px gaps are reused.
- Colors and visual tokens: Existing `--status-risk` and `--status-safe` colors remain unchanged.
- Image quality and asset fidelity: No image or icon assets were added or replaced.
- Copy and content: All score, year, basis, and department text remains unchanged.

## Interaction and responsive checks

- Added a second department with the normal `지망 추가` control and confirmed the spacing rule on both cards.
- Confirmed the 1440 px page has no horizontal overflow (`scrollWidth === innerWidth`).
- Confirmed both cards fit at the 1024 px PC viewport with no card or document overflow.
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
- Pass 3: a browser recheck found the large headline difference still visually detached and the first yearly value offset by the `기준` badge. The PC summary now uses content-sized columns and the yearly rows share aligned subgrid tracks. Post-fix evidence shows 10 px headline gaps, 8 px yearly gaps, and identical yearly difference x-positions.

## Follow-up polish

- None required for this scope.

final result: passed
