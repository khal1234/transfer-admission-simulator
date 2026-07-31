# 헤더 안내 영역 75% 폭 배분 Design QA

## Comparison setup

- Source visual truth: `/var/folders/hw/cc0kzpsj13q8f9_zhcs6bzrc0000gn/T/codex-clipboard-6cfde9c0-b35b-4e3b-8dc8-fe7f7a866f63.png`
- Browser-rendered implementation:
  - `web/audit/header-panel-width/02-after-2048.png`
  - `web/audit/header-panel-width/04-open-1440.png`
  - `web/audit/header-panel-width/05-open-1024.png`
  - `web/audit/header-panel-width/06-final-1440.png`
- Combined comparison evidence: `web/audit/header-panel-width/comparison-source-after.png`
- CSS viewport: 2048 × 800 at `devicePixelRatio: 1`; responsive checks at 1440 × 1000 and 1024 × 900
- Source pixels: 2048 × 438; supplied header crop, density metadata unavailable
- Implementation pixels: 2048 × 800, 1440 × 1000, and 1024 × 900
- Theme/state: dark theme; admission links checked in both closed and open states

## Full-view comparison evidence

- The warning and admission-link panels now occupy 74.9% of the usable header content width at 2048 px, matching the requested three-quarter allocation.
- The right-side theme and university status controls receive the remaining quarter and stay right-aligned.
- The title, description, colors, borders, typography, and vertical order remain unchanged.

## Focused comparison evidence

- The supplied source is already a focused header crop, so a second component crop was unnecessary.
- `web/audit/header-panel-width/comparison-source-after.png` places the supplied header and the revised browser-rendered header in one image.
- Before the fix, both panels occupied 87.6% of the outer header width and almost 92% of its usable content width.
- After the fix, both panels share the same 1229 px width inside a 1640 px content area at the 2048 px viewport.

## Required fidelity surfaces

- Fonts and typography: Existing family, weights, sizes, line heights, wrapping, and hierarchy are preserved; the narrower allocation wraps only the warning copy naturally.
- Spacing and layout rhythm: Desktop header content is divided 75% / 25%. Both panels retain matching edges, 10 px separation, padding, and radii.
- Colors and visual tokens: Existing indigo header, amber warning, emerald links, and muted text tokens are unchanged.
- Image quality and asset fidelity: No raster, logo, or icon assets were added or replaced.
- Copy and content: All title, warning, link, theme, and status copy remains unchanged.

## Interaction and responsive checks

- Opened and closed `편입학 홈페이지 확인`; all nine links remain visible.
- At 1440 px the closed header is balanced and has no document overflow.
- At 1024 px the 75% allocation remains active, the open links panel has no internal overflow, and the document width remains 1024 px.
- Mobile behavior below 900 px is unchanged.
- Browser console: no warnings or application errors.
- Automated validation: 153 tests passed; lint and production build passed.

## Findings

- P0: none.
- P1: none.
- P2: none after the width allocation fix.
- P3: none required for the requested scope.

## Comparison history

- Pass 1: P2 proportion issue — the two informational panels consumed nearly all available header width, leaving the right-side status area visually cramped.
- Fix: assigned the title/information block 75% and the action/status block 25% at PC widths of 900 px and above.
- Pass 2: passed — measured content ratios are 74.9% at 2048 px and 74.8% at 1024 px, with aligned panel edges and no overflow in closed or open states.

## Follow-up polish

- None required for this scope.

final result: passed
