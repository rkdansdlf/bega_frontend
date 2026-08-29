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
- Final actual ReactDOM+Vite+Chromium suite is `8/8`. StrictMode records listener add/remove `2/1`, effective count `1` after rerender, and `2/2` plus effective `0` after unmount. Invalid-author, cancelled-request, and `/home` endpoint events remain closed, then a valid event opens; Cypress is suppressed; event B replaces event A.
- Header close, backdrop, Escape, and confirm each close exactly once with retry/feedback/unrelated/network all zero. Retry resolve/reject/timeout and rapid duplicate each close first and invoke the original retry callback exactly once.
- Feedback success/failure/timeout and rapid duplicate call only the injected submitter once. API/runtime/unhandled sources retain exact action codes. Every actual page intercepts `fetch`, XHR, and `sendBeacon`; the network count is exactly zero.
- Success feedback setup initially used `fill`; final screenshot revalidation correctly RED because production clears the textarea after success. A catalog RED changed this to one `press-key(A)` setup. The actual test proves submit disabled before input, enabled afterward, success result visible, textarea cleared, injected submit count one, and network zero.
- A disabled feedback-hover state shared a hash with focus evidence. Catalog RED required an enabled `fill` setup; the full recapture then produced a distinct hover hash.
- Source presets initially shared the API default hash. A missing source-locator actual RED preceded the source notice implementation; API/runtime/unhandled now have distinct readable DOM and PNG hashes while preserving action codes.
- Stale retry completion is isolated from newer state. Separate fresh-page sequences prove deferred A resolve and reject both leave the exact B message/error ID visible with A retry `1`, B retry `0`, and network `0`; ordinary confirm close invokes retry `0` and permits B to open; pending A resolve and reject after unmount leave effective listener `0`, no dialog, and no page error. Every sequence begins with an empty action log and asserts its exact per-error action history.
- Mutation resistance is executable with `GLOBAL_ERROR_DIALOG_MUTATE_STALE_CLOSE=1 node --import tsx --test --test-name-pattern "isolates stale retry completion" src/components/GlobalErrorDialog.mobile.test.tsx`. Injecting `setState(initialState)` after the awaited retry produces RED `0/1` because B disappears; the unmodified product is GREEN `1/1`. The product source did not change for this follow-up.
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
- Self-contained closure consumed exactly 11 previously staged paths: `src/components/ui/plain-dialog.tsx`, `src/visual-qa/harnessCatalog.ts`, `contracts/visual-qa-skeleton-usages-v1.json`, `scripts/visual-qa-component-inventory.mjs`, `scripts/visual-qa-coverage-contract.mjs`, `src/visual-qa/VisualQaHarnessApp.tsx`, `src/visual-qa/harnessBrowserState.test.ts`, `src/visual-qa/harnessBrowserState.ts`, `src/visual-qa/main.tsx`, `visual-qa-harness.html`, and `vite.visual-qa.config.ts`. Their successful-run current bytes are now represented by the two follow-up commits; they were not recreated artificially in the index. `ErrorFeedbackPanel`, `useFocusTrap`, the semantic-host files, and the new theme test were unstaged inputs rather than consumed staged entries.
- The remaining unrelated real index is `99` paths, sorted-name SHA-256 `e63eea5ed9284987100166b8d114c5fbf874f5332123876e227cfb15d429aad0`, cached-raw SHA-256 `24b507459e913c4a70551c9fefd6e6d3aaba60453a043b81e65331dd184323f1`. The reduction from 110 is exactly the 11 paths above; no artificial restoration was performed.
- Existing bundle/dist report hashes were restored after both builds: `39a2f0bd...` and `0c8e6645...`. Shared `AppQueryProvider`, API/auth/payload files, and prior offseason reports were not edited by this slice; the exact existing `ErrorFeedbackPanel` and `PlainDialog` prerequisite bytes are now explicitly committed as described below.

## Self-contained prerequisite follow-up

- `git diff HEAD --` audit found no auth or API behavior in the missing dependency closure. The evidence runtime used the complete current bytes of `PlainDialog` (`bodyStyle`, dvh/scroll containment, 44px close, focus semantics), `ErrorFeedbackPanel` (static submitter, owned selectors and accessible 44px controls), and `harnessCatalog` (complete executable interaction plan resolver). Committing only the named props would not reproduce the captured render, so commit `0aef8cef` contains those three files exactly.
- The first clean TypeScript pass exposed the remaining Visual QA-only closure instead of pulling in dirty admin product files. `stateAdapters` no longer imports two admin visual-state types and instead relies on the already validated inferred object shapes; the only source changes are erased TypeScript imports/return annotations, so emitted runtime behavior is unchanged. The focused test uses a QA-local narrow assertion type. Existing current bytes of `useFocusTrap`, `semanticHost`, the skeleton-usage JSON, the Visual QA entry/app/browser-state modules, HTML/Vite config, and the two inventory runners were then included because clean TypeScript, catalog/state/semantic tests, or the clean inventory command directly required them.
- `contracts/visual-qa-skeleton-usages-v1.json` was audited as generated input from `scripts/visual-qa-skeleton-usage.mjs`. The generator itself was not added to the closure because it imports a broader unrelated uncommitted toolchain and is not required by the runtime or focused clean gates.
- The Root/Content product, state manifest, report, and PNG bytes did not change in the stale-sequence follow-up. Therefore no recapture was performed; the four report/aggregate hashes above remain the release evidence.

## Clean-checkout verification follow-up

- The explicit detached worktree `/private/tmp/global-error-clean-378c85bb` checked out only the two follow-up commits and used a temporary symlink to the existing `node_modules`; it did not contain concurrent Landing or the remaining staged/user changes.
- `npx tsc --noEmit` passed. Focused `stateAdapters`, `harnessCatalog`, and `semanticHost` tests passed `267/267`. Actual Vite+ReactDOM+Chromium ultimately passed a fresh full `8/8`, including all stale resolve/reject, ordinary-close, and unmount sequences. One sandboxed attempt failed all eight before mounting with environment-only `listen EPERM` on `127.0.0.1:5173`; after local-loopback permission, one loaded full run was `7/8` because the timeout feedback double-click counter was read as `0`, then the unchanged failing case passed `1/1` in isolation and a fresh unchanged full run passed `8/8`.
- The duplicate-call/list coordinator regression passed `12/12`, including rapid create/update/delete/whole-file import de-duplication, force-fresh refresh, StrictMode replay, failure retry, deactivation, and sequential CSV behavior.
- Production build with `VITE_SITE_URL=https://example.invalid` and `VITE_API_BASE_URL=https://api.example.invalid` passed with worker `17` and client `1,179` modules, all `153/153` bundle budgets, and global CSS `252,013/255,500B`. The lower clean CSS value is expected because concurrent dirty/staged UI work is absent; the earlier shared-worktree build remains `255,465/255,500B`.
- Clean inventory ran to completion and failed closed with exit `1` at `2,077` symbols in `505` files, `4` unclassified, `28` stale, `0` provisional, and `0` parse errors. These pre-existing clean-HEAD inventory items are outside this slice; both Global Error sources remain unclassified `0`. The concurrent Landing `15+1` result is absent by construction in the clean checkout.
- Baseball-data policy, `git diff --check`, and scoped commit checks passed. The final report hashes and PNG aggregates were recomputed byte-for-byte, and `git diff 5f08ef64..HEAD` is empty for both product files, the state manifest, both reports, and both PNG directories. The adapter closure diff removes only type-only imports/annotations, so no render/runtime/source-manifest change required recapture.

## Remaining limitation

This slice closes all direct Root 22, direct Content 35, and hosted 16 evidence in scope. Repository-wide completeness remains closed on exactly 570 pending visual symbols. The shared dirty checkout still has the concurrent Landing `15+1` inventory blocker and 35 bytes of nominal CSS headroom; the self-contained clean checkout instead has the separately recorded `4+28` pre-existing inventory result and 3,487 bytes of CSS headroom. No external baseball data API, crawling, scraping, web-search repair, guessed data, or production data mutation was added.
