# Admin Offseason Movement Root Mobile Visual QA Implementation Plan

Date: 2026-08-29
Design: `docs/superpowers/specs/2026-08-29-admin-offseason-movement-root-mobile-visual-qa-design.md`

## 1. Preserve immutable inputs and record RED

- Hash the design, plan, and constraints.
- Add focused coordinator tests for identical-key single-flight, different-key latest-wins, retry after settle/failure, and deactivation.
- Add focused mutation tests for rapid duplicate create/update/delete/import and exactly one post-success refresh.
- Add root mobile/accessibility and exact adapter/catalog/hosted-evidence tests.
- Record valid failing output before implementation.

## 2. Implement request and mutation coordination

- Extract the smallest testable request coordinator that normalizes filter keys, reuses identical in-flight work, and gates commits by latest revision.
- Route mount, apply, reset, refresh, and post-mutation refresh through it.
- Add synchronous mutation/import guards while retaining the existing API payloads, success/error copy, and intentional CSV row loop.
- Disable destructive confirmation during submission.

## 3. Add the production-isolated Visual QA state seam

- Provide static non-production fixtures for the exact 8 data and 16 lifecycle/lazy presets.
- Keep `active=true` while preventing all API calls in fixture mode.
- Exercise the real lazy Content, Results, and Dialog components in host-eligible states.
- Do not change existing internal API modules or add any external data path.

## 4. Add minimal mobile/a11y hooks

- Bound the root and responsive header/actions.
- Name inputs, selects, dates, table, row actions, statuses, alerts, and dialogs.
- Add stable root/row/action/dialog selectors and compact pressure-value presentation with full-value preservation.
- Reuse existing utility classes and shared mobile Button sizing to protect the CSS budget.

## 5. Register exact contracts and prove no duplicate calls

- Register exactly 44 direct root scenarios and only the three exact production lazy children as hosted.
- Reject every undeclared tuple or interaction target.
- Assert fixture mode calls no API and production mode retains the normalized request/mutation behavior.
- Run focused and full adapter/catalog, state generator, inventory, coverage, harness, isolation/import-graph, TypeScript, build, budget, diff, and baseball policy gates.

## 6. Capture and inspect final Chromium evidence

- Capture the exact root ID at 320x844, fresh page, expanded tall flow.
- Require 44/44 pass, attempt 1, unique/nonzero/hash-complete artifacts, and no missing/stale catalog entries.
- Inspect representative data, lifecycle, lazy, interaction, pressure, maximum, CSV, dialog, and submitting PNGs.

## 7. Independent review

- A separate reviewer validates immutable hashes, coordinator correctness, mutation counts, production isolation, exact matrix/host mappings, generated totals, tests, and PNG/report integrity.
- Critical or Important findings return to the original implementer.
