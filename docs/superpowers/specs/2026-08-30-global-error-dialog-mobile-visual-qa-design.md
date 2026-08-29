# Global Error Dialog Mobile Visual QA Design

Date: 2026-08-30
Status: approved as the next slice of the repository-wide mobile Visual QA plan

## Scope

Register and prove:

- `src/components/GlobalErrorDialog.tsx#GlobalErrorDialog`
- `src/components/GlobalErrorDialogContent.tsx#GlobalErrorDialogContent`
- hosted lazy binding `src/components/GlobalErrorDialog.tsx#LazyGlobalErrorDialogContent`

Preserve `AppQueryProvider`, `ErrorFeedbackPanel`, `PlainDialog`, authentication, API payloads, and all previously registered state IDs and reports. Visual QA feedback and retry fixtures are static and must never perform a real network request.

## Root matrix: exactly 22

Eight data/default states, all using a resolved Content child, `source=api`, `status=400`, retry present, and an idle transport:

1. `empty`
2. `populated`
3. `null-optional`
4. `boundary-minimum`
5. `boundary-maximum`
6. `long-korean`
7. `unbroken-token`
8. `maximum-supported`

Fourteen canonical/lifecycle states:

1. `idle-no-event`
2. `content-loading-fallback`
3. `status-null`
4. `status-404`
5. `status-409`
6. `status-500`
7. `source-runtime`
8. `source-unhandled-rejection`
9. `retry-missing`
10. `ignored-invalid-author`
11. `ignored-cancelled-request`
12. `ignored-home-endpoint`
13. `cypress-suppressed`
14. `latest-event-wins`

Root interaction axes are `notApplicable`. Root owns event/listener/lazy/coordination behavior; Content owns visible controls.

## Content matrix: exactly 35

Eight data/default states:

1. `empty`
2. `populated`
3. `null-optional`
4. `boundary-minimum`
5. `boundary-maximum`
6. `long-korean`
7. `unbroken-token`
8. `maximum-supported`

Eight canonical states:

1. `closed`
2. `status-null`
3. `status-404`
4. `status-409`
5. `status-500`
6. `source-runtime`
7. `source-unhandled-rejection`
8. `retry-missing`

Nineteen interaction/transport states:

- hover `4`: close, confirm, retry, feedback submit
- focus-visible `5`: close, textarea, retry, feedback submit, confirm
- pressed `4`: close, confirm, retry, feedback submit
- input `1`: feedback textarea
- selected/result `2`: online feedback success, offline feedback failure
- submitting `2`: retry timeout, feedback timeout
- keyboard navigation `1`: confirm then Tab wraps to the close button

Portal scenarios capture `document.body`. Every input/mutation state has an exact result selector and callback/submission count evidence that remains valid after viewport expansion without replay.

## Hosted lazy binding

Register `LazyGlobalErrorDialogContent` with all axes and variants `notApplicable`, linked to exactly 16 resolved root scenario IDs:

- data/default `8`
- status null/404/409/500 `4`
- source runtime/unhandled rejection `2`
- retry missing `1`
- latest event wins `1`

Idle, fallback, ignored events, and Cypress suppression do not render a resolved child and are excluded. The hosted entry increases registered components by one and adds zero valid combinations.

## Legal combination constraints

- Permission is `notApplicable`; do not multiply anonymous/user/admin.
- Status equivalence classes are null, ordinary 4xx, 404, 409, and 5xx.
- Source classes api/runtime/unhandled are retained because feedback action codes differ.
- Retry transport applies only when retry exists.
- Feedback transport applies only after submission; do not multiply it across default/hover/focus/pressed/input.
- Online/offline are observable success/error results. Timeout is an observable busy state.

## Production and mobile contract

- Root lazy loading exposes a visible named busy status rather than `null`.
- Dialog title, message, error ID, and unbroken tokens remain bounded and readable at 320px.
- Header/body/footer scroll independently as provided by `PlainDialog`; lower feedback controls remain reachable.
- Close, confirm, retry, and feedback submit targets meet 44px.
- Confirm-to-close focus wrap is verified with an external body focus sentinel, close-button identity, `dialog.contains(activeElement)`, and a post-expansion result verifier.
- Closing restores body scroll lock.
- Do not modify shared `PlainDialog` or `ErrorFeedbackPanel` unless an independently proven blocker makes it unavoidable.
- Do not generate new global CSS selectors or Tailwind utilities. Current nominal CSS headroom is only 35 bytes; use existing emitted utilities, ARIA/test IDs, or owned inline styles.

## Root coordination and duplicate-call contract

Actual mounted StrictMode/browser tests prove:

- one effective `global-api-error` listener after replay/rerender
- no response after unmount
- A then B displays only B
- each ignored event leaves the dialog closed and does not block a following valid event
- Cypress suppression remains closed
- close button, backdrop, Escape, and confirm each close exactly once in isolated action tests
- retry closes first and invokes the original callback exactly once for resolve, reject, timeout, and rapid duplicate click
- feedback success, failure, timeout, and rapid duplicate click submit exactly once through an injected static submitter
- source-specific feedback action code is exact for api/runtime/unhandled rejection
- 320x844 to 390x1000 expansion is read-only and does not increase callback/submission counts
- injected static submitter means production reporter/API calls remain zero

Reciprocal callback miswires and listener duplication must make tests RED; aggregate-only callback totals are insufficient.

## Fail-closed Visual QA seams

Production behavior remains the default. A non-production state/renderer seam may drive root events, lazy fallback, and static feedback results, but it must be unavailable or inert in production and fail closed for missing renderers, malformed fixtures, or missing result selectors.

Static fixture text uses `MOCK`; URLs, if needed, use `example.invalid`. No external baseball data, API, crawling, scraping, or web-search repair is allowed.

## Evidence and integrity

Produce fresh 320x844, `fresh`, `expand-tall-flow` evidence:

- Root `22/22`
- Content `35/35`
- failed/recovered `0/0`
- every attempt `1`
- unique scenario IDs, screenshot paths, nonzero PNG files, and actual SHA-256 values
- every interaction verified, captureVerified, viewportExpanded, and revalidated

Reports:

- `reports/visual-qa-global-error-dialog-mobile.json`
- `reports/visual-qa-global-error-dialog-content-mobile.json`

Record report SHA and reproducible PNG aggregate SHA with the repository-standard `find -print0 | sort -z | shasum` formula.

## Coverage arithmetic

Starting from registered `437/1,010`, pending `573`, direct `70,576`, valid `71,579`:

- registered: `440/1,010`
- pending: `570`
- direct: `70,633`
- valid: `71,636`

The two direct exports add 57 states. The hosted binding adds one registered component and zero valid combinations.

## Review

One implementer owns the slice. A separate read-only reviewer checks listener ownership, mutation-resistant isolated callbacks, network isolation, focus/scroll behavior, exact matrices and hosted IDs, evidence integrity, CSS budget, scope, and Priority 0 compliance. Critical or Important findings return to the original implementer.
