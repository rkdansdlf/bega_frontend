# Client Error Trend Chart Mobile Visual QA Plan

> Execution mode: subagent-driven. One implementer owns the bounded component task, followed by an independent read-only reviewer.

## Task 1: Component behavior and mobile accessibility (TDD)

**Files:**

- Add: `src/components/admin/ClientErrorTrendChart.mobile.test.tsx`
- Modify: `src/components/admin/ClientErrorTrendChart.tsx`

Write focused tests first for loading/empty status semantics, populated accessible SVG naming, 320px-owned horizontal scroll, bounded visible labels with full-title preservation, duplicate labels, and low-value tick deduplication. Capture a genuine RED result.

Implement the production design without changing the prop contract or series data. Keep the root width bounded, make the chart canvas horizontally scrollable/readable, sample/truncate only painted x-axis labels, deduplicate ticks, and use collision-safe keys. Run the focused component tests in GREEN.

## Task 2: Direct adapter and manifest registration (TDD)

**Files:**

- Modify: `src/visual-qa/stateAdapters.test.ts`
- Modify: `src/visual-qa/stateAdapters.ts`
- Modify: `src/visual-qa/harnessCatalog.test.ts`
- Modify: `contracts/visual-qa-component-states-v1.json`

Add failing adapter and catalog tests for the exact 8 idle fixtures plus one canonical loading fixture. Reuse the existing lazy chart import and existing client-error fixture helpers where safe. Reject undeclared data/system/permission/interaction/theme combinations.

Register `src/components/admin/ClientErrorTrendChart.tsx#ClientErrorTrendChart` as direct/module-export with adapter `admin.client-error-trend-chart`, explicit reasons/evidence, and a constraint excluding loading for every non-empty data value. Assert exactly 9 generated IDs and exact state membership.

Run focused adapter/catalog tests in GREEN. Confirm authoritative counts.

## Task 3: Static release gates

Run:

```bash
node --import tsx --test src/components/admin/ClientErrorTrendChart.mobile.test.tsx
node --import tsx --test --test-name-pattern "client-error trend chart" src/visual-qa/stateAdapters.test.ts src/visual-qa/harnessCatalog.test.ts
npm run visual-qa:states:test
npm run visual-qa:states:check
npm run visual-qa:inventory:test
npm run visual-qa:inventory:check
npm run visual-qa:contract:test
npm run visual-qa:contract:check
node --test scripts/lib/visual-qa-production-isolation.test.mjs scripts/visual-qa-import-graph.test.mjs
npx tsc --noEmit
npm run build
git diff --check
python3 ../scripts/validate_baseball_data_policy.py
```

Run strict completeness separately. The only accepted failure is exactly 583 pending with zero errors/missing/stale/duplicates.

## Task 4: Fresh Chromium evidence

Run the bundled component-state harness with:

```bash
VISUAL_QA_HARNESS_COMPONENT_IDS='src/components/admin/ClientErrorTrendChart.tsx#ClientErrorTrendChart' \
VISUAL_QA_HARNESS_CAPTURE_HEIGHT_MODE=expand-tall-flow \
VISUAL_QA_HARNESS_PAGE_MODE=fresh \
VISUAL_QA_HARNESS_REPORT=reports/visual-qa-admin-client-error-trend-chart-mobile.json \
VISUAL_QA_HARNESS_SCREENSHOTS_DIR=reports/visual-qa-admin-client-error-trend-chart-mobile-screenshots \
npm run visual-qa:harness:component-states
```

Require expected/actual/passed 9/9/9, failed and recovered 0, all first attempt. Verify exact current IDs, unique report paths, all nonzero PNGs, no missing/stale IDs, 320×844 viewport, fresh page mode, and bounded overflow/semantics. Inspect loading, empty, low-value/duplicate-label, long/unbroken, and maximum representative PNGs.

## Task 5: Documentation, scoped commit, and independent review

**Files:**

- Modify: `docs/VISUAL_QA.md`
- Write ignored report/progress files under `.superpowers/sdd/2026-08-29-client-error-trend-chart-mobile-visual-qa/`

Document measured counts and evidence without claiming global completeness. Commit only owned tracked paths. Dispatch an independent reviewer; return Critical/Important findings to the original implementer verbatim and re-review after fixes.

