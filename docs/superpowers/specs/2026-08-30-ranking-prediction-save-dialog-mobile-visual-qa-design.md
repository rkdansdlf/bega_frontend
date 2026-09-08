# Ranking Prediction Save Dialog Mobile Visual QA Design

Date: 2026-08-30
Status: approved as the next bounded slice of the repository-wide mobile Visual QA and duplicate-call plan

## Scope

Register and prove one clean, direct, prop-controlled leaf:

- `src/components/RankingPredictionSaveDialog.tsx#RankingPredictionSaveDialog`

Keep the hosted occurrence in `src/components/RankingPrediction.tsx#RankingPredictionSaveDialog` pending because its parent remains a separate direct pending surface. Do not recapture that parent or any root. This slice does not edit prediction runtime/coach modules, Mate, Landing, shared `Button`, shared `PlainDialog`, API/auth/store/query/data code, existing reports, or generated bundle/dist reports.

The dialog uses static Korean UI copy and has no baseball-data dependency.

## Exact matrix: 25

Canonical states are exactly six:

- `closed/light`
- `closed/dark`
- `idle/light`
- `idle/dark`
- `saving/light`
- `saving/dark`

`closed` means `open=false`; `idle` means `open=true,isSaving=false`; `saving` means `open=true,isSaving=true`. A separate `closed+saving` axis is not legal and must not create duplicate screenshots.

Nineteen interaction states are anchored at `idle/light`:

- hover `3`: close, cancel, confirm
- focus-visible `3`: close, cancel, confirm
- pressed `3`: close, cancel, confirm
- selected/click `4`: cancel, confirm, close, backdrop
- keyboard `6`: Escape, Tab close-to-cancel, Tab cancel-to-confirm, Shift+Tab close-to-confirm, Enter confirm, Space cancel

Total: `6 + 19 = 25`.

Stable targets are the stateful QA host, `[role="dialog"]`, `[aria-label="닫기"]`, `ranking-save-dialog-cancel`, and `ranking-save-dialog-confirm`. The adapter and catalog must fail closed for unknown or mismatched component, module, export, phase, theme, interaction, target, action, or system values.

## Callback and duplicate-call contract

Every trigger has an exact ledger:

| trigger | `onClose` | `onConfirm` |
|---|---:|---:|
| close button | 1 | 0 |
| cancel click or Space | 1 | 0 |
| backdrop | 1 | 0 |
| Escape | 1 | 0 |
| confirm click or Enter | 0 | 1 |
| inner-dialog click | 0 | 0 |
| saving close/cancel/confirm pointer or keyboard | 0 | 0 |
| hover/focus/pressed/resize/mount/remount | 0 | 0 |

The QA-only controlled host switches to saving synchronously after the first confirmation request. A fast double confirm must therefore record exactly one confirmation. Mount and keyed remount ledgers are asserted before any reset.

Mutation gates must make these regressions observable as RED: removing disabled behavior, swapping callbacks, calling either callback twice, omitting the saving transition or saving label, allowing inner-dialog propagation, breaking Escape cleanup, breaking focus trapping, and omitting focused-test package inclusion.

## Mobile behavior

Actual production-CSS checks run at both 320x844 and 390x1000. They require:

- the complete portal and dialog rect to remain within the visual viewport;
- no document horizontal overflow;
- title and Korean description wrapping without clipping;
- close, cancel, and confirm targets at least 44x44 where actionable;
- stacked full-width mobile footer actions and correct desktop transition;
- visible disabled state and sufficient distinction for `저장 중...`;
- visible focus rings, pointer-safe backdrop, and correct forward/reverse focus loop;
- body scroll lock while open and exact restoration on close/unmount;
- Escape listener cleanup and no callback on mount/remount.

Product changes are allowed only after an actual RED and only in `RankingPredictionSaveDialog.tsx`. Reuse already emitted classes; do not add global selectors, new Tailwind utilities/arbitrary values, or edit shared controls. Preserve the existing controlled props and callback meanings. Add `aria-busy` or other leaf-local semantics only when proved by tests.

## QA companion and production isolation

Use one lower-camel QA-only companion module outside production components. It owns controlled phase changes and callback ledgers but does not reproduce dialog implementation. The catalog must map the original component ID/file/export to this companion exactly. QA companion module paths and identifiers must be absent from production chunks.

Add the focused actual test exactly once to the package pre-harness gate. The incoming authoritative dirty-main baselines are pre-harness `162/162` and full harness `406/406`; record exact post-slice counts. The known clean-checkout package residual involving unrelated pre-existing untracked tests is documented but is not repaired in this slice.

## Evidence and coverage arithmetic

Produce one fresh 320x844, `fresh`, `expand-tall-flow` report:

- `reports/visual-qa-ranking-prediction-save-dialog-mobile.json`: `25/25`

All rows require failed/recovered zero, attempt one, unique scenario IDs and artifact paths, nonzero/hash-complete PNGs, and complete interaction verification flags. Capture the full portal surface. Record the report SHA, a reproducible sorted path+content 25-PNG aggregate, and only legal equal-image groups representing the same final UI.

Starting from registered `449/1,010`, pending `561`, direct `70,836`, valid `71,839`:

- registered: `450/1,010`
- pending: `560`
- direct: `70,861`
- valid: `71,864`

One direct entry adds 25 states. Hosted and root counts do not change.

## CSS, concurrency, and policy constraints

The incoming main-worktree production CSS budget is `255,465/255,500` bytes, leaving 35 bytes. Run the production build and all 153 budgets immediately after the first product GREEN. `reports/bundle-guard-report.json` and `reports/dist-assets-report.json` are generated by that check but are forbidden owned paths; preserve concurrent values and never stage them.

Source and caller were clean at selection time. Preserve all concurrent dirty prediction runtime/coach, Landing, Mate, generated reports, and unrelated work. Re-check ownership before every commit. Static UI fixtures only: no external baseball API/data, crawling, scraping, web-search repair, or guessed facts.

## Review

One implementer owns this slice. A separate read-only reviewer validates the exact 25-state matrix, callback ledgers and double-confirm protection, portal/focus/body lifecycle, touch and overflow behavior, evidence integrity, package regression integration, production isolation, CSS budget, clean scope, concurrency preservation, and Priority 0 compliance. Critical or Important findings return to the original implementer.
