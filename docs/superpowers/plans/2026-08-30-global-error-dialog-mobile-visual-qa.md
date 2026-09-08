# Global Error Dialog Mobile Visual QA Plan

Date: 2026-08-30

## 1. Freeze contracts

- Preserve public runtime behavior, AppQueryProvider, ErrorFeedbackPanel, PlainDialog, API/auth payloads, and all previous Visual QA entries/reports.
- Fix Root `22`, Content `35`, and hosted resolved IDs `16` before implementation.
- Ban real feedback/retry network I/O and new global CSS generation.

## 2. TDD root coordination

- Add failing actual-mount tests for StrictMode listener replay, rerender, unmount, ignored events, latest wins, Cypress suppression, close paths, retry resolve/reject/timeout/double click, and resize without replay.
- Add a named production lazy fallback and the minimum non-production fail-closed renderer/state seam.
- Prove reciprocal callback/listener mutations RED.

## 3. TDD Content behavior and mobile layout

- Mount the actual portal with production CSS at 320x844.
- Isolate each close/confirm/retry/feedback action and verify intended callback/submission one, unrelated zero.
- Inject a static feedback submitter and prove production reporter/API calls zero.
- Verify long text/error ID containment, lower controls, 44px targets, body scroll restoration, and confirm-to-close focus wrapping with an outside sentinel.

## 4. Register exact states

- Register Root `8 data + 14 canonical = 22`.
- Register Content `8 data + 8 canonical + 19 interaction = 35`.
- Register hosted lazy binding with exactly 16 resolved Root IDs and zero valid combinations.
- Verify registered `440/1,010`, pending `570`, direct `70,633`, valid `71,636`.

## 5. Fresh evidence

- Warm up outside final evidence with screenshots disabled.
- Capture Root `22/22` and Content `35/35` at 320x844 with fresh/expand-tall-flow.
- Verify failed/recovered zero, attempts one, unique/nonzero/hash-complete artifacts, and all interaction verification flags.
- Record reproducible report and PNG aggregate hashes.

## 6. Regression and release gates

- Run focused GlobalError/AppQueryProvider/ErrorFeedbackPanel/PlainDialog tests plus existing admin/offseason coordinator regressions.
- Run contracts, inventory, state generation, pre-harness/harness, isolation/import/audit/reflow, DOM probe, TypeScript, build, all 153 budgets, Priority 0 policy, and diff checks.
- Run the budget gate immediately after the first product GREEN because nominal CSS headroom begins at 35 bytes.
- Preserve staged 110 and concurrent Landing inventory changes; report external blockers separately.

## 7. Independent review

- A separate reviewer validates actual listener/callback identity and counts, network isolation, portal focus/scroll, exact matrices/host IDs/totals, evidence hashes, CSS budget, scope, and policy.
- Critical or Important findings return to the original implementer, with fresh evidence required whenever product/manifest behavior changes.
