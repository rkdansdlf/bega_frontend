# Admin Offseason Content Direct Mobile Visual QA Plan

Date: 2026-08-30
Design: `docs/superpowers/specs/2026-08-30-admin-offseason-content-direct-mobile-visual-qa-design.md`

## 1. Record valid RED

- Add Content source/mobile tests for its root, production fallbacks, bounded empty state, touch targets, controlled values, callbacks, no-API path, and renderer fail-closed behavior.
- Add adapter/catalog tests for exact `8 + 15 + 13 = 36` and capture split.
- Add harness RED for `select-option` value and post-expansion result verification.
- Strengthen the existing root dialog-section contract with an exact selected-result requirement and record its RED.

## 2. Implement minimal Content/leaf fixes

- Add the standalone Content root identity and visible production lazy fallbacks.
- Move empty Results outside the wide table canvas.
- Add only scoped compact/title/touch/accessibility changes needed by direct evidence.
- Preserve all prop callbacks, internal section/team constants, and existing data behavior.

## 3. Register direct adapter

- Build a small stateful adapter host for controlled Content and dialog fields while rendering the exact production Content, Results, and Dialog exports.
- Use static internal fixtures only and reject every undeclared tuple.
- Register only the Content module export; preserve existing hosted entries and pending nested module exports.

## 4. Correct real select interactions

- Add a generic, one-shot `select-option` harness action with exact value verification before and after viewport expansion.
- Apply it to Content team/dialog-section states and the existing root dialog-section state.
- Ensure it never repeats another callback during capture verification.

## 5. Verify and capture

- Run focused/full component, adapter/catalog, harness, state/inventory/coverage/isolation tests, TypeScript, build/budgets, diff, and baseball policy.
- Warm up outside evidence.
- Recapture Content 36 and replacement root 44 at 320x844/fresh/expand-tall-flow.
- Verify all integrity fields and representative PNG/DOM states.

## 6. Independent review

- A separate reviewer inspects direct-export ownership, real callback/select behavior, empty/fallback visibility, exact state math, unchanged root/host mappings, report integrity, and policy compliance.
- Critical or Important findings return to the original implementer.
