# Client Error Trend Chart Mobile Visual QA Design

## Goal

Make `ClientErrorTrendChart` independently verifiable at 320px and register every legal component-local data/system state without changing API, authorization, parent orchestration, or baseball-data behavior.

## Current problems

- The fixed 720×260 SVG shrinks to the parent width, making 12px labels roughly 5px at 320px.
- Rounded low-value ticks can repeat, producing duplicate React keys and overlapping grid lines.
- Repeated bucket labels produce duplicate point and x-axis keys.
- Long Korean, unbroken, and maximum-point labels overlap.
- Loading and empty branches lack direct status semantics; the populated SVG lacks an accessible chart name.
- There is no stable direct capture root.

## Production design

- Add a stable chart root and a bounded horizontal scroll owner. Keep the chart canvas at a readable minimum width instead of scaling all text below legibility on narrow screens.
- Preserve the full labels in accessible/title content, but sample the visible x-axis labels to a bounded count and truncate only their painted text.
- Deduplicate rounded tick values before rendering and use index-safe keys for repeated labels.
- Add `role="status"` and an appropriate busy state to loading/empty output.
- Add `role="img"` plus a deterministic Korean accessible summary to the populated SVG.
- Keep the existing three series, colors, values, and parent props unchanged.

No Visual-QA-only production state prop is allowed.

## Direct state contract

Adapter: `admin.client-error-trend-chart`

Data values (8):

- `empty`
- `single`
- `boundary-minimum`
- `boundary-maximum`
- `long-korean`
- `unbroken-token`
- `maximum-supported`
- `zero`

System values:

- `idle` for all eight data values
- `loading` only with canonical `empty`

Permissions and interactions are explicitly not applicable. The only component-local variant is `theme=dark`, matching the administrator surface. This produces exactly 9 direct scenarios.

Maximum-supported contains 20 deterministic points. Boundary and pressure fixtures are internal/static and contain no synthesized external baseball facts.

## Mobile and accessibility assertions

- document/root width stays within 320px;
- the chart owns horizontal scrolling and the page does not;
- painted labels are bounded while full labels remain discoverable;
- all SVG keys are stable for duplicate labels and low maximum values;
- loading and empty states are announced;
- populated output has an accessible chart name and series summary;
- no content is clipped outside the owning scroll surface.

## Expected contract delta

Starting from the authoritative hosted-reconciliation baseline:

- registered: `426 -> 427`
- pending: `584 -> 583`
- direct scenarios: `70,354 -> 70,363`
- valid combinations: `71,357 -> 71,366`
- inventory total: unchanged at 2,101 symbols

The generators are authoritative; documentation must record measured values.

## Evidence and completion

- Focused component tests and adapter/catalog tests must demonstrate genuine RED then GREEN.
- The 9 current generated IDs must run in fresh-page bundled Chromium at 320×844 with screenshots.
- Report/catalog/PNG identity, nonzero files, first-attempt status, layout, semantics, and representative pixels must be checked.
- Static state/inventory/contract, TypeScript, production isolation/import graph, build budgets, diff check, and baseball-data policy must pass before completion.
- An independent read-only reviewer must approve the implementation and evidence.
- Global completeness remains closed while 583 entries are pending.

