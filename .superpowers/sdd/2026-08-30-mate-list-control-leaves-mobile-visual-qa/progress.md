# Progress

## Fixed inputs

- Design SHA-256: `c8a33346694790e11692d2e10ad02a714ea3bc704c5967e8cf6019a79400f259`
- Plan SHA-256: `c68b0e0e9d7d9b38cecc3796b768ce7fdd8e61f2d1ecfe6aa0d4076f251154f8`
- Constraints SHA-256: `dd29d50ae5cfc90138f4878af5abd8b31257376c01d1b16d2719d24157c65e8a`

The approved design, plan, and constraints were not edited during implementation.

## TDD log

1. Product RED: the four status buttons measured `74.5 x 32`; the Sort menu was already contained (`320px: x=96, width=224, right=320`; `390px: x=166, width=224, right=390`); the Seat toolbar did not provide a reachable local-scroll target (`clientWidth=320`, `scrollWidth=320`, `scrollLeft=0`) although document overflow was zero. Callback checks were initially exact-one for intended actions and zero for unrelated actions.
2. Product GREEN: Status uses `h-11` and all buttons measure `74.5 x 44`; Sort uses start alignment and the menu is `x=0, right=224` at both widths; Seat uses the already-emitted `shrink-0` utility, giving `scrollWidth=488`, `scrollLeft=168`, later-target reachability, and document overflow zero. The leaf-only `shrink-0` addition is an implementation clarification derived from the actual RED; the immutable design documents remain unchanged.
3. Callback mutations: reciprocal Status/Sort callback wiring produced one failing test with five contract errors; a missing Seat callback produced one failing test with three contract errors. Restored behavior passed all three actual-mount tests under StrictMode.
4. Interaction revalidation RED: selected menu options and Escape failed because target/setup state was replayed after viewport expansion, while a missing final verifier did not fail closed. GREEN revalidates hover/focus/pressed/fill/select-option target state, but for click/press-key revalidates only mandatory final visible/hidden results. Expansion replay count is zero. Existing pointer/input semantics are unchanged.
5. QA isolation RED: moving lower-camel wrappers out of production initially failed with a missing companion and incorrect module key. A second fail-closed test showed a module-wide allow-list accepted the wrong leaf export. GREEN uses an exact `componentFile#exportName` allow-list for the QA-only companion; unknown modules and mismatched exports throw.
6. Clean-checkout prerequisite RED: the first detached `tsc` failed because the task's labelled Sort menu consumed `PlainMenu.ariaLabel`, while the base commit did not contain that existing working-tree capability. With explicit approval, the audited `PlainMenu` diff and its focused test were consumed in a separate prerequisite commit. The diff is limited to `ariaLabel` forwarding and already-verified mobile viewport containment; its focused suite passes `3/3`.

## Coverage and evidence

- Direct matrices: Status `21` (`8/3/1/4/4/1`), Sort `30` (`12/4/4/4/1/3/2`), Seat `28` (`11/4/4/4/4/1`), total `79`.
- Hosted: `MateListControlsRuntime.tsx#MateStatusTabs` and `#MateSortDropdown` each map to the same four Mate host scenarios (`results-fallback` light/dark, `runtime` light/dark), are fully host-owned, and generate zero direct combinations. Seat hosted remains pending.
- Generated contract: registered `445/1,010`, pending `565`, direct `70,712`, valid `71,715`.
- Final reports: Status `21/21`, Sort `30/30`, Seat `28/28`, Mate root `6/6`; failed `0`, recovered `0`, every row attempts `1`.
- Artifact integrity: `85` report rows, `85` unique referenced PNG paths, `85` nonzero PNGs. Interaction verification flags are complete for Status `13/13`, Sort `18/18`, and Seat `17/17`.
- Final reports were not recaptured after the QA companion move: the wrapper bodies and adapter inputs are unchanged, the post-move actual DOM test passes, and post-move screenshotless runs exercised all 79 entries through the new module resolution. Three non-authoritative full runs exposed random, non-repeating five-second initial-selector load delays (`79/79` with recovered `3`; `78/79` with recovered `4`; dedicated-server `78/79` with recovered `1`). The union of all ten delayed entries then passed sequentially `10/10`, failed/recovered `0`; the previously failed Sort pressed-latest entry was included twice and passed twice. The relocation is production-import isolation only and cannot change rendered output; the final captured reports remain the clean failed/recovered-zero evidence.

Legal visual equivalence groups are documented rather than treated as missing evidence: Status selected states equal their matching controlled defaults and focus-recruiting equals its Tab target; Sort selected states equal matching closed defaults, Escape returns focus to the trigger, and active-latest hover equals the open default; Seat focus-red equals the Tab target.

## Verification log

- Actual ReactDOM + Chromium: `3/3`.
- Harness catalog: `97/97`, including exact direct matrices and companion fail-closed routing.
- Generated state contract: `445/1,010`, pending `565`, valid `71,715`.
- Full harness suite: `398/398` (the previous `397` plus the new companion fail-closed test).
- Production isolation, import graph, audit library, and reflow tests: `46/46`.
- TypeScript: `npx tsc --noEmit` passed.
- Production build: `5,736` modules, all `153/153` bundle budgets passed. Global CSS is `255,465/255,500` bytes, headroom `35`.
- Entire production `dist` contains zero occurrences of the three lower-camel wrapper names and zero occurrences of `MateListControlLeavesHarnesses`; the three leaf chunks remain independent.
- Post-isolation screenshotless coverage: all direct `79` entries resolved through the companion; the ten entries that encountered non-repeating initial-load delays passed sequentially `10/10`, failed/recovered `0`, on a dedicated warmed server.
- Priority-0 baseball-data policy and generated-contract diff checks pass.
- Inventory generation exits only for the pre-existing concurrent Landing group: `15` unclassified lower exports and one stale `LandingAppPreview.tsx#PREVIEW_POINTS`; Mate additions contribute zero unclassified symbols.
- Detached clean closure at `9d6a6f20`: PlainMenu `3/3`, TypeScript, catalog/state adapters `264/264`, state generation (`445/1,010`, pending `565`, valid `71,715`), actual Chromium `3/3`, and production build `153/153` all pass. The clean base builds `1,179` modules and `252,072` CSS bytes; differing clean CSS is expected because the remaining staged99 is absent. Production `dist` still contains zero wrapper/companion identifiers, and all committed report/PNG hashes match main evidence.

## Shared-tree preservation

- Initial and pre-commit staged index: `99` paths, staged binary diff SHA-256 `59b53ceb5bb8a4bb4e1e3e0afa2c75b2e31dc92f1463e96c0efaed05d9d914bc`.
- Concurrent Landing selector hunk in `stateAdapters.ts` (`.landing-phone-screen` to `.landing-phone-frame`) remains unstaged by this task and is excluded from its commits.
- Generated bundle/dist reports are not owned by this task and are excluded from its commits.
- Approved prerequisite consumed paths: `src/components/ui/plain-menu.tsx` SHA-256 `f6f3acd9da1ce9bb8c7b3fdf6ce4b5a6caa4d015d20094ca667646d8fb1f0449` and `src/components/ui/plain-menu.test.ts` SHA-256 `dcfeb584d3881fd209b9e843e3d5d387c969e14d1fabbabb2e789a3d7f7520fe`, committed alone as `9d6a6f20`.
