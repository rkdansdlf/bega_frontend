# Mate list control leaves mobile Visual QA task report

## Outcome

`MateStatusTabs`, `MateSortDropdown`, and `MateSeatFilterButtons` now expose stable mobile QA targets, correct pressed/selected ARIA state, and verified 44px/contained/local-scroll behavior. Their stateful Visual QA wrappers live only in `src/components/visual-qa/MateListControlLeavesHarnesses.tsx`; production leaf modules neither define nor import QA companions.

The direct matrix is exactly `21 + 30 + 28 = 79`. Status and Sort each retain four fully host-owned aliases under the existing six-scenario Mate root report, while Seat hosted remains intentionally pending. The generated system totals are exactly registered `445/1,010`, pending `565`, direct `70,712`, valid `71,715`.

## Product decisions

- Status: `h-11`, stable group/button test IDs, `aria-pressed`, and owned active/motion-reduced feedback.
- Sort: start-aligned contained menu, stable trigger/option test IDs, menu label, `aria-checked`, and owned active/motion-reduced feedback.
- Seat: stable group/button test IDs, `aria-pressed`, owned feedback, and leaf-only `shrink-0`. The latter is the minimal fix proven by the initial toolbar RED and uses an already-emitted utility.
- No parent controller/hooks, `MateListControlsRuntime`, shared `Button`, resolver/static-data module, API, auth, query semantics, global CSS, or external baseball-data path was changed by the leaf implementation. The clean-checkout gate proved that the already-developed `PlainMenu.ariaLabel` capability was a missing prerequisite; its two audited paths were consumed separately after explicit approval (details below).

## Evidence artifacts

| Surface | Rows | Report SHA-256 | Distinct PNG hashes |
| --- | ---: | --- | ---: |
| Status | 21 | `d15b1f0bc578dff3e44856ae07ae0c9cddfa67715027fd77b85fb6191b86cce8` | 16 |
| Sort | 30 | `91d18d78313ca2a2db4da20c87de7c7bbfe437a002895bbd44688f61e02fa432` | 25 |
| Seat | 28 | `8d17f9752e946ead4c4e7faa90bddd52b7df945a0551c2dc94249908034d15cb` | 27 |
| Mate root | 6 | `e54b005b6e47388bd1df7af61862cba1832f9a23c532f11538e78d8ac39604f8` | 6 |

- Four-report aggregate SHA-256: `9e5464e18c21c49e9e839c76029b44c7af8860fc4bd5a380d7578dece261b0e5`.
- Sorted 85-PNG path+content aggregate SHA-256: `1a1d269b4ebc8b4ef99bd819a511c9c65f72d98ffa981e068440215a737e81dd`.
- All reports use fresh pages, `320 x 844`, `expand-tall-flow`; every row passes on attempt one, with failed/recovered zero.
- The Mate root IDs are unchanged and all six were freshly replaced. The report set has no tracked predecessor in the base tree, so there is no byte-level prior report to diff; scenario IDs were checked against the fixed contract and root IDs remained exact.

## Regression and isolation

Actual mounted tests verify 320/390 geometry, ARIA, exact Tab/Escape DOM state, local versus document overflow, callback value/count isolation, outside/Escape close, resize/open/scroll callback zero, StrictMode, and external API/query/auth count zero. Reciprocal and missing callback mutations are proven RED.

The shared interaction harness now treats click/press-key state as a mutation: after viewport expansion it verifies mandatory final selectors without replaying setup or the mutation target. Missing result verifiers fail closed. Hover, focus, pressed, fill, and select-option keep their existing target-state revalidation.

QA companion resolution preserves the production component ID and source `file` while selecting a separate `moduleFile`. Unknown companion modules or a wrapper assigned to the wrong leaf fail closed. The production build contains no companion path or lower-camel wrapper symbol.

After the isolation move, screenshotless full-79 runs resolved every entry but encountered random five-second initial-selector load delays under concurrent fresh-page workers. The delayed IDs did not repeat consistently. A dedicated warmed-server run of their ten-entry union, including the prior Sort pressed-latest failure twice, passed `10/10` with failed/recovered zero. These `/tmp` warmups are diagnostic only; the committed captured reports remain the clean attempt-one evidence.

The authoritative interaction results are therefore the original captured reports (all 85 rows attempt one, failed/recovered zero), the mutation-resistant actual mounted suite (`3/3`), the exact catalog matrix (`79`), and the clean sequential delayed-ID union (`10/10`). Concurrent screenshotless full-79 warmups are recorded as load-timing diagnostics, not substituted for captured evidence.

### Consumed prerequisite

The initial detached `tsc` was RED because `MateSortDropdown` supplies `ariaLabel="메이트 정렬"` but base `PlainMenuProps` did not yet contain the audited working-tree capability. After explicit scope-exception approval, only these two paths were committed separately as `9d6a6f20`:

- `src/components/ui/plain-menu.tsx` (`f6f3acd9da1ce9bb8c7b3fdf6ce4b5a6caa4d015d20094ca667646d8fb1f0449`): optional `ariaLabel` forwarding and existing mobile min/max/overflow containment.
- `src/components/ui/plain-menu.test.ts` (`dcfeb584d3881fd209b9e843e3d5d387c969e14d1fabbabb2e789a3d7f7520fe`): viewport containment, alignment/role/label, outside-pointer, and Escape coverage; `3/3` green.

No unrelated PlainMenu hunk was present or consumed.

## Gates

- Focused Mate leaves/root/runtime/controller, TodayCountBadge, GlobalError, and duplicate offseason coordinator: green.
- Contract `13/13` plus check; inventory unit `17/17`; skeleton `4/4` plus `104` usage check; state unit `19/19`; pre-harness `157/157`: green.
- Full harness `398/398`; isolation/import/audit/reflow `46/46`; DOM probe; TypeScript; production build `153/153`; Priority-0 policy; generated-contract diff: green.
- Main build global CSS `255,465/255,500` bytes (`35` bytes headroom).
- Inventory check's only blockers are the concurrent Landing set (`15` unclassified, one stale); this task adds zero unclassified symbols.

## Clean closure and commits

- Implementation commit: `ead17989`.
- Evidence/report commit: `b6bae5d9`.
- Approved PlainMenu prerequisite commit: `9d6a6f20`.
- Detached clean checkout at `9d6a6f20`: PlainMenu `3/3`; TypeScript green; catalog/state `264/264`; actual ReactDOM/Chromium `3/3`; generated totals exact; production build `1,179` modules and all `153/153` budgets green; clean CSS `252,072` bytes; production wrapper/companion search zero; committed report and PNG aggregate hashes unchanged.
- Final staged index remained `99` paths with SHA-256 `59b53ceb5bb8a4bb4e1e3e0afa2c75b2e31dc92f1463e96c0efaed05d9d914bc`; the concurrent Landing selector hunk remained present and outside all task commits.
