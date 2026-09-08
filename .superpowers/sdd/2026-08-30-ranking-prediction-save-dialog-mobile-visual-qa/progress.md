# Progress

## Fixed inputs and scope

- Design SHA-256: `1cb01ab112a2873e541d6c9f785434fef1d68e54d3255911205373fb45f03b0a`
- Plan SHA-256: `8853aac463e84985f2c5c38ba7c7147b8fac72114e272df5b4b0820a4b7c9517`
- Constraints SHA-256: `f340de132ecda224a2cf42bff2486d6f34b78f4f70ae072b2a63faff7181cc0f`
- Only `src/components/RankingPredictionSaveDialog.tsx#RankingPredictionSaveDialog` moved from pending to registered. The hosted `src/components/RankingPrediction.tsx#RankingPredictionSaveDialog` occurrence remains pending and no parent/root scenario was recaptured.
- No shared Button/PlainDialog, caller, prediction runtime/coach, Landing/Mate, API, query, store, data, package-lock, external baseball data, prior report, or prior PNG was changed by this slice.

## TDD evidence

1. Actual product RED failed `2/2`: the saving dialog did not expose `aria-busy`, and the mobile cancel action measured `246px` rather than the footer's full width. Portal containment, wrapping, touch sizing, callback ledgers, body lock, and focus lifecycle were exercised against the real ReactDOM/Vite/Chromium surface at `320x844` and `390x1000`.
2. Minimal leaf GREEN guards close/confirm while saving, gives both footer actions `h-11 w-full sm:w-auto`, and exposes `aria-busy` on the saving confirm action. The first GREEN immediately built worker `17` / client `5,737` modules, passed all `153/153` budgets, and produced global CSS `255,429/255,500` bytes, `71` bytes headroom and `36` bytes less than the incoming `255,465` baseline.
3. The focused normal suite passes `3/3`. StrictMode mount and keyed remount callback ledgers are asserted at zero before reset. Close/cancel/backdrop/Escape/Space-cancel dispatch only `onClose` once; click/Enter confirm dispatch only `onConfirm` once; inner click, saving pointer/keyboard, hover/focus/pressed, resize, mount, and remount remain zero. A synchronous controlled saving transition makes rapid double confirm exact one.
4. Ten mutations are all RED: disabled removal, callback swap, callback duplicate, saving-transition removal, saving-label removal, inner propagation, Escape cleanup, focus trap, package inclusion missing, and package inclusion duplicate. Observed failures include confirm `2` instead of `1`, wrong or duplicate callback ledgers, close `3`/`22` instead of `1`, a broken Shift-Tab loop, stale `확인` instead of `저장 중...`, and package counts `0`/`2` instead of `1`.
5. Adapter/catalog started RED at `269/271` because the direct entry was pending and `ranking.save-dialog` did not exist. The lower-camel QA-only companion, exact original module mapping, fail-closed adapter, and exact matrix now pass `271/271`.

## Matrix and browser evidence

- Exact direct matrix: `25 = 6 canonical + 19 idle/light interactions` (`hover 3`, `focus-visible 3`, `pressed 3`, `click 4`, `keyboard 6`).
- Generated totals: registered `450/1,010`, pending `560`, direct `70,861`, valid `71,864`.
- Warm-up outside final paths passed `1/1`. Final `320x844`, `fresh`, `expand-tall-flow`, full-portal capture passed `25/25`, failed `0`, recovered `0`, every attempt `1`.
- Evidence has `25` unique scenario IDs, `25` unique/nonzero PNG paths, direct-component-only rows, and `19/19` interaction rows with `verified`, `captureVerified`, `viewportExpanded`, and `revalidatedAfterViewportExpansion` all true.
- Report SHA-256: `53f9ad8f6c1e97a910bffff07903f873c9c693f11cae15d7e7839fa209536e4f`.
- Sorted `SHA256 + path` PNG aggregate: `0972afa98e8428731ce4fededd0603b23e1dbfb13ce2a0132a73f30277a54076`.
- Representative light idle, light saving, cancel focus, and dark idle PNGs were inspected at original resolution. The complete backdrop/portal, bounded Korean wrapping, stacked full-width footer actions, disabled/saving treatment, contrast, and focus ring are visible with no clipping or horizontal overflow.

Six legal equal-image groups preserve distinct executable ledgers and scenario IDs:

1. light closed equals Escape, Space-cancel, backdrop click, cancel click, and close click because each ends on the same closed surface;
2. light idle equals focus-close because PlainDialog initially focuses close;
3. focus-cancel equals Tab close-to-cancel;
4. focus-confirm equals Shift-Tab close-to-confirm and Tab cancel-to-confirm;
5. close hover equals close pressed because the shared close active surface retains the hover treatment;
6. Enter confirm equals confirm click because both synchronously enter the same controlled saving surface.

## Verification

- Focused ranking suite: `23/23`; focused actual slice: `3/3`.
- Package lifecycle: pre-harness `165/165` (incoming `162 + 3`), full harness `408/408` (incoming `406 + 2`).
- Contract `13/13`, state generator tests `19/19`, inventory tests `17/17`, skeleton `4/4`, shared Button/PlainDialog `8/8`, production isolation/import/audit/reflow `46/46`, DOM probe, TypeScript, Priority 0 policy, and diff checks pass.
- Final production build passes worker `17` / client `5,737`, all `153/153` budgets, and global CSS `255,429/255,500` bytes. Production `dist` has zero QA companion module path, lower-camel host, harness test ID, or adapter ID occurrences.
- Inventory strict remains fail-closed only on the concurrent/global residual `20 unclassified + 3 stale`, with provisional visual `0` and parse errors `0`; this slice contributes no inventory residual and does not repair unrelated entries.
- The build-refreshed `reports/bundle-guard-report.json` and `reports/dist-assets-report.json` remain forbidden and unstaged. The main index remains empty throughout scoped work.

## Scoped history

- `7aef69e7`: immutable scope documents
- `91062e8c`: product/TDD/package integration
- `020dbab0`: exact QA registration and generated state report
- `0f8b1d4c`: authoritative 25-scenario browser evidence
