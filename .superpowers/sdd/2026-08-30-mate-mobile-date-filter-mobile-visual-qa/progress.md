# Progress

## Fixed inputs

- Design SHA-256: `f459142f5e249979bf854f04205d32ec4eb65093e867b246630b60e6b7ba816d`
- Plan SHA-256: `ede8d418f1bce0fc9ababf9f6c0534cdacf5392244f935d1f2995ce8a9d3646f`
- Constraints SHA-256: `5f0f9841febffa7f416feb8c8df3a021ac02ed25143d9cd5909da5c4cf3a7023`

The approved design, plan, and constraints were not edited during implementation. They were force-added unchanged with this task documentation because the design/plan were previously untracked and the constraints directory is intentionally ignored.

## TDD log

1. Product RED: at both `320px` and `390px`, every date button measured `42px` high while the shared all-date button measured `44px`; the rail remained locally scrollable with document overflow zero. The actual test also fixed stable root/label/scroller/button ownership, badge separation, first/middle/last reachability, keyboard state, and exact callback accounting.
2. Product GREEN: the two date-button branches now use the already-emitted `h-11` class, stable test IDs, and owned active/motion-reduced feedback. The all-date control and production callback logic were not replaced.
3. Callback mutations: reciprocal first/middle values produced callback `2027-12-31` instead of `2027-12-24` and failed; removing the callback produced an empty callback ledger and failed. Restored production behavior passes with intended callbacks exactly one and unrelated/network/resize/scroll/keyboard/StrictMode callbacks zero.
4. Fixture clarification: the immutable text called `2027-12-31` Thursday, but the fixed date is Friday. The fixture remains unchanged and the actual test correctly asserts `12월 31일 금`; immutable documents remain byte-identical.
5. QA routing RED/GREEN: the new component initially remained pending and its companion module was unknown. GREEN uses an exact `componentFile#exportName` allow-list, a QA-only lower-camel companion module, and a fail-closed adapter. Unknown modules and mismatched exports fail.
6. Package integration RED/GREEN: a focused policy test found zero occurrences of the Mobile actual test in `previsual-qa:harness:test`; the package script now contains that exact path once. The earlier `MateListControlLeaves.mobile.test.tsx` omission is intentionally unchanged and remains a separate residual.
7. TypeScript caught a test-only coordinate bug (`boundingBox().right`); the overlap assertion now uses `x + width`. Mobile actual returned green `2/2` after the correction.

## Coverage and evidence

- Direct matrix: exact `55` = canonical `36` plus interaction targets `19` (`hover 4`, `focus-visible 4`, `pressed 4`, `selected 5`, `keyboard-navigation 2`).
- Hosted alias: `MateListControlsRuntime.tsx#MateMobileDateFilter` retains the existing four Mate root aliases. DateRail direct `106` remains unchanged and its hosted state remains pending.
- Generated contract: registered `447/1,010`, pending `563`, direct `70,767`, valid `71,770`.
- Final reports: Mobile `55/55` and Mate root `6/6`, `320 x 844`, fresh page, `expand-tall-flow`, failed `0`, recovered `0`, every row attempts `1`.
- Mobile interactions: all `19/19` rows record verified interaction, capture verification, viewport expansion, and post-expansion revalidation. Selected callbacks are exactly one; ArrowRight and Tab callbacks are zero.
- Artifact integrity: `61` unique referenced paths, `61` nonzero PNGs. Mobile has `45` distinct PNG hashes across `55` rows; Mate root has `6/6` distinct hashes.

Legal equal-hash groups reflect identical final UI, not missing evidence:

- dark/all boundary equals maximum (`2`);
- light/all boundary equals maximum and both `first-to-all`/`outside-to-all` outcomes (`4`);
- dark/first boundary equals maximum (`2`);
- light/first boundary equals maximum and `all-to-first` (`3`);
- dark/outside boundary equals maximum (`2`);
- light/outside boundary equals maximum (`2`);
- focus-visible all equals keyboard scroller-to-all after final focus (`2`).

Boundary and maximum fixtures share the same visible leading rail segment while later maximum dates remain offscreen. Selected and keyboard groups converge to the same controlled final UI.

## Verification log

- Actual Mobile ReactDOM/Chromium: `2/2`; reciprocal and missing callback mutations are RED.
- Focused prior duplicate set: GlobalError, list-control leaves, Mobile, and related static/catalog/controller tests green; sandbox port failures disappeared under serial escalated execution (`13/13`).
- Package pre-harness: `159/159`. Full harness: `401/401`, exactly three above the previous `398` (Mobile actual `2` plus package inclusion test `1`).
- Contract `13/13` and contract check; state `19/19`; inventory `17/17`; production isolation/import/audit/reflow `46/46`; DOM probe; TypeScript; Priority-0 policy: green.
- Inventory check exits only for the existing Landing residual: `15` unclassified, one stale, zero provisional, zero parse errors. Mobile adds zero unclassified symbols.
- Production build: worker `17`, client `5,736`, bundle budgets `153/153`; global CSS `255,465/255,500` bytes, increase zero and headroom `35`.
- Production `dist` contains zero occurrences of `MateMobileDateFilterHarness`, `mateMobileDateFilterVisualQaHarness`, and `mate-mobile-date-filter-stateful-host`.
- Detached clean code/evidence closure at `3bc9f894`: package inclusion `1/1`, catalog/state adapters `266/266`, Mobile actual `2/2`, TypeScript green, exact totals, build client `1,179`, budgets `153/153`, CSS `252,072`, and all three production identifiers zero. The `46` isolation/import/audit/reflow test files belong to staged99 rather than that HEAD and therefore were verified in the full working tree, not re-run in this clean checkout.

## Shared-tree preservation

- User index remains exactly `99` paths.
- `git diff --cached --name-only | shasum -a 256`: `e63eea5ed9284987100166b8d114c5fbf874f5332123876e227cfb15d429aad0`.
- `git diff --cached --binary | shasum -a 256`: `59b53ceb5bb8a4bb4e1e3e0afa2c75b2e31dc92f1463e96c0efaed05d9d914bc`.
- The `stateAdapters.ts` implementation commit contains only the `mate.mobile-date-filter` hunk. The concurrent Landing selector hunk remains unstaged; DateRail adapter/source/report changes are excluded.
- DateRail final/initial report SHA-256 remain `18cb7076eeb585824e745f94828a95aa1804d7bbc21145b1f53fec888e60b953` and `b4b1af2ee3bc99f61ddf44b83e4fb70bd007145bf517468f9cc3a4abebf88e84`; its 106-PNG aggregate remains `0218661c727abcc6e1f54e5b4a70a7b1d3cc8a949994ddbdcbb0d7a42fe65deb`.
