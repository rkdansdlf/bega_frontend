# Admin Community Leaf Panels Mobile Visual QA Task Report

## Outcome

- Registered exactly `Mates 18 + Posts 18 + Users 31 = 67` direct legal states.
- Generated totals match the immutable design exactly: `430 / 1010` registered, `580` pending, `70,430` direct scenarios, `71,433` valid combinations.
- Final isolated browser report: `67 / 67` pass, `0` failed, `0` recovered, every result `attempts: 1`.
- Global strict completeness remains closed only because the repository still has `580` pending visual symbols. `duplicates`, `missing`, `stale`, and `errors` are all empty.

## Production changes

- Added bounded `min-w-0 max-w-full` panel roots, named tables, stable row/action/dialog hooks, default `min-w-[860px]` table canvases, and mobile `44px` actions.
- Kept horizontal scrolling owned by the existing shared `Table` container.
- Moved all three empty terminal outcomes outside the wide table canvas so they remain visible at `320px`.
- Added the announced Users loading status (`role=status`, polite live region, busy state) and explicit search/role-select labels.
- Preserved full pressure values through `title` while constraining visible identity/copy fields and maximum numeric groups to compact one-line presentation.
- Preserved the existing Users delete eligibility (`ROLE_ADMIN` remains disabled), current-user and `ROLE_SUPER_ADMIN` role-change restrictions, callbacks, and data behavior.
- Added a non-production-only deterministic controlled-input seam for the static Visual QA harness. Production continues to use the supplied controlled props and callbacks.
- Added a non-production-only role-select keyboard seam so the deterministic `change` scenario reaches `ROLE_ADMIN`; production keyboard behavior is untouched and production `onChange` still emits the original pending-role payload and reason callback.

## TDD evidence

1. Initial component contract RED:
   - Command: `node --import tsx --test --test-concurrency=1 src/components/admin/MatesAdminPanel.mobile.test.tsx src/components/admin/PostsAdminPanel.mobile.test.tsx src/components/admin/UsersAdminPanel.mobile.test.tsx`
   - Result: `10 tests / 3 pass / 7 fail`.
   - The three existing passes proved the original panels already had no direct API/effect/query calls.
2. Initial adapter/catalog RED:
   - Command: `node --import tsx --test --test-concurrency=1 --test-name-pattern="admin community leaf panel" src/visual-qa/stateAdapters.test.ts src/visual-qa/harnessCatalog.test.ts`
   - Result: `2 tests / 0 pass / 2 fail`.
3. Browser-found controlled-input regression: focused test `1 / 1` RED before the non-production-only seam and GREEN afterward.
4. Browser-found off-screen empty states:
   - Focused command using `--test-name-pattern="empty outcome visible"`.
   - Result before fix: `3 tests / 0 pass / 3 fail`; after fix all passed.
5. Browser-found pressure copy and numeric wrapping:
   - Compact-cell assertions failed `3 / 3` before each minimal presentation fix.
6. Independent-review role-select observability regression:
   - Behavior RED: `1 test / 0 pass / 1 fail`; the real role-select behavior seam was missing.
   - Catalog RED: `1 test / 0 pass / 1 fail`; actual `{ key: End, waitForSelector: undefined }` did not prove `ROLE_ADMIN`.
   - GREEN: the actual handler commits visible `ROLE_ADMIN`, emits the exact unchanged `{ userId, userName, userEmail, currentRole, targetRole }` payload, resets the reason, and keeps production visual state controlled by props.
7. Browser-found native select regression:
   - First remediation recapture was rejected at `66 / 67`; the role-change scenario exhausted its retry because Chromium did not change the native select with `ArrowDown` alone.
   - Keyboard-handler RED: `1 test / 0 pass / 1 fail`; after the non-production-only handler, focused GREEN returned `1 / 1`.
   - Final component suite: `18 / 18` pass.

## Browser evidence

- Final report: `reports/visual-qa-admin-community-leaf-panels-mobile.json`.
- Final screenshots: `reports/visual-qa-admin-community-leaf-panels-mobile-screenshots/`.
- Conditions: viewport `320x844`, `pageMode=fresh`, `captureHeightMode=expand-tall-flow`, exact three direct component IDs, static/internal fixtures, same-origin API stubs, external traffic blocked.
- Integrity: `67` unique scenario IDs, `67` unique screenshot paths, `67` nonzero PNG files, `67` nonempty SHA-256 values, `0` missing, `0` stale. Pixel-equivalent legal states account for repeated hashes; no artifact is missing.
- Component totals: Mates `18`, Posts `18`, Users `31`.
- Representative final PNG inspection: all three empty states, Users loading, long Korean and unbroken pressure, 50-row maximum inventory, admin and super-admin permissions, role-select change, and the real delete dialog.
- The final role-change PNG visibly shows `관리자`, is `128,967` bytes, and has SHA-256 `8f239aa34160372f4e5e6077a2bd330807f915eac4d3b6b993bf9562eff9e26d`. The role-select focus-visible PNG shows `일반 사용자`, is `129,593` bytes, and has distinct SHA-256 `79a0c2ba4b10369d3f0546933a5324572dc38173ff1b966f73ff4571b00d88de`.
- Rejected evidence was never reused. Earlier runs were moved outside the repository after finding, respectively, a controlled-input failure, off-screen empty outcomes, pressure-copy row growth, and maximum-number row growth. Each defect received a focused RED regression before a fresh recapture.
- Review-remediation evidence followed the same rule: the original misleading 67-PNG set and the subsequent `66 / 67` native-ArrowDown run were both moved outside the repository before the final all-first-attempt recapture.

## Duplicate API-call proof

- Focused source tests for all three panels reject imports from API modules and reject `axios`, `fetch`, `useEffect`, `useQuery`, and `useMutation` usage.
- Direct adapters use static internal fixtures and callback stubs only; unknown states fail closed.
- Production isolation/import-graph tests pass `4 / 4` and the production bundle has `0` Visual QA isolation violations.
- No API/auth/delete/role transport behavior was added or changed, so these direct render paths cannot introduce duplicate requests.

## Regression and release-gate results

- Focused components: `18 / 18` pass.
- Focused adapter/catalog: `2 / 2` pass.
- Full adapter/catalog: `251 / 251` pass.
- State generator tests: `18 / 18` pass.
- Inventory tests: `17 / 17` pass.
- Coverage contract tests: `13 / 13` pass.
- Harness interaction/capture tests: `42 / 42` pass.
- Production isolation/import graph: `4 / 4` pass.
- Inventory check: `2,101` symbols in `508` files; unclassified `0`, stale `0`, provisional visual `0`, parse errors `0`.
- Coverage contract check: valid; `2` browsers, `18` viewports, `4` state axes.
- `npx tsc --noEmit`: pass.
- `python3 ../scripts/validate_baseball_data_policy.py`: `External baseball data policy OK`.
- `npm run build`: pass; worker `17` modules and client `5,732` modules transformed, SEO prerender and sitemap succeeded.
- Bundle guard: `153` budgets checked, `0` failures, `0` skipped suites, `0` Visual QA production-isolation violations.
- Global CSS: `255,394 / 255,500` bytes, pass.
- `git diff --check`: pass.
- `npm run visual-qa:states:check`: expected exit `1` only because `580` pending remain; generated report has duplicates/missing/stale/errors all `0`.

## Unverifiable or incomplete items

- None within this exact three-panel cluster and its 67 legal direct states.
- This task does not claim repository-wide visual completeness or deployment readiness while the independent global backlog remains at `580` pending symbols.
