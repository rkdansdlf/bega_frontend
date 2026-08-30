# Mate mobile date filter mobile Visual QA task report

## Outcome

`MateMobileDateFilter` now exposes a contained, locally scrollable mobile surface with real `44px` date targets, stable owned selectors, preserved ARIA semantics, and exact callback isolation. Its stateful Visual QA companion lives only in `src/components/visual-qa/MateMobileDateFilterHarness.tsx`; the production module does not import it and the production bundle contains none of its identifiers.

The direct matrix is exactly `55` (`36` canonical plus `19` interactions). The existing hosted component retains four Mate root aliases. Generated totals are exactly registered `447/1,010`, pending `563`, direct `70,767`, and valid `71,770`.

## Product decisions

- Both date-button branches use `h-11`, stable per-date test IDs, and existing active/motion-reduced feedback classes.
- Root, selected-label, local scroller, all-date control, and date controls expose stable owned selectors.
- Existing callback values, button semantics, `aria-pressed`, selected-date rendering, horizontal scrolling, and shared `Button` behavior are preserved.
- No controller/runtime/Mate/shared Button/API/auth/query/global CSS/external baseball-data path changed.
- The immutable fixture `2027-12-31` is correctly rendered and asserted as Friday (`금`); the Thursday label in the design prose is recorded as a clarification rather than changing the immutable document.

## Evidence artifacts

| Surface | Rows | Report SHA-256 | Distinct PNG hashes |
| --- | ---: | --- | ---: |
| Mobile date filter | 55 | `03f4ee356856eb18ce94e30a31ff55e7daf5720ebc0234336532d419f5d9ef2f` | 45 |
| Mate root | 6 | `a07de101c6db11c91e4dfa051385c2920ded8589f6cd28ffb3d4abd2e6d186cb` | 6 |

- Two-report path+report-hash aggregate: `f4a03dc015e6ce827bdaa962e65f11922521303479cefd367d345d04e550ba87`.
- Mobile 55-PNG path+content aggregate: `bd690403c3fb64970e98b988094c73cd6741e639e0361c06bf100cb5af236fc6`.
- Mate root 6-PNG path+content aggregate: `8eb45f4b510b2d5115d064cb222144bdc2c510832539885cc64b82967700884f`.
- Combined sorted 61-PNG path+content aggregate: `4cc04982fd1d6b1220bbedd4c3d2fa1d3f6ff8dd93425f0967d0e11c6c1290eb`.
- All rows are fresh Chromium pages at `320 x 844` with `expand-tall-flow`, attempt one, failed/recovered zero. All `19` interaction rows have complete verification flags.

The seven equal-hash groups are legal: boundary/maximum fixtures expose the same leading offscreen rail result for matching selections, controlled selection interactions converge to their matching canonical final state, and keyboard scroller-to-all converges to the same final focus as focus-visible all. Exact group membership is recorded in `progress.md`.

## Regression and isolation

Actual mounted tests verify `320/390` geometry, every `44px` target, local versus document overflow, heading/badge separation, first/middle/last reachability, Tab and ArrowRight state, callback value/count, StrictMode, and zero unrelated/network/resize/scroll/keyboard callbacks. Reciprocal and missing callback mutations both fail.

The exact component-file/export allow-list resolves the QA-only lower-camel companion and fails closed for unknown modules or mismatched exports. Production `dist` contains zero companion identifiers. The package pre-harness script includes the Mobile actual file exactly once; the pre-existing omission of `MateListControlLeaves.mobile.test.tsx` is intentionally left as a separate residual rather than expanding this slice.

## Gates

- Mobile actual `2/2`; focused serial actual regression `13/13`.
- Package pre-harness `159/159`; full harness `401/401` (previous `398` plus three).
- Contract `13/13` plus valid check; state unit `19/19`; inventory unit `17/17`; production isolation/import/audit/reflow `46/46`; DOM probe; TypeScript; Priority-0 data policy: green.
- State generation: `447/1,010`, pending `563`, direct `70,767`, valid `71,770`.
- Inventory residual remains Landing-only (`15` unclassified plus one stale); this slice adds zero.
- Production build: worker `17`, client `5,736`, all `153/153` budgets, CSS `255,465/255,500` bytes.

## Clean closure and commits

- Implementation commit: `9488650d`.
- Evidence commit: `3bc9f894`.
- Detached clean code/evidence checkout at `3bc9f894`: package inclusion `1/1`, catalog/state `266/266`, Mobile actual `2/2`, TypeScript, exact generated totals, production build `1,179` modules and `153/153` budgets, clean CSS `252,072`, production companion identifiers zero, and committed report hashes unchanged.
- The immutable design, plan, and constraints are included byte-for-byte with the final documentation commit because they were not previously reachable from HEAD.
- User staged99 names and binary fingerprints remain exactly `e63eea5ed9284987100166b8d114c5fbf874f5332123876e227cfb15d429aad0` and `59b53ceb5bb8a4bb4e1e3e0afa2c75b2e31dc92f1463e96c0efaed05d9d914bc`.
- The concurrent Landing selector hunk remains in the working tree and outside all task commits. DateRail source, adapter, reports, and screenshots are outside this slice; its report and artifact hashes are unchanged.
