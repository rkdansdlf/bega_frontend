# Ranking Prediction Save Dialog Mobile Visual QA Plan

Date: 2026-08-30

## 1. Freeze scope and exact matrix

- Fix the direct matrix at `25 = 6 canonical + 19 interactions`.
- Keep the hosted parent occurrence pending and do not recapture any root.
- Freeze callback ledgers, fast double-confirm exact-one behavior, incoming totals, CSS headroom, and forbidden concurrent paths.

## 2. TDD actual product behavior

- Add failing Vite+ReactDOM+Chromium tests at 320/390 for portal containment, horizontal overflow, Korean wrapping, 44px targets, stacked actions, saving state, disabled semantics, backdrop, focus loop, Escape, and body lock/restore.
- Prove close/cancel/backdrop/Escape invoke `onClose` exactly once; confirm click/Enter invoke `onConfirm` exactly once; saving and non-action states invoke neither.
- Prove fast double-confirm is exactly one and StrictMode mount/keyed remount are zero before ledger reset.
- Prove disabled-removal, callback swap/duplicate, saving transition/label, propagation, Escape cleanup, focus-trap, and package inclusion mutations are RED.
- Apply only the minimal leaf-local product change justified by RED, using already emitted classes. Then immediately run the production build and all 153 budgets.

## 3. TDD exact adapter and QA companion

- Add exact catalog/adapter tests for six canonical and nineteen interaction scenarios.
- Implement one lower-camel QA-only controlled companion with explicit original component-file/export mapping.
- Fail closed for all unknown or mismatched phase/theme/interaction/target/action/system/module values.
- Prove QA identifiers and companion module paths are absent from production chunks.

## 4. Register totals and package regression

- Change only the direct SaveDialog manifest entry from pending to registered.
- Verify registered `450/1,010`, pending `560`, direct `70,861`, valid `71,864`.
- Keep the hosted occurrence pending.
- Add the focused actual test exactly once to pre-harness, prove missing/duplicate inclusion RED, and record post-slice pre/full counts.

## 5. Capture authoritative evidence

- Warm up outside final artifact paths.
- Capture exactly `25/25` at 320x844 with fresh/expand-tall-flow and full portal capture.
- Verify attempt one, failed/recovered zero, callback/focus flags, unique scenarios/artifacts, nonzero/hash-complete PNGs, report SHA, PNG aggregate, and legal equal-image groups.
- Verify prior report and root evidence diffs are zero.

## 6. Regression and clean closure

- Run focused actual/callback tests, shared PlainDialog/Button regressions without editing them, catalog/adapter/contracts, inventory, state generation, pre/full harness, production isolation/import/audit/reflow, DOM probe, TypeScript, production build, all 153 budgets, Priority 0 validation, and scoped diff checks.
- Reproduce exact totals, focused tests, TypeScript, build, isolation, and artifact hashes from final HEAD where dependencies are committed. Record the unrelated known global clean-package residual separately.
- Keep bundle/dist generated reports and every unrelated concurrent path unstaged and unchanged by slice commits.

## 7. Independent review

- A separate reviewer checks the 25-state proof, callback exactness and mutation resistance, portal/focus/body lifecycle, touch/overflow, evidence, package integration, CSS, clean scope, concurrency, and policy.
- Critical or Important findings return to the original implementer. Product, manifest, or interaction-output corrections require fresh affected evidence.
