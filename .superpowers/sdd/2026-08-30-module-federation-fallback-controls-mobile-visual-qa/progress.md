# Module Federation Fallback Controls Mobile Visual QA Progress

Date: 2026-08-30

## Scope result

- Product: fallback Button native forwarding/mobile containment and Modal exact-one close callback precedence.
- QA-only: lower-camel Button/Modal companions, exact adapters/catalog/manifest, optional `clickPosition` harness prerequisite, focused actual tests, reports and 69 PNGs.
- Preserved: shared Button, shared PlainDialog, probe, AppRoutes, hosted registrations, Landing/Mate/Mobile/DateRail sources and prior reports.

## TDD ledger

- Actual RED: stable Button target missing, Button target timeout, Modal both-callback close produced `openChange=1` and `close=1`.
- Actual GREEN: 3/3. Modal close/backdrop/Escape × both/open-change/onClose/none produces `1/0`, `1/0`, `0/1`, `0/0`; StrictMode initial and keyed remount pre-reset are zero.
- Mutation RED: dual dispatch, selected branch twice, missing onClose fallback, reversed visibility precedence, internal propagation, Escape cleanup, body restore, focus trap, package missing/duplicate: 9/9.
- `clickPosition` prerequisite RED/GREEN: executor 15/16 then 17/17; catalog propagation rejects invalid/non-click position and preserves absent `locator.click()` semantics.
- Exact matrix RED/GREEN: missing Button/Modal adapters/scenarios then Button 48 and Modal 21; wrong component/data/target/system/module/export fail closed.
- Full focused integration initially RED on stale global expectations (`70,767/280`, adapter list), then GREEN on `70,836/282` plus the two exact adapter IDs: 269/269.
- Full-portal capture TDD: Modal adapter expected `body` RED against harness surface, then GREEN.
- First detached final-HEAD actual exposed a hidden dependency on an uncommitted shared Button mobile size: Button 2/3 RED while Modal/static passed. The approved fallback-owned correction added already-emitted `min-h-11 min-w-11`. A second clean actual then exposed four long-label overflow failures because the committed shared Button deliberately requires `h-auto !whitespace-normal` to override its fixed height and no-wrap selector. Keeping that correction fallback-only returned main and clean actual to 3/3; all 14 presentations at 320/390 are at least 44x44 and the long Korean/unbroken cases have zero overflow. Clean pre/post CSS is byte-identical at 252,108 bytes (`cdee57f5...16de`), so the product correction adds no global CSS. Button evidence alone was invalidated and recaptured; Modal bytes stayed exact.
- First screenshotless warmup: 62/69, failed 7, recovered 0 because the empty ledger host was not measurable and one portal sibling selector could not match. Product callback values were already exact. QA-only 1x1 pointer-neutral ledger plus portal-safe `body:has(...)` selector produced 69/69, failed/recovered 0, all attempt 1.

## Counts and evidence

- Registered `449/1,010`; pending `561`; direct `70,836`; valid `71,839`.
- Button `48/48`, interactions `14/14`; Modal `21/21`, interactions `11/11`.
- All 69 rows: pass, attempt 1, unique scenario ID/path, nonzero and SHA-complete PNG. All 25 interactions have verified, captureVerified, viewportExpanded and revalidatedAfterViewportExpansion.
- Button report: `c72622ca84add31814417fd9ef6c74fd4ab06313e566eb559f150ce9dace6b5a`.
- Modal report: `8a231866278e2ec5d163e61e7d27033d5a808ca5457339e4297a71df547a7549`.
- Two-report aggregate: `e9dec5a298a30fccfe3313501519360a56cb09e2a7a7e5ef9cf3d2f13431fd3a`.
- Button PNG aggregate: `f0d352523463fcb73c25d8c44b26c2a2280633685737484e4e54370ae13320eb`.
- Modal PNG aggregate: `da845967c6bed9d5913455a1b5adb8f38eb5146a7e02307ea85bbd6520b1da33`.
- Sorted path+content 69-PNG aggregate: `0022bc058e4ea47b95b0180778e95892a2e3fd663c38b63a166f46e03877a884`.
- Actual PNG hashes: 54/69. Seven legal equal-image groups cover identical final UI only: Button brand/default by theme, pointer/default, keyboard/focus, secondary-default/ghost-hover; Modal closed callback results, autofocus/tab/none-open, hover/pressed. Exact callback/focus ledgers and scenario IDs remain distinct.

## Verification

- Actual fallback: 3/3.
- Pre-harness: 162/162; full harness: 406/406.
- Catalog/adapter: 269/269; interaction executor: 17/17.
- Prior duplicate coordinator: 12/12 and 6/6; GlobalError actual: 8/8.
- Contract: 13/13 and check pass; inventory: 17/17. Inventory strict remains closed on the known Landing-only 15 unclassified + 1 stale, with fallback residual 0, parse/provisional 0.
- State: 19/19; strict completeness remains closed on exactly 561 pending.
- Isolation/import/audit/reflow: 46/46; DOM probe pass; TypeScript pass; diff check pass; Priority 0 policy pass.
- Build: worker 17/client 5,736 modules, 153/153 budgets, CSS 255,465/255,500 bytes, production isolation 0, QA companion production identifiers 0.
- Mate/Mobile/DateRail, GlobalError and Admin Offseason prior report diffs: zero.

## Concurrent state preservation

- Immutable design/plan/constraints hashes remained `414a325c...93f`, `d2b282bc...7ee`, `cd4e3b25...31e`.
- During execution an external commit/reset advanced HEAD from `fa47a6ae3503602e1769b18987b292d7491cc0ad` to `96a6dc37166a4634bf19654dac0ef902bec83519` and converted the former staged-99 index (`e63eea5e...aad0` names, `59b53ceb...14bc` binary) into unstaged/untracked state. Parent coordination confirmed this transition supersedes the staged-99 constraint; it must not be reversed or reconstructed.
- Authoritative post-transition baseline: index count 0; non-owned tracked diff SHA-256 `31cd2dcdf53f96823a90ce44f687ab80e4971314783cb6efd195d27835a2666d`; non-owned untracked count 165 and sorted path+content SHA-256 `dd7fa9529cfa3328a3ec440c15386a27a18ae64f98ad193746719a028686d94f`.
