# Global Error Dialog Mobile Visual QA Task Report

## Outcome and scope

- Registered only direct `GlobalErrorDialog` and `GlobalErrorDialogContent`, plus hosted `LazyGlobalErrorDialogContent`.
- Exact matrices are Root `22`, Content `35`, and hosted Root evidence `16`; generated totals are `440/1,010 registered`, `570 pending`, `70,633 direct`, and `71,636 valid`.
- Added no API/auth/payload behavior, shared primitive change, global selector, external request, baseball data access, crawler, scraper, or search repair.
- Static fixtures contain only `MOCK` values. Retry and feedback timeout fixtures remain observable without resolving; feedback submission uses an injected non-production submitter only.

## Product changes

- Root now has a named production Suspense fallback with stable test ID, `role=status`, live text, and busy semantics.
- Root's deterministic state/renderer seam is non-production-only, validates every state, and fails closed for malformed state or missing renderers.
- Content owns stable content/title/confirm/source selectors, 44px confirm height, min/max-width containment, and `overflow-wrap:anywhere` for pressure copy.
- Runtime and unhandled-rejection sources show distinct readable source notices; the API default stays unchanged. The notices use inline style and already-emitted utilities, so global CSS remains unchanged.
- Content's deterministic feedback submitter is non-production-only and still passes through the existing `ErrorFeedbackPanel` contract.

## TDD and actual-browser evidence

- Initial actual-mount RED was `0/3`: missing confirm selector, missing named fallback/seam, and missing Content selector/static submitter. The first product GREEN was `3/3`.
- Header-close observer first returned `0` instead of `1`; after wiring it through the non-production root seam, close-path evidence passed.
- Deliberate listener cleanup mutation (`removeEventListener` to `addEventListener`) produced effective listener `2` instead of `1`; restoration returned GREEN.
- Deliberate retry reciprocal miswire closed without invoking the original callback, producing original count `0` instead of `1`; restoration returned GREEN.
- Final actual ReactDOM+Vite+Chromium suite is `7/7`. StrictMode records listener add/remove `2/1`, effective count `1` after rerender, and `2/2` plus effective `0` after unmount. Invalid-author, cancelled-request, and `/home` endpoint events remain closed, then a valid event opens; Cypress is suppressed; event B replaces event A.
- Header close, backdrop, Escape, and confirm each close exactly once with retry/feedback/unrelated/network all zero. Retry resolve/reject/timeout and rapid duplicate each close first and invoke the original retry callback exactly once.
- Feedback success/failure/timeout and rapid duplicate call only the injected submitter once. API/runtime/unhandled sources retain exact action codes. Every actual page intercepts `fetch`, XHR, and `sendBeacon`; the network count is exactly zero.
- Success feedback setup initially used `fill`; final screenshot revalidation correctly RED because production clears the textarea after success. A catalog RED changed this to one `press-key(A)` setup. The actual test proves submit disabled before input, enabled afterward, success result visible, textarea cleared, injected submit count one, and network zero.
- A disabled feedback-hover state shared a hash with focus evidence. Catalog RED required an enabled `fill` setup; the full recapture then produced a distinct hover hash.
- Source presets initially shared the API default hash. A missing source-locator actual RED preceded the source notice implementation; API/runtime/unhandled now have distinct readable DOM and PNG hashes while preserving action codes.
- TypeScript found two fail-closed adapter narrowing errors (`TS2345`); validated casts after the runtime guards turned `npx tsc --noEmit` GREEN without behavior changes.
- At 320x844 the portal contains long Korean, unbroken tokens, error ID and lower controls; all controls are at least 44px. Body scroll restores after close. Confirm-to-Tab wraps to the exact close element, remains in the dialog, and does not reach the outside sentinel. Removing the focus trap deliberately REDs.

## Browser evidence and integrity

- Root report: `reports/visual-qa-global-error-dialog-mobile.json`, SHA-256 `4cd4a12e2498d705f8a5c66a1e4f636a61a7f921ac14b605aa96078c79b73edf`.
- Root PNG aggregate: `13ee5aff0fabd285da6f76e6875d05f95383d7db32bdf6eb9cf315ca23699da5`.
- Content report: `reports/visual-qa-global-error-dialog-content-mobile.json`, SHA-256 `58340e5bef6f386c19aa2bf7439bc45cfc6b36eda57348d5022868fa02800723`.
- Content PNG aggregate: `57830a1b6210fef8fe5dac55173f44e2e730807e127399b1809742100082b5b9`.
- Aggregate formula: `(find <dir> -type f -name '*.png' -print0 | sort -z | xargs -0 shasum -a 256) | shasum -a 256`.
- Both final runs use Chromium at `320x844`, `pageMode=fresh`, `captureHeightMode=expand-tall-flow`, failed/recovered `0`, and every attempt `1`.
- Root is `22/22`, with 22 unique IDs, 22 unique paths, 22 nonzero PNGs, and 18 actual hashes. Content is `35/35`, with 35 unique IDs, 35 unique paths, 35 nonzero PNGs, and 33 actual hashes. Content's 19 interactions have all four evidence flags true `19/19`.
- Root API/runtime/unhandled hashes are `8e06a65c...`, `29ae0238...`, and `7a9f1dd3...`. The only repeated Root hash is the legal closed/blank result `3b65ded3...` for Cypress, idle-no-event, invalid-author, cancelled-request, and ignored-home-endpoint; the actual listener test separately proves every ignored branch followed by a valid open.
- Content API/runtime/unhandled hashes are `560a73ed...`, `5222ecc1...`, and `2b9cbce3...`; representative hover/pressed are `7eff3fee...`/`5f722015...`, success/failure `608608ae...`/`edc5bd45...`, feedback/retry busy `ce0ad619...`/`c67ec58d...`, and confirm/textarea focus `20465a97...`/`972ecb98...`.
- Content has two legal visual-equivalence pairs. Exact close focus and confirm-to-Tab both intentionally finish on the same close `:focus-visible` DOM (`796dbfc0...`), while the keyboard result additionally proves exact close identity, containment, and outside-sentinel false. Shared close hover and pressed retain the same pointer surface (`9d629294...`), while the harness separately verifies `:hover` and `:active`, and actual isolated click evidence proves close exactly once with unrelated callbacks zero.
- The initial failed success report and all superseded pre-source reports were moved outside the repository and are excluded from final evidence.

## Verification

- Focused GlobalError/AppQueryProvider/ErrorFeedbackPanel/PlainDialog/offseason direct/coordinator: `46/46` pass. This includes duplicate create/update/delete/import, force-fresh refresh, failure retry, StrictMode replay, deactivation, latest filters, and sequential CSV row regression.
- Admin aggregate: `85/85`; coverage contract: `13/13` plus valid check; inventory unit: `17/17`; state generator: `19/19`; pre-harness: `157/157`; full harness: `393/393`; isolation/import/audit/reflow: `46/46`; DOM fixture probe: pass.
- State generation: `440/1,010 registered`, `570 pending`, `70,633 direct`, `71,636 valid`. Hosted Lazy Content is registered/hosted with 16 unique current Root IDs and adds zero independent valid combinations.
- `npx tsc --noEmit`: pass after the fail-closed narrowing correction.
- `npm run build`: pass, worker `17` and client `5,736` modules transformed. Bundle guard passes all `153` budgets, global CSS is `255,465/255,500B`, and production-isolation violations are zero.
- `python3 scripts/validate_baseball_data_policy.py`: `External baseball data policy OK`.
- `git diff --check` and the scoped temporary-index cached diff check pass.
- Full inventory check fails closed only on concurrent Landing work: `2,115` symbols in `511` files, `15` unclassified, `1` stale, `0` provisional visual, `0` parse errors. The split is `LandingIcons.tsx` 9 plus the three `landing/phone` screens 2 each; stale is `LandingAppPreview.tsx#PREVIEW_POINTS`. Both owned Global Error sources contribute zero unclassified symbols.

## Immutable inputs and staged preservation

- Design SHA-256: `947dd569185e6c1432553f1e7d18bdcca6bc9b86e29a0f5b3f8eacf825343640`.
- Plan SHA-256: `5f063bf19309fa1997db133b80a103eec3f71c73f208f07a34e33ea02570c50b`.
- Constraints SHA-256: `717a38ea98cf9da971c71ef02af2c22eb9a50c853b2ee2d226b6135a9b95a17e`.
- Pre-existing staged baseline: `110` paths, sorted-name SHA-256 `6f90df136607a3dff465c7188150626a10eb66eb90beb8cf800ca324ed27051b`, cached raw SHA-256 `608a61c17dab4c0e8d20c19aa65606faddcb2d2e6fc515cb4ab0e0f3d315e797`.
- Final real index is identical: `110` paths with the same sorted-name and cached-raw SHA-256 fingerprints.
- Existing bundle/dist report hashes were restored after both builds: `39a2f0bd...` and `0c8e6645...`. Shared `AppQueryProvider`, `ErrorFeedbackPanel`, `PlainDialog`, API/auth/payload files, and prior offseason reports were not edited by this slice.

## Remaining limitation

This slice closes all direct Root 22, direct Content 35, and hosted 16 evidence in scope. Repository-wide completeness remains closed on exactly 570 pending visual symbols, and the concurrent Landing `15+1` inventory blocker remains outside this commit. Global CSS has 35 bytes of nominal headroom. No external baseball data API, crawling, scraping, web-search repair, guessed data, or production data mutation was added.
