# Mate Mobile Date Filter Mobile Visual QA Design

Date: 2026-08-30
Status: approved as the next bounded slice of the repository-wide mobile Visual QA plan

## Scope

Register and prove one direct mobile control leaf:

- `src/components/MateMobileDateFilter.tsx#MateMobileDateFilter`

Register its visible production-hosted alias:

- `src/components/MateListControlsRuntime.tsx#MateMobileDateFilter`

Keep `src/components/MateListControlsRuntime.tsx#MateDateRailFilter` pending. Its production instance is inside the desktop-only `hidden lg:block` rail and is not visible in the 320px or 390px Mate root evidence.

Do not modify or re-register `src/components/MateDateRailFilter.tsx#MateDateRailFilter`. Its direct contract is already registered as `mate.date-rail-filter` with exactly 106 final states and a `106/106`, failed/recovered zero report. Its source and shared adapter currently contain concurrent work.

Preserve `MateListControlsRuntime`, `useMateListController`, `Mate`, shared `Button`, DateRail source/contract/report, API/auth/query semantics, and all existing hosted/root IDs.

## Direct matrix: exactly 55

All direct fixtures use fixed local `Date` values. They are UI inputs, not external baseball data.

Five data fixtures:

1. `empty`: zero dates; legal selections `all`, `outside-range`
2. `single`: one short date; legal selections `all`, `first`, `outside-range`
3. `long-korean`: one `2027-12-31` date; legal selections `all`, `first`, `outside-range`
4. `boundary-minimum`: four dates; legal selections `all`, `first`, `middle`, `last`, `outside-range`
5. `maximum-supported`: fourteen dates from `2027-12-24` through `2028-01-06`; legal selections `all`, `first`, `middle`, `last`, `outside-range`

`boundary-minimum=4` is the smallest shared fixture that produces horizontal overflow at both target viewports. `maximum-supported=14` matches the controller's existing generated upper bound. `outside-range=2028-01-07` is legal because the URL-selected date may be outside the current fourteen-day window.

The component API cannot express an unbroken string or disabled state, so those axes are not applicable. Direct lifecycle, permission, and system axes are also not applicable because this leaf is a resolved prop-controlled UI; the lazy fallback belongs to the parent host.

Thirty-six canonical states:

- `(2 + 3 + 3 + 5 + 5) legal data/selection combinations × theme(light,dark)`

Nineteen interaction states, anchored at `maximum-supported/light`:

- hover `4`: all, first, middle/eighth, last
- focus-visible `4`: the same targets
- pressed `4`: the same targets
- selected `5`:
  - all to first
  - first to all by clicking the same selected date and applying the existing parent toggle semantics
  - all to middle
  - all to last
  - outside-range to all
- keyboard navigation `2`:
  - focused scroller plus ArrowRight produces `scrollLeft > 0`
  - focused scroller plus Tab moves focus-visible to the all button

Total: `36 + 19 = 55`.

## Targets and stateful callback contract

Stable targets:

- root `mate-mobile-date-filter`
- selected label `mate-mobile-date-filter-selected-label`
- local scroller `mate-mobile-date-filter-scroller`
- all button `mate-mobile-date-filter-all`
- date buttons `mate-mobile-date-filter-date-YYYY-MM-DD`
- stateful host `mate-mobile-date-filter-stateful-host`

The Visual QA-only controlled wrapper lives outside production components in `src/components/visual-qa/MateMobileDateFilterHarness.tsx`. It is loaded only through an explicit catalog `moduleFile`, preserves the product component ID/file, exports a lower-camel symbol, and must remain absent from production chunks.

The wrapper exposes scenario key, callback count, last callback value, and effective selection. It must:

- use unconditional hooks and scenario-key remount for reset
- call the normal public callback exactly once per intentional click
- encode a date callback as its exact `YYYY-MM-DD` value and all/null explicitly
- apply the parent-compatible same-selected-date toggle only in the controlled wrapper
- keep callback count zero for hover, focus, pressed, ArrowRight, Tab, local scroll, resize, StrictMode mount, and remount
- fail closed for unknown data, selection, target, action, module, or export mappings
- create no new PascalCase inventory symbol and no production import path

Actual mutation tests must make a reciprocal date-target miswire and a missing callback observable as RED. Restored code must pass with the intended callback exactly one, unrelated callbacks zero, and all API/query/auth/network calls zero.

## Product and mobile layout behavior

Allowed product changes are limited to `MateMobileDateFilter.tsx`:

- replace both 42px button heights with the already emitted `h-11` or `min-h-11`
- add the stable test IDs and precise ARIA state/name needed by the public control
- reuse already emitted `active:scale-[0.98]` and `motion-reduce:transform-none`

Do not change the callback, URL, query-page reset, date generation, selection, or controller semantics.

Actual Vite+ReactDOM+Chromium checks with production CSS at 320x844 and 390x1000 require:

- every all/date button rect height at least 44px
- section, heading, and selected badge inside the viewport with no overlap or clipping
- the legal `12월 31일 목` display fitting without hiding the heading
- four- and fourteen-date fixtures having local horizontal overflow while document overflow remains absent
- ArrowRight changing local `scrollLeft`
- first, middle, and last targets scrollable into the scroller's visible bounds before interaction
- gradients retaining `pointer-events:none` and not blocking edge targets
- focus rings remaining visible within the local rail
- correct `aria-pressed`, group/scroll accessible names, and Tab focus order
- outside-range label visible with no date button selected, followed by an exact-one all/null clear action
- meaningful light/dark weekend, idle, active, badge, hover, pressed, focus, and selected appearances

## Hosted mapping and root reconciliation

The mobile filter hosted alias reuses exactly four existing `src/components/Mate.tsx#MateListControlsRuntime` host IDs:

1. Mate results-fallback/light
2. Mate results-fallback/dark
3. Mate runtime/light
4. Mate runtime/dark

All hosted axes are host-owned/notApplicable and add zero valid combinations.

Invariants:

- `src/components/Mate.tsx#Mate` direct remains exactly `6`; all six screenshots are freshly recaptured because the mobile filter height changes visible root output.
- `src/components/Mate.tsx#MateListControlsRuntime` hosted remains exactly `4` with identical IDs.
- Status and Sort hosted aliases remain `4` each.
- `MateTodayCountBadge` hosted remains `11`.
- DateRail direct remains exactly `106`; its reports and PNGs do not change.
- DateRail hosted and `MateListControlsRuntime` direct remain pending.
- The two controls-fallback root states keep their IDs even though the mobile filter is visible only in the four results/runtime hosts.

## CSS and concurrency constraints

Main-worktree global CSS starts at `255,465/255,500` bytes, leaving 35 bytes. New global selectors, new Tailwind utilities, and new arbitrary values are forbidden. Reuse only classes already emitted in the production CSS. Run the production build and all 153 budget gates immediately after the first product GREEN.

The current shared `stateAdapters.ts` includes concurrent DateRail and Landing work. Add only the MobileDateFilter-owned hunks on top of the latest file. Do not revert, rewrite, stage, or commit DateRail/Landing hunks. `MateDateRailFilter.tsx` and staged `MateListControlsRuntime.tsx` are outside scope.

Preserve the existing 99 staged paths and both fingerprints unless a clean-checkout prerequisite is explicitly audited, approved, consumed, and documented. Preserve the concurrent Landing selector hunk and the known Landing-only inventory residual of 15 unclassified plus one stale entry.

## Evidence

Fresh 320x844, `fresh`, `expand-tall-flow` evidence:

- `reports/visual-qa-mate-mobile-date-filter-mobile.json`: `55/55`
- replacement `reports/visual-qa-mate-page-mobile.json`: existing root `6/6`

All 61 rows require failed/recovered zero, attempts one, unique scenario IDs and paths, nonzero/hash-complete PNGs, and every interaction's verified/captureVerified/viewportExpanded/revalidated flags. Record individual report SHA values plus a reproducible two-report aggregate and sorted path+content 61-PNG aggregate. Document only legal equal-image groups where the final UI state is identical.

## Coverage arithmetic

Starting from registered `445/1,010`, pending `565`, direct `70,712`, valid `71,715`:

- registered: `447/1,010`
- pending: `563`
- direct: `70,767`
- valid: `71,770`

One direct entry adds 55 states. One hosted alias adds an entry and zero valid combinations. Existing DateRail 106 states are already included in the baseline and must not be counted again.

## Review

One implementer owns the slice. A separate read-only reviewer validates the exact matrix, controlled callback identity/count, 44px targets, local rail reachability, root/hosted IDs, report/PNG integrity, production isolation, CSS budget, clean-checkout closure, concurrent-change preservation, and Priority 0 compliance. Critical or Important findings return to the original implementer.
