# Constraints

- Scope: direct `RankingPredictionSaveDialog`, one focused actual test, exact adapter/catalog tests, one lower-camel QA companion, manifest/generated-state arithmetic, one 25-row report and its PNGs, package pre-harness inclusion, and slice docs.
- Exact matrix: `25 = 6 canonical + 19 interactions`.
- Canonical: closed/idle/saving × light/dark. No redundant closed+saving combination.
- Interactions at idle/light: hover 3, focus-visible 3, pressed 3, selected/click 4, keyboard 6.
- Final totals: registered `450/1,010`, pending `560`, direct `70,861`, valid `71,864`.
- The hosted `RankingPrediction.tsx#RankingPredictionSaveDialog` occurrence remains pending. No root evidence changes.
- Close/cancel/backdrop/Escape call `onClose` exactly once and `onConfirm` zero; confirm click/Enter call `onConfirm` exactly once and `onClose` zero; inner click, saving controls, mount/remount, resize, hover/focus/pressed call both zero.
- A fast double confirm switches the controlled host to saving after the first request and records exactly one confirm. StrictMode mount and keyed remount zero are asserted before resets.
- Actual tests cover 320x844 and 390x1000 portal containment, no x-overflow, Korean wrapping, 44px actionable controls, stacked full-width footer, saving label/disabled semantics, focus ring/loop, backdrop, Escape cleanup, and body lock/restoration.
- Mutation gates cover disabled removal, callback swap/duplicate, saving transition/label removal, inner propagation, Escape cleanup, focus trap, and package inclusion.
- Product edits require actual RED and are limited to `src/components/RankingPredictionSaveDialog.tsx`; shared Button/PlainDialog edits, global CSS, new utility/arbitrary classes, and new tooling are forbidden.
- QA companion mapping is exact and fail-closed; its path/identifiers must be absent from production chunks.
- Add the focused actual test exactly once to pre-harness. Incoming dirty-main counts are pre `162/162`, full `406/406`; record exact post counts. Do not repair the unrelated clean-package residual here.
- Final report is exactly 25 rows, failed/recovered 0, attempts 1, unique paths/scenarios, complete interaction flags, full portal images, nonzero/hash-complete artifacts, report SHA, and reproducible PNG aggregate.
- Preserve prediction runtime/coach, parent caller, Landing, Mate, all prior reports/PNGs, and unrelated changes. Generated bundle/dist reports are forbidden owned paths and must never be staged.
- Incoming CSS is `255,465/255,500`; run all 153 budgets immediately after first product GREEN.
- Static UI fixtures only. No external baseball API/data, crawling, scraping, web-search repair, or guessed facts.
- Separate implementer and read-only reviewer; Critical or Important findings return to the original implementer.
