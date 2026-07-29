# Mobile UI Design QA

## Comparison setup

- Reference state: existing production UI screenshots captured before implementation.
- Implementation state: local Vite preview after the mobile optimization pass.
- Viewport: 390 × 844 CSS pixels at browser device density.
- Reference files:
  - `web/audit/mobile-ui/01-home-top-390x844.png`
  - `web/audit/mobile-ui/02-score-chart-390x844.png`
  - `web/audit/mobile-ui/03-basket-390x844.png`
  - `web/audit/mobile-ui/05-explorer-search-390x844.png`
- Implementation files:
  - `web/audit/mobile-ui/implementation-01-top-390x844.png`
  - `web/audit/mobile-ui/implementation-02-search-cards-390x844.png`
  - `web/audit/mobile-ui/implementation-03-basket-collapsed-390x844.png`
  - `web/audit/mobile-ui/implementation-04-basket-details-390x844.png`
  - `web/audit/mobile-ui/implementation-05-chart-390x844.png`

## Full-view and focused comparison

- Header: the original 365px-tall mobile header was reduced to 172px while preserving the indigo gradient, status row, and disclaimer content. The full disclaimer remains available through a native disclosure control.
- Main flow: the page now follows input → department search → target comparison. The explorer begins around 761px instead of below the comparison section.
- Explorer: the compressed six-column table is replaced below 768px with readable department cards. University filters remain a single horizontal strip and the search controls stay within reach while scrolling the section.
- Basket: comparison scores remain immediately visible. History and analysis are closed by default and expand through a 48px disclosure target.
- Chart: the chart is no longer rendered on first load. Its header stacks on mobile, its metric selector spans the available width, and all Y-axis labels remain inside the card.
- Fixed action: `지망 보기 (N)` stays visible and reflects target-count changes after add/remove actions.

## Interaction and accessibility checks

- Verified search → target add → fixed target link → details disclosure → chart open.
- Verified all visible buttons, links, summaries, and selects are at least 44px in both dimensions at 390px width.
- Verified focus-visible treatment, reduced-motion handling, semantic labels, and native disclosure/select behavior.
- Verified no horizontal document overflow at 390px or 1280px.
- Verified desktop retains the two-column spec/results layout and the department data table.
- Browser console: no errors or warnings during the tested journey.

## QA fixes made

- P1 responsiveness: grid min-content sizing expanded the mobile document to 527px. Fixed with `minmax(0, 1fr)` and explicit child width constraints; rechecked at 390px.
- P1 chart fidelity: negative left chart margin clipped Y-axis labels. Replaced it with a positive margin and explicit 54px Y-axis width.
- P2 focus styling: the global focus ring created an extra inner rectangle on borderless search inputs. Suppressed the inner ring while retaining the parent `focus-within` indication.
- P2 mobile density: collapsed secondary analysis and history content while keeping headline scores and chart access visible.

## Remaining findings

- P0: none.
- P1: none.
- P2: none.

final result: passed
