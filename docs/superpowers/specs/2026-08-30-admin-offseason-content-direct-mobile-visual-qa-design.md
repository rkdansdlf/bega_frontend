# Admin Offseason Content Direct Mobile Visual QA Design

Date: 2026-08-30
Status: Approved execution slice of the global 100% mobile Visual QA plan

## Scope

Directly register exactly:

- `src/components/admin/OffseasonMovementAdminPanelContent.tsx#OffseasonMovementAdminPanelContent`

The existing root contract proves the parent-file lazy binding, not this standalone module export. This slice does not directly register Results or Dialogs; their standalone contracts remain pending for the following slice.

The slice also corrects one root-evidence erratum without changing root scenario count: `dialog-section` change must perform a deterministic real select change and prove the selected result. The existing root report is discarded and all 44 root scenarios are recaptured after the correction.

## Why direct evidence is required

- The root host owns `overflow-x-clip`, so it can hide overflow owned by the standalone child.
- The standalone Content export has no direct capture identity or fail-closed prop/renderer contract today.
- Root-computed filters/counts do not prove independent controlled callback forwarding.
- Root `content-fallback` does not render Content.
- The current production Results Suspense fallback is an unnamed spinner and the Dialogs fallback is `null`; Visual QA override fallbacks do not prove those production semantics.

## Production UI contract

- Content owns a stable `admin-offseason-content` root with `min-w-0 max-w-full`.
- Production Results and Dialogs Suspense fallbacks are visible, named polite busy statuses; Dialogs fallback is rendered only when a dialog child is actually required.
- Empty Results is a bounded status outside the 1120px table canvas so it is visible in the initial 320px viewport.
- The table retains one clear internal horizontal scroller and a descriptive accessible name.
- Search/select/date/dialog controls and source/edit/delete actions keep explicit names, stable selectors, and self-contained 44px mobile targets.
- CSV filename/errors and row pressure values stay compact while preserving complete source values in title/accessibility surfaces.
- Optional controlled dialog values use empty strings rather than switching controlled state.
- Content/Results/Dialogs remain prop-only and make no API/axios/fetch/query/effect request.

## Exact Content matrix: 36

Common axes: `permissions=admin`, `system=idle`, `variant.theme=dark`, 320x844, fresh page, expanded tall-flow capture.

### Default data at preset idle: 8

- `empty`
- `populated`
- `null-optional`
- `boundary-minimum`
- `boundary-maximum`
- `long-korean`
- `unbroken-token`
- `maximum-supported`

### Canonical data with lifecycle/lazy presets: 15

At `data=populated`, `interactions=default`:

- `list-loading`
- `load-error`
- `success-message`
- `csv-importing`
- `csv-success`
- `csv-many-errors`
- `quality-filter-empty`
- `create-dialog`
- `edit-dialog`
- `delete-dialog`
- `create-submitting`
- `edit-submitting`
- `delete-submitting`
- `results-fallback`
- `dialogs-fallback`

`content-fallback` is illegal because Content cannot render its own parent fallback.

### Maximum data with direct interactions: 13

- hover: row edit, row delete (2)
- focus-visible: search, create, dialog summary field (3)
- pressed: apply, reset, delete confirm (3)
- input: search, dialog summary (2)
- change: team filter, dialog section (2)
- keyboard navigation: real dialog focus loop (1)

Portal states capture `body`; ordinary/fallback states capture the Content root. Maximum inventory is 50 static rows. Populated inventory is six rows covering each internal UI section label.

## Deterministic select-change contract

- Extend the harness with a real `select-option` action that calls the browser control operation once and verifies the exact selected value after viewport expansion.
- Content team change selects `LG`; dialog section change selects a declared non-initial section and requires its `:checked` result selector.
- The root `dialog-section` scenario uses the same result-verified action. Its 44 IDs remain unchanged, but the entire root report and PNG set are recaptured fresh.
- A change scenario without a value/result verifier fails closed.

## Fixtures and data policy

- Empty 0, populated 6, nullable/boundary/pressure 1, maximum 50.
- CSV success uses three rows; CSV pressure uses 50 rows and 12 errors while the UI shows five plus remainder copy.
- All fixtures use explicit `MOCK` non-production labels, fixed year-2000 dates, internal team constants, and `example.invalid`.
- No external baseball API, scraping, crawling, web-search repair, or guessed real player movement is permitted.
- Real missing/inconsistent data continues to require `MANUAL_BASEBALL_DATA_REQUIRED`.

## Fail-closed and regression policy

- Adapter accepts only the exact state/variant keys and 36 legal tuples; unknown values, extra axes, illegal presets, targets on defaults, wrong data/preset per interaction, and `content-fallback` throw.
- Resolved Results renderer is mandatory. Resolved Dialogs renderer is mandatory only while a dialog/delete target is mounted.
- Tests cover stable root, production fallback semantics, bounded empty state, source/row touch targets, callback value forwarding, controlled optional values, static/no-API imports, exact matrix/capture split, and root interaction erratum.
- Browser-found defects invalidate the entire affected report and require RED regression before fresh recapture.

## Evidence

- Content direct final: 36/36, failed/recovered 0, every attempt 1, unique IDs/paths, nonzero PNG/SHA, missing/stale 0.
- Root replacement final: 44/44 under the same conditions, with the dialog-section result verified after viewport expansion.
- Inspect empty, fallbacks, CSV pressure, long/unbroken, maximum 50, create/edit/delete/submitting, every direct interaction, and both changed selects.

## Expected totals

Starting from `434/1,010`, pending `576`, direct `70,474`, valid `71,477`:

- registered: `435/1,010`
- pending: `575`
- direct: `70,510`
- valid: `71,513`

The root erratum changes no counts. Generated contracts are authoritative.
