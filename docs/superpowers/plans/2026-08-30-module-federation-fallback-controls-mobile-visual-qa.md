# Module Federation Fallback Controls Mobile Visual QA Plan

Date: 2026-08-30

## 1. Freeze matrices and callback precedence

- Fix Button at `48`, Modal at `21`, no hosted registration, and no root recapture.
- Fix modal callback precedence to one compatibility branch per close request: `onOpenChange(false)` first, otherwise `onClose()`.
- Preserve probe/AppRoutes/shared UI, the Mobile baseline, staged 99 paths, concurrent Landing work, and CSS 35-byte headroom.

## 2. TDD actual product behavior

- Add failing actual Vite+ReactDOM+Chromium tests for Button touch/overflow/disabled/native callbacks and Modal portal/close/backdrop/Escape/focus/body-lock behavior at 320/390.
- Prove current dual callback dispatch is RED, plus callback-twice, missing-fallback, visibility-precedence, propagation, listener-cleanup, body-restore, and focus-trap mutations.
- Apply minimal fallback-only product fixes using already emitted classes. Do not edit shared Button or PlainDialog.
- Run the production build and all 153 CSS/bundle budgets immediately after first product GREEN.

## 3. TDD exact direct adapters and QA companions

- Add exact Button `34+14=48` and Modal `10+11=21` state tests.
- Implement lower-camel QA-only companions with explicit module files and controlled callback ledgers.
- Fail closed for every unknown/mismatched component/module/export/data/presentation/callback/interaction axis.
- Prove QA companion identifiers and paths are absent from production chunks.

## 4. Register exact totals and package regression

- Change only the two direct manifest entries from pending to registered.
- Verify registered `449/1,010`, pending `561`, direct `70,836`, valid `71,839`.
- Add the new actual test exactly once to pre-harness; prove missing or duplicate inclusion is RED and record post-slice pre/full counts.
- Keep RemoteButton/RemoteModal/RemoteThemeProvider/AppRoutes hosted entries pending.

## 5. Capture authoritative evidence

- Warm up outside final artifact paths.
- Capture Button `48/48` and Modal `21/21` at 320x844 with fresh/expand-tall-flow.
- Verify failed/recovered zero, attempt one, portal-complete Modal images, interaction flags, callback results, artifact/hash integrity, and legal identical-image groups.
- Verify all Mate/Mobile/DateRail and prior report/PNG diffs are zero.

## 6. Regression and clean closure

- Run focused fallback/probe/shared UI and duplicate-call tests, prior GlobalError/Mate coordinators, contracts, inventory, state generation, pre/full harness, isolation/import/audit/reflow, DOM probe, TypeScript, build, all 153 budgets, Priority 0 policy, and diff checks.
- Reproduce exact state totals, actual tests, TypeScript, build, production isolation, and report/PNG hashes from a detached checkout at final HEAD.
- Preserve staged 99 paths/fingerprints, concurrent Landing selector, known inventory residual, and prior report hashes.

## 7. Independent review

- A separate reviewer checks callback precedence and mutation resistance, Button mapping/touch/overflow, Modal portal/focus/body lifecycle, exact state math, artifacts, package integration, CSS, clean scope, preservation, and policy.
- Critical or Important findings return to the original implementer. Product, manifest, or interaction-output changes require fresh affected evidence.
