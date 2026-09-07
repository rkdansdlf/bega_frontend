# Admin Community Leaf Panels Mobile Visual QA Implementation Plan

Date: 2026-08-29
Design: `docs/superpowers/specs/2026-08-29-admin-community-leaf-panels-mobile-visual-qa-design.md`

## 1. Lock the direct contract with RED tests

- Add focused mobile tests for `MatesAdminPanel`, `PostsAdminPanel`, and `UsersAdminPanel`.
- Add adapter/catalog RED tests for the exact 18 + 18 + 31 legal state matrix.
- Preserve the failing output in the SDD task report before production changes.

## 2. Implement minimal production hooks

- Add only bounded layout defaults, accessibility semantics, stable test ids, pressure-value titles, and existing-class 44px mobile targets.
- Preserve all API callbacks, authorization rules, deletion rules, role rules, and parent props.
- Keep fixtures entirely static and internal.

## 3. Register fail-closed direct states

- Extend `stateAdapters.ts` with component-specific static fixture inventories without changing existing hosted-runtime fixtures.
- Register exactly 67 scenarios in the canonical state manifest.
- Update Visual QA documentation through the established generator/contract path.

## 4. Verify component and contract regressions

- Run the three focused component suites.
- Run focused adapter/catalog tests, then the complete adapter/catalog, state-generator, inventory, coverage-contract, production-isolation, and import-graph suites.
- Run TypeScript, production build, bundle/CSS budgets, diff check, and baseball-data policy validation.
- Explicitly confirm that component render paths make no duplicate API calls and that adapters use no network/API seam.

## 5. Capture final Chromium evidence

- Run one isolated combined harness for the three exact component IDs at 320x844, fresh page, expanded tall flow.
- Inspect representative empty, loading, pressure, maximum, permission, role-change, and dialog PNGs.
- Reject recovered or retry evidence; recapture after adding a regression test if a visual defect is found.

## 6. Independent review

- A different reviewer verifies immutable hashes, scoped diffs, exact matrix membership, production behavior preservation, generated totals, focused tests, and final PNG/report integrity.
- Critical or Important findings return to the original implementer before approval.
