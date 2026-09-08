# Ranking Prediction Completion Panel Mobile Visual QA Design

Date: 2026-08-30
Status: approved as the next bounded slice of the repository-wide mobile Visual QA and duplicate-call plan

## Scope

Register and prove one clean direct leaf:

- `src/components/RankingPredictionCompletionPanel.tsx#RankingPredictionCompletionPanel`

Keep `src/components/RankingPrediction.tsx#RankingPredictionCompletionPanel` pending as a hosted occurrence because its parent is still a separate pending surface. Do not recapture the parent or a root. Do not edit the caller, ranking hooks/store/API/share logic, dirty prediction modules, Mate, Landing, shared `TeamLogo` or `Button`, prior reports, or generated bundle/dist reports.

The leaf is prop-controlled and has no API, authentication, permission, store, portal, or query behavior. Its known team fixture must come from an existing internal static project value; long Korean and unbroken-token values are visual pressure strings, not asserted baseball facts.

## Legal phases

| phase | `isPredictionSaved` | `alreadySaved` | visible actions |
|---|---:|---:|---|
| `complete` | false | false | 예측 완료 |
| `ready-to-save` | true | false | 저장하기, 공유하기 |
| `saved` | true | true | 공유하기 |

`isPredictionSaved=false,alreadySaved=true` is excluded as an illegal production combination. The hosted hook restores saved data with both values true.

## Exact matrix: 44

Data fixtures:

- `null-optional`: no top-team logo
- `known-static`: one existing internal static short name
- `long-korean`: non-production Korean pressure text
- `unbroken-token`: non-production unbroken overflow text

Canonical states are `4 data × 3 legal phases × 2 themes = 24`.

Twenty interactions use `known-static/light`:

- hover `3`: complete, save, share
- focus-visible `3`: complete, save, share
- pressed `3`: complete, save, share
- selected/click `3`: complete, save, share
- keyboard `8`: Enter and Space for each of the three actions, Tab save-to-share, Shift+Tab share-to-save

Complete interactions use `complete`, save and focus-loop interactions use `ready-to-save`, and share activation uses `saved`. Total: `24 + 20 = 44`.

Stable targets:

- `[data-testid="ranking-completion-panel"]`
- `[data-testid="ranking-complete-btn"]`
- `[data-testid="ranking-save-btn"]`
- `[data-testid="ranking-share-btn"]`
- `[data-testid="ranking-completion-stateful-host"]`

The adapter/catalog must fail closed for unknown or mismatched component, file, export, data, phase, theme, interaction, target, action, permission, or system values.

## Callback and duplicate-call contract

A single pointer, Enter, or Space activation invokes only its matching callback exactly once and every unrelated callback zero times.

- complete: complete `1`, save/share `0`, then controlled phase becomes `ready-to-save`
- save: save `1`, complete/share `0`, phase remains `ready-to-save`, `save-requested=true`
- share: share `1`, complete/save `0`, `share-requested=true`
- hover/focus/pressed/Tab/Shift+Tab/theme/viewport/StrictMode mount/keyed remount: all three callbacks `0`

The controlled QA host transitions immediately after complete, so a fast second activation records complete exactly once. Saving and sharing intentionally do not gain a new cross-click single-flight contract: the real caller owns its dialog/API and Kakao/share semantics. This slice only prevents duplicate dispatch from one native activation.

Every non-action ledger is asserted before any reset or new mount. Required mutation gates must make callback swap, callback duplicate dispatch, missing complete phase transition, wrong boolean-to-phase mapping, removed `alreadySaved` precedence, missing stable action selector, missing overflow containment, missing reduced-motion behavior, and focused-test package omission/duplication observable as RED.

## Mobile behavior

Actual production-CSS checks run at 320x844 and 390x1000 and require:

- root and child rects within the viewport and no document horizontal overflow;
- the 140px logo contained by the card for internal, long Korean, and unbroken values;
- complete/saved single actions and the ready two-action stack to remain full width and at least 44px high;
- title, fallback logo text, and action labels not to overlap or clip adjacent content;
- focus rings within the card and meaningful light/dark outline contrast;
- the local trophy asset loaded before capture and useful Korean alternative text;
- no entrance animation under reduced motion;
- viewport/theme/mount/remount and all non-action interactions to leave callback ledgers at zero.

Product changes require actual RED and are limited to `RankingPredictionCompletionPanel.tsx`. Reuse only already emitted classes; do not add global CSS, new utilities/arbitrary values, or edit shared primitives. If the compiled CSS grows by even one byte, remove the optional class change and solve with already emitted behavior.

## QA companion and production isolation

Use a lower-camel QA-only companion module with a lower-camel export, outside production imports. It owns legal phase transitions and callback ledgers without reproducing product rendering. Map the original component ID/file/export exactly. QA paths and identifiers must be absent from production chunks.

Add the focused actual test exactly once to `test:ranking:unit` and `previsual-qa:harness:test`; `test:unit` discovers it by glob and the main harness must not duplicate it. Incoming authoritative dirty-main baselines are pre `165/165` and full `408/408`; record exact post counts. Do not repair the unrelated global clean-package self-containment residual.

## Evidence and arithmetic

Produce one fresh 320x844, `fresh`, `expand-tall-flow` report:

- `reports/visual-qa-ranking-prediction-completion-panel-mobile.json`: `44/44`

All rows require failed/recovered zero, attempt one, unique scenario IDs and artifact paths, nonzero/hash-complete PNGs, complete 20-row interaction verification, and loaded local assets. Record report SHA, sorted path+content 44-PNG aggregate, and only legal equal-image groups for identical final UI.

Starting from registered `450/1,010`, pending `560`, direct `70,861`, valid `71,864`:

- registered: `451/1,010`
- pending: `559`
- direct: `70,905`
- valid: `71,908`

One direct entry adds 44 states. Hosted and root counts remain unchanged.

## CSS, concurrency, and policy

Incoming main CSS is `255,429/255,500`, leaving 71 bytes. Use the existing compile/CSS measurement path that does not rewrite shared reports. Never stage, restore, or intentionally regenerate `reports/bundle-guard-report.json` or `reports/dist-assets-report.json`.

At selection time the source and caller are clean while 408 unrelated paths are dirty and the index is empty. Preserve all concurrent prediction runtime/coach, Landing, Mate, auth/admin, shared UI, and generated-report changes. Re-check ownership before each scoped commit.

Static internal/manual fixtures only. No external baseball API/data, crawling, scraping, web-search repair, or guessed baseball facts.

## Review

One implementer owns this slice. A separate read-only reviewer validates legal phases, exact 44 states, callback exactness and mutation resistance, logo/overflow/touch/focus behavior, evidence and asset integrity, package integration, production isolation, CSS, clean scope, concurrency preservation, and Priority 0 compliance. Critical or Important findings return to the original implementer.
