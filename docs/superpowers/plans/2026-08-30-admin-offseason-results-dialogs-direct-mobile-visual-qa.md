# Admin Offseason Results and Dialogs Direct Mobile Visual QA Plan

Date: 2026-08-30

## 1. Freeze contracts

- Preserve Results/Dialog public props and all Content/root hosted mappings.
- Preserve API/auth/payload/coordinator semantics and shared `PlainDialog`.
- Fix Results `25` and Dialogs `41` state IDs before implementation.

## 2. TDD the direct adapters

- Add failing tests for the two direct export IDs, exact matrix dimensions, fail-closed fixtures, portal capture scope, and controlled value updates.
- Add actual mounted-component tests for callback identity, exact arguments, exact call counts, unrelated callback zero counts, and resize-without-replay.
- Implement the smallest stateful static adapter hosts needed to pass.

## 3. TDD mobile and interaction contracts

- Prove 320px loading/empty/CSV/table containment for Results.
- Prove dialog reflow, scroll reachability, 44px controls, titles/wrapping, portal focus loop, and create/edit/delete/submitting modes.
- Use one-shot input/select actions with exact result and callback evidence.

## 4. Register exact states

- Register Results `8 data + 8 canonical + 9 interaction = 25`.
- Register Dialogs `13 default/canonical + 28 interaction = 41`.
- Keep Content hosted `43`, Results hosted `42`, Dialogs hosted `11`, and root `44` unchanged.
- Verify registered `437/1,010`, pending `573`, direct `70,576`, valid `71,579`.

## 5. Fresh evidence

- Warm up outside final evidence.
- Capture Results `25/25` and Dialogs `41/41` at 320x844 with fresh/expand-tall-flow.
- Verify failed/recovered zero, attempts one, unique/nonzero/hash-complete artifacts, and all interaction verification flags.
- Record reproducible report and PNG aggregate hashes.

## 6. Regression and release gates

- Run focused Results/Dialogs/Content/root/coordinator tests and admin regression.
- Run component-state generation, contract/inventory/state/harness, isolation/import/audit/reflow, DOM probe, TypeScript, build, budgets, policy, and diff gates.
- Preserve and fingerprint unrelated staged/working changes; report concurrent inventory blockers separately.

## 7. Independent review

- A separate read-only reviewer inspects direct-export ownership, actual mounted callback behavior, portal/mobile behavior, exact state math, unchanged hosted/root mappings, report/PNG integrity, and policy compliance.
- Critical or Important findings return to the original implementer for TDD correction and fresh evidence when product/manifest behavior changes.
