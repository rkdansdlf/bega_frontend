# Admin Offseason Results and Dialogs Direct Mobile Visual QA Design

Date: 2026-08-30
Status: approved as the next slice of the repository-wide mobile Visual QA plan

## Scope

Register and prove the two remaining direct exports in the admin offseason movement subtree:

- `src/components/admin/OffseasonMovementAdminResultsRuntime.tsx#OffseasonMovementAdminResultsRuntime`
- `src/components/admin/OffseasonMovementAdminDialogs.tsx#OffseasonMovementAdminDialogs`

The existing Content-hosted bindings (`43/42/11`) and root `44` scenarios remain unchanged. No API, authentication, payload, callback, coordinator, baseball-data, or shared dialog primitive contract may change.

## State matrix

### Results Runtime: exactly 25

Eight data defaults, all in the idle results phase:

1. `empty`
2. `populated`
3. `null-optional`
4. `boundary-minimum`
5. `boundary-maximum`
6. `long-korean`
7. `unbroken-token`
8. `maximum-supported`

Eight canonical/lifecycle states:

1. `loading`
2. `filtered-empty`
3. `csv-success`
4. `csv-single-error`
5. `csv-many-errors`
6. `csv-boundary-maximum`
7. `csv-pressure`
8. `csv-success-loading`

Nine interaction states, based on the maximum-supported row:

- hover: source link, edit, delete
- focus: source link, edit, delete
- pressed: source link, edit, delete

### Dialogs: exactly 41

Thirteen default/canonical states:

- data defaults `8`: create dialog with `empty`, `populated`, `null-optional`, `boundary-minimum`, `boundary-maximum`, `long-korean`, `unbroken-token`, `maximum-supported`
- canonical `5`: edit dialog, delete dialog, create submitting, edit submitting, delete submitting

Twenty-eight interaction states:

- hover `6`: create close, create cancel, create submit, delete close, delete cancel, delete confirm
- focus `10`: movement date, section, team, player name, summary, details, contract term, source URL, create submit, delete confirm
- pressed `6`: the same six create/delete actions used by hover
- input `3`: player name, summary, source URL
- change `2`: section to `기타`, team to `LG`
- keyboard navigation `1`: create-dialog focus loop

Portal scenarios capture `document.body`. Native select changes use the generic one-shot `select-option` action and exact `option[value]:checked` plus callback evidence. Input states use exact value plus callback evidence.

## Production and mobile contract

- Results remains horizontally scrollable only around the 1120px table canvas; loading, empty, and CSV report states remain bounded and visible at 320px.
- Long labels, URLs, CSV errors, badges, and names expose a title where truncation occurs and use bounded wrapping/clamping.
- Source, edit, delete, dialog close/cancel/submit/delete, and interactive form controls meet the 44px touch contract.
- Dialog content reflows at 320px, keeps the lower fields reachable, keeps body scrolling bounded, and preserves portal focus behavior.
- Shared `PlainDialog` is not modified for this slice.

## Controlled callbacks and fail-closed adapters

Both direct adapters use only static `MOCK`/`example.invalid` fixtures and are stateful where controlled values change. They fail closed for missing renderer/fixture/action contracts.

Actual mounted-component tests must prove:

- Results edit/delete callbacks receive the exact selected movement once; source-link interaction does not invoke either callback.
- Dialog input/select handlers forward the exact field and value once; unrelated callbacks remain at zero.
- create/edit submit, cancel/close, delete cancel/close, and delete confirm reach the correct callback exactly once when invoked by behavioral tests.
- viewport expansion is read-only and does not replay any mutation callback.

Static source regex and manifest self-assertions may be auxiliary only; they are not sufficient behavior evidence.

## Evidence and integrity

Produce fresh 320x844, `fresh`, `expand-tall-flow` evidence:

- Results: `25/25`
- Dialogs: `41/41`
- failed/recovered: `0/0`
- every attempt: `1`
- unique scenario IDs, screenshot paths, nonzero PNG files, and actual SHA-256 values
- every interaction marked verified, captureVerified, viewportExpanded, and revalidated

Record the report SHA and a reproducible PNG aggregate SHA using:

```bash
(find <directory> -type f -name '*.png' -print0 | sort -z | xargs -0 shasum -a 256) | shasum -a 256
```

## Coverage arithmetic

Starting from registered `435/1,010`, pending `575`, direct `70,510`, valid `71,513`:

- registered: `437/1,010`
- pending: `573`
- direct: `70,576`
- valid: `71,579`

The two direct registrations add 66 executable states. Existing hosted/root counts do not change. Generated contracts remain authoritative.

## Verification and review

Use TDD for adapters, behavior, interaction plans, and mobile contracts. Re-run focused admin/coordinator regressions, state generation, harness, isolation/import/audit/reflow, TypeScript, production build, budgets, Priority 0 policy, and diff checks. Concurrent unrelated inventory changes must be preserved and reported separately.

One implementer owns the slice. A separate read-only reviewer checks exact matrices, actual callback identity/count, portal/mobile behavior, evidence integrity, count arithmetic, scope, and policy. Critical or Important findings return to the original implementer.
