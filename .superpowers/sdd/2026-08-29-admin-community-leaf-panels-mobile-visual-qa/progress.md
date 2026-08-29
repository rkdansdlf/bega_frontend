# Progress

## Immutable inputs

- Design SHA256: `afde01bec8ba5c18ea8f28830bb0dcebc8dd39979af0114a319f5624e8429b46`
- Plan SHA256: `dac1ed4c4391e768846b24f3c3eebad7d16d2ca12dc3e1237dda149542e9d4d4`
- Constraints SHA256: `e34420c677f744f41da1087eca67fe4b344752bf38990064ccfe94d2d953c701`

## RED evidence

Production source and the state manifest/adapters were unchanged before both RED runs.

1. Focused component contract:

   `node --import tsx --test --test-concurrency=1 src/components/admin/MatesAdminPanel.mobile.test.tsx src/components/admin/PostsAdminPanel.mobile.test.tsx src/components/admin/UsersAdminPanel.mobile.test.tsx`

   Result: `tests 10 / pass 3 / fail 7`. The three passing tests prove the pre-existing panels were already pure prop/callback surfaces without API calls. The seven failures identify the missing bounded roots, named/default-width tables, pressure titles, loading semantics, accessible/stable action hooks, and explicit touch-target contract.

2. Focused adapter/catalog contract:

   `node --import tsx --test --test-concurrency=1 --test-name-pattern="admin community leaf panel" src/visual-qa/stateAdapters.test.ts src/visual-qa/harnessCatalog.test.ts`

   Result: `tests 2 / pass 0 / fail 2`. Catalog failed because `MatesAdminPanel` was still `pending` rather than `registered`; adapter coverage failed because `admin.mates-panel` was absent. This is the intended pre-implementation RED baseline for the exact `18 + 18 + 31 = 67` direct states.

3. Browser-found controlled-input regression:

   The first isolated direct run was rejected at `66 / 67` because the Users search interaction did not preserve the changed value under the static harness. A focused non-production-only interaction test was added first and failed `tests 1 / pass 0 / fail 1`; the deterministic harness seam then made it green without changing the production controlled-input or callback contract.

4. Representative-PNG empty-state regression:

   A subsequent `67 / 67` run was also rejected after representative PNG inspection showed the empty message centered inside the `860px` table canvas and therefore off-screen at `320px`. Focused tests were added first:

   `node --import tsx --test --test-concurrency=1 --test-name-pattern="empty outcome visible" src/components/admin/MatesAdminPanel.mobile.test.tsx src/components/admin/PostsAdminPanel.mobile.test.tsx src/components/admin/UsersAdminPanel.mobile.test.tsx`

   Result: `tests 3 / pass 0 / fail 3`. Each failure required a named polite empty outcome outside the horizontally scrolling wide table.

5. Representative-PNG pressure-row regressions:

   The next fresh run passed all `67` scenarios, but representative long-Korean PNG inspection exposed pressure values wrapping inside `<td>` elements and making rows hundreds of pixels tall. That evidence was rejected. Focused compact-cell tests were added first and failed `tests 3 / pass 0 / fail 3`; full source values remain available through `title`, while nested one-line text elements now constrain the rendered rows.

   A later `67 / 67` recapture was rejected as well because maximum numeric values still wrapped in member/count cells. The compact-cell assertions were strengthened first and returned `tests 3 / pass 0 / fail 3`; the numeric groups now use no-wrap/min-width presentation without changing their values.

6. Independent-review role-select observability regression:

   The reviewer found that the Users `change/role-select` plan pressed `End` without asserting the final selected option; its PNG was byte-for-byte identical to the role-select focus-visible PNG and still displayed `일반 사용자`. Two focused tests were added before implementation. The real handler behavior test failed `tests 1 / pass 0 / fail 1` because the behavior seam was absent. The exact catalog test failed `tests 1 / pass 0 / fail 1` because the plan exposed `{ key: 'End', waitForSelector: undefined }` rather than an alternate-role key plus a fail-closed checked-option selector.

7. Browser-found native ArrowDown regression:

   The first review-remediation recapture was rejected at `66 / 67`; the single role-change scenario timed out twice because headless Chromium did not change the native select with `ArrowDown` alone. A focused keyboard-handler behavior test was changed first and failed `tests 1 / pass 0 / fail 1` because the real handler was absent. A non-production-only keyboard seam then made the test green while production key handling remained a no-op and the unchanged production `onChange` callback payload stayed covered.

## Implementation

- The three direct panels now own bounded `min-w-0 max-w-full` roots, named tables with an `860px` default minimum width, stable row/action/dialog hooks, mobile `44px` action targets, full pressure values in `title`, and explicit loading/search/select accessibility semantics.
- Empty terminal states render in the bounded panel rather than inside the wide table, keeping the message visible at `320px`.
- Focused component suite after the browser-found and independent-review fixes: `tests 18 / pass 18 / fail 0`.
- Static internal adapters and catalog matrices generate exactly `Mates 18 + Posts 18 + Users 31 = 67` legal direct states. Generated totals are `430 / 1010` registered, `580` pending, `70,430` direct, and `71,433` valid.
- Final browser evidence is `67 / 67` pass, `0` failed, `0` recovered, every result attempt `1`, with `67` unique IDs and paths, `67` nonzero PNG/SHA values, and `0` missing/stale artifacts.
- Representative empty/loading/pressure/maximum/permission/role-change/dialog PNG inspection found no remaining defect after the recorded RED→GREEN fixes. The role-change PNG visibly shows `관리자` and has SHA-256 `8f239aa34160372f4e5e6077a2bd330807f915eac4d3b6b993bf9562eff9e26d`; the role-select focus-visible PNG shows `일반 사용자` and has distinct SHA-256 `79a0c2ba4b10369d3f0546933a5324572dc38173ff1b966f73ff4571b00d88de`.
- Full verification is complete: components `18 / 18`, adapter/catalog `251 / 251`, generator `18 / 18`, inventory `17 / 17`, contract `13 / 13`, harness `42 / 42`, production isolation/import graph `4 / 4`, TypeScript, production build, `153` bundle budgets, global CSS `255,394 / 255,500` bytes, baseball-data policy, and `git diff --check` all pass.
- Strict completeness fails only on the expected `580` global pending entries; duplicates/missing/stale/errors are all `0`.
