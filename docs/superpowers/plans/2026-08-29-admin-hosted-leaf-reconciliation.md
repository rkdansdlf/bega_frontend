# Admin Hosted Leaf Visual QA Reconciliation Plan

> Execution mode: subagent-driven, one implementer followed by an independent read-only reviewer.

## Task 1: Add a failing exact-host regression contract

**Files:**

- Modify: `src/visual-qa/harnessCatalog.test.ts`

Add one focused test named with `admin hosted leaf reconciliation`. It must load the fifteen exact state entries and assert that they are still pending before implementation. Then encode the intended GREEN contract:

- all fifteen entries are registered/hosted with `render.mode === 'hosted'`;
- all four axes and variants contain evidence-bearing `notApplicable` metadata;
- constraints are empty;
- every host ID exists in `AUTOMATIC_COMPONENT_STATE_SCENARIOS`;
- host counts are exactly 1 per Community entry, 1 per Game Status entry, and Stadium counts `1 / 2 / 1` for delete/place/panel;
- the exact host ID sets match the approved predicates in the design.

Run in RED:

```bash
node --import tsx --test --test-name-pattern "admin hosted leaf reconciliation" src/visual-qa/harnessCatalog.test.ts
```

Expected: fail because the fifteen entries remain pending.

## Task 2: Register only the fifteen proven hosted entries

**Files:**

- Modify: `contracts/visual-qa-component-states-v1.json`

Replace only the fifteen pending shells with registered hosted entries. Reuse the established `frontend-admin` hosted metadata shape and point `testEvidence` at the focused catalog test. Do not modify classifications, parent state matrices, adapters, components, APIs, or auth.

Approved host mapping:

- Community:
  - `UsersAdminPanel`: maximum-supported, super-admin, users, resolved panel, closed role dialog, dark.
  - `PostsAdminPanel`: maximum-supported, admin, posts, resolved panel, closed role dialog, dark.
  - `MatesAdminPanel`: maximum-supported, admin, parties, resolved panel, closed role dialog, dark.
  - `AdminRoleChangeDialogContent`: maximum-supported, super-admin, users, resolved panel and role dialog, dark.
- Game Status: all eight point to the one maximum-supported, admin, default interaction, idle, active, dark scenario.
- Stadiums:
  - panel: maximum-supported, admin, idle, closed dialog, resolved panel, selected, dark;
  - place dialog: the matching create-resolved and edit-resolved scenarios;
  - delete dialog: the matching delete-resolved scenario.

Run the focused test in GREEN.

## Task 3: Prove preserved Chromium evidence and authoritative totals

Read and compare scenario IDs in:

- `reports/visual-qa-admin-community-runtime-mobile.json` (33/33)
- `reports/visual-qa-admin-game-status-repair-panel-maximum.json` (14/14)
- `reports/visual-qa-admin-stadiums-runtime-mobile.json` (27/27)

Assert every referenced result passed and references a nonzero screenshot where the report provides one. Then run:

```bash
node --import tsx --test --test-name-pattern "admin hosted leaf reconciliation" src/visual-qa/harnessCatalog.test.ts
npm run visual-qa:states:test
npm run visual-qa:states:check
npm run visual-qa:inventory:test
npm run visual-qa:inventory:check
npm run visual-qa:contract:test
npm run visual-qa:contract:check
npm run test:typecheck
python3 ../scripts/validate_baseball_data_policy.py
```

Run the strict state completeness command separately. Its only accepted failure is exactly 584 pending entries. Confirm authoritative totals before documenting them; do not force the design-time expected numbers if the generator disagrees.

## Task 4: Document and independently review

**Files:**

- Modify: `docs/VISUAL_QA.md`
- Write ignored task report under `.superpowers/sdd/2026-08-29-admin-hosted-leaf-reconciliation/`

Document the exact registered/pending/direct/valid counts, preserved report totals, and explicit global limitation. Commit only owned paths. Dispatch an independent read-only reviewer and fix any Critical or Important finding through the original implementer.

