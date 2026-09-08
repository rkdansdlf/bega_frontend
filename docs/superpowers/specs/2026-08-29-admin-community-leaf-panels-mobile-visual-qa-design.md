# Admin Community Leaf Panels Mobile Visual QA Design

Date: 2026-08-29
Status: Approved execution slice of the global 100% mobile Visual QA plan

## Scope

Add direct mobile contracts for exactly these three production exports:

- `MatesAdminPanel`
- `PostsAdminPanel`
- `UsersAdminPanel`

The existing `AdminCommunityRuntime` evidence remains valid indirect evidence. This slice adds direct component evidence and must not change API, authorization, deletion eligibility, role semantics, or baseball-data sources.

## Production UI contract

- Each panel owns a bounded `min-w-0 max-w-full` root and a stable root test id.
- Tables retain internal horizontal scrolling and default to the existing `min-w-[860px]` table width when no caller override is supplied.
- Each table and interactive control has an accessible name.
- Icon-only delete controls have a 44px mobile hit target, a stable test id, and a specific Korean accessible label.
- Delete-dialog cancel and confirm controls have stable test ids and 44px mobile hit targets.
- Posts preserve the full source content in `title` when the visible value is shortened.
- Mates preserve the full source title in `title` when pressure fixtures are shown.
- Users loading is exposed as a polite busy status. Search and role selects have explicit accessible labels.
- Existing delete/role authorization behavior is recorded as-is and is not changed.

## Exact state matrix

All captures use a 320x844 viewport, a fresh page, and expanded tall-flow capture. Default states capture the component root; interaction and dialog states capture `body` so the portal remains in evidence.

### MatesAdminPanel: 18

- Default data states: `empty`, `single`, `populated`, `boundary-minimum`, `boundary-maximum`, `long-korean`, `unbroken-token`, `maximum-supported` (8)
- On `maximum-supported`: `hover`, `focus-visible`, and `pressed` for table delete, dialog cancel, and dialog confirm (9)
- Real delete click with the dialog held open (1)

The populated fixture covers every known status plus the unknown-status fallback. Maximum inventory is 50 rows.

### PostsAdminPanel: 18

- Default data states: `empty`, `single`, `null-optional`, `boundary-minimum`, `boundary-maximum`, `long-korean`, `unbroken-token`, `maximum-supported` (8)
- On `maximum-supported`: `hover`, `focus-visible`, and `pressed` for table delete, dialog cancel, and dialog confirm (9)
- Real delete click with the dialog held open (1)

Dates use a fixed value old enough to render a deterministic calendar date. Maximum inventory is 50 rows.

### UsersAdminPanel: 31

- Idle defaults: eight data states above x `admin` and `super-admin` permissions (16)
- Canonical `empty/admin/loading` system state (1)
- On `maximum-supported/super-admin/idle`: hover for delete, dialog cancel, dialog confirm (3); focus-visible for search, role select, delete, dialog cancel, dialog confirm (5); pressed for delete, dialog cancel, dialog confirm (3); search input (1); role-select change (1); real delete click with dialog held open (1)

Maximum inventory is 50 rows. Fixtures cover all roles, nullable favorite team, current-user and super-admin restrictions, and large numeric values without changing their policy.

Total: exactly 67 direct scenarios.

## Evidence and failure policy

- The adapter rejects every undeclared data/permission/system/interaction/target tuple.
- Catalog tests assert the exact 67 IDs, inventory bounds, target bindings, and absence of duplicates.
- Component tests cover bounded roots, accessible names, hit targets, status semantics, pressure-value preservation, and existing restricted actions.
- Final Chromium evidence must be 67/67 pass, attempt 1, with unique IDs, unique screenshot paths, nonzero PNGs, hashes, and no missing/stale catalog entries.
- Any initial failed or recovered evidence is discarded after a regression test and fresh recapture.
- Strict global completeness is expected to remain nonzero; this slice may only reduce pending exports by exactly three.

## Expected generated totals

Starting from `427/1,010` registered and `583` pending:

- registered: `430/1,010`
- pending: `580`
- direct scenarios: `70,430`
- valid scenarios: `71,433`

Generated contracts, not hand-edited counters, are authoritative.
