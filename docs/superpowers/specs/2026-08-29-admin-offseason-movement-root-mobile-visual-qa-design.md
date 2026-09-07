# Admin Offseason Movement Root Mobile Visual QA Design

Date: 2026-08-29
Status: Approved execution slice of the global 100% mobile Visual QA plan

## Scope

Directly register:

- `src/components/admin/OffseasonMovementAdminPanel.tsx#OffseasonMovementAdminPanel`

Register as hosted only when the final root evidence renders the exact production lazy child:

- `src/components/admin/OffseasonMovementAdminPanel.tsx#OffseasonMovementAdminPanelContent`
- `src/components/admin/OffseasonMovementAdminPanelContent.tsx#OffseasonMovementAdminResultsRuntime`
- `src/components/admin/OffseasonMovementAdminPanelContent.tsx#OffseasonMovementAdminDialogs`

Do not register `AdminModerationRuntime.tsx#OffseasonMovementAdminPanel`; its current shell adapter renders a synthetic override instead of this production lazy binding. The three standalone module exports for Content, Results, and Dialogs remain pending until their later direct contracts.

## Baseball-data guard

- Visual fixtures are static internal values explicitly labeled non-production Visual QA data.
- No external baseball API, crawling, scraping, browser lookup, web-search repair, or synthesized factual fallback is allowed.
- Existing internal database/API paths remain the only production source.
- A real missing or inconsistent movement record must retain the `MANUAL_BASEBALL_DATA_REQUIRED` operator contract with entity/date/fields/import path rather than automatic repair.

## Production behavior contract

### Request coordination

- The active mount path makes at most one initial list request for an identical normalized filter key, including React Strict Mode effect replay.
- Concurrent requests with the same key share one in-flight promise.
- Requests with different keys may overlap, but only the newest request may update rows, error, and loading state.
- Completion or failure removes the in-flight entry so a later explicit refresh can request again.
- Deactivation invalidates stale responses without introducing a request.
- Reset, apply, and refresh use the same normalized request coordinator.

### Mutation coordination

- A synchronous in-flight guard prevents rapid duplicate create, update, delete, and whole-file CSV import actions before React state catches up.
- One successful create/update/delete triggers exactly one list refresh.
- A successful CSV import triggers exactly one list refresh after its intentionally sequential row mutations.
- CSV row mutations are not guessed, merged, or deduplicated; their existing operator-provided row semantics remain unchanged.
- Delete confirmation is disabled while submitting.

### Deterministic Visual QA seam

- A non-production-only root override supplies static rows and lifecycle presets while `active=true` and prevents every real API call.
- Production mode ignores the override and follows the existing internal API path.
- The override may deterministically hold filter, dialog, submission, message, CSV, and lazy-boundary states without changing production callbacks or data contracts.
- Production-isolation tests must prove the seam is absent from the production path/bundle contract.

## Mobile and accessibility contract

- The root owns `min-w-0 max-w-full`, a stable capture id, mobile-safe padding, and wrapping header/action groups.
- Search, section/team/quality filters, dates, CSV input, dialog fields, and icon-only row actions have explicit accessible names and stable test ids.
- Loading and success are polite status surfaces; failures are alerts.
- The results table owns a descriptive name and internal horizontal scrolling with a stable minimum width.
- Long player, source, contract, CSV filename/error, summary, and details values remain compact at 320px while preserving their full source value in an accessible/title surface.
- Existing shared Button hit targets remain at least 44px on mobile.
- Dialog portals, footers, focus loops, submitting states, and close behavior remain visible without clipping.

## Exact state matrix: 44 direct scenarios

All scenarios use `permissions=admin`, `variant.theme=dark`, viewport 320x844, fresh page, and expanded tall-flow capture.

### Default data states: 8

At `system=idle`, `interactions=default`:

- `empty`
- `populated`
- `null-optional`
- `boundary-minimum`
- `boundary-maximum`
- `long-korean`
- `unbroken-token`
- `maximum-supported`

Maximum Visual QA inventory is 50 static rows.

### Canonical lifecycle/lazy states: 16

At the canonical data fixture and `interactions=default`:

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
- `content-fallback`
- `results-fallback`
- `dialogs-fallback`

### Representative real interactions: 20

At `data=maximum-supported`, `system=idle`:

- hover: refresh, quality filter, row edit, row delete (4)
- focus-visible: search, section, team, from date, to date, create, dialog field (7)
- pressed: apply, reset, create, delete confirm (4)
- input: search, dialog summary (2)
- change: team filter, dialog section (2)
- keyboard navigation: real dialog focus loop (1)

Dialog targets use real setup clicks and capture `body` so the portal is part of the evidence. Every undeclared data/system/interaction/target tuple fails closed.

## Test and evidence policy

- Start with focused RED tests for request single-flight/latest-wins/retry/deactivation, duplicate mutations, one refresh per success, production no-override behavior, mobile/a11y hooks, exact 44 catalog states, and hosted-child mapping.
- Browser-found defects invalidate the entire current report. Add a focused RED regression before fixing and capture all 44 states fresh.
- Final report must be 44/44 pass, failed/recovered 0, every attempt 1, unique IDs and paths, nonzero PNG/SHA, and missing/stale 0.
- Inspect empty, loading, error, CSV errors, pressure, 50-row maximum, quality-empty, all three dialog modes, submitting, interactions, and all lazy fallbacks.
- Strict global completeness remains closed while any unrelated component is pending.

## Expected generated totals

Starting from `430/1,010` registered, `580` pending, direct `70,430`, valid `71,433`:

- registered: `434/1,010`
- pending: `576`
- direct scenarios: `70,474`
- valid scenarios: `71,477`

Generated contracts are authoritative; stop if they differ.
