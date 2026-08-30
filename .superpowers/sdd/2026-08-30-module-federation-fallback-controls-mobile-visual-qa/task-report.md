# Module Federation Fallback Controls Mobile Visual QA Task Report

Date: 2026-08-30
Status: implementation and authoritative evidence complete; independent review pending

## Delivered

The fallback Button now preserves native props/callbacks, owns a stable QA target and fallback-local 44px minimum geometry, and contains touch and pressure content on mobile. Detached-checkout REDs proved this could depend on neither the dirty workspace's uncommitted shared Button sizing nor its wrapping behavior: the fallback now owns `min-h-11 min-w-11 h-auto !whitespace-normal`, while the shared Button remains untouched. Main and clean actual tests cover all 14 presentations at 320/390 plus long Korean and unbroken labels, and only Button evidence was recaptured. The fallback Modal dispatches exactly one compatibility close callback with `onOpenChange(false)` precedence over `onClose()`, while retaining shared PlainDialog portal, backdrop, Escape, focus and body-lock behavior.

Two QA-only lower-camel companions register exact direct matrices: Button 48 and Modal 21. The Modal captures the complete `body` portal surface. A minimal harness-only `clickPosition` prerequisite clicks the real full-screen outer surface at an explicit safe coordinate, validates finite nonnegative click-only input, and preserves the original no-position click byte path and no-replay revalidation.

Final state totals are registered 449/1,010, pending 561, direct 70,836 and valid 71,839. Final reports are 48/48 and 21/21 with failed/recovered zero, all attempt 1, 69 unique/nonzero artifacts and 25/25 complete interaction flags. Hashes and legal equal-image groups are recorded in `progress.md` and `docs/VISUAL_QA.md`.

## Release gates

Actual 3/3, pre-harness 162/162, full harness 406/406, catalog/adapter 269/269, harness interactions 17/17, prior coordinator 12/12 + 6/6, GlobalError actual 8/8, contract 13/13, inventory 17/17, state 19/19, isolation/import/audit/reflow 46/46, DOM probe, TypeScript, production build, diff check and Priority 0 policy all pass. The only strict failures are the declared global incompleteness: 561 pending states and the existing Landing-only inventory residual 15 unclassified + 1 stale.

Production build remains at 5,736 client modules, 153/153 budgets, CSS 255,465/255,500 bytes, isolation violations 0 and QA companion production identifiers 0.

The detached committed-source build also passes 153/153 budgets. Its CSS is 252,108 bytes with SHA-256 `cdee57f502369b70ce63ad5ca6f3518e0fcc694f4df7a76af019f9aee4a916de`, exactly equal before and after the fallback wrapping correction, and production QA identifiers remain zero.

## Scoped history

The initial prerequisite, implementation, evidence and documentation commits are `37c89940`, `b6af50b0`, `26dc201a` and `a955da36`. Detached verification then produced the touch correction `cd828cd3` and interim Button evidence `c3360c51`. The clean long-label RED is preserved by the first wrapping attempt `0a581cca`; selector precedence required the final fallback-local correction `44249fe9`, whose authoritative recapture is `d01d8403`. The superseded evidence commits remain in history intentionally so the RED/GREEN progression is auditable.

## Preservation note

No shared Button, PlainDialog, probe, AppRoutes, hosted entry, Landing, Mate/Mobile/DateRail source/report, API/auth/store/query/data module or external baseball data path was changed by this slice. An externally coordinated HEAD/index transition to `96a6dc37166a4634bf19654dac0ef902bec83519` superseded the original staged-99 condition; the new authoritative index is empty and its non-owned tracked/untracked fingerprints are recorded in `progress.md` for commit-by-commit preservation.
