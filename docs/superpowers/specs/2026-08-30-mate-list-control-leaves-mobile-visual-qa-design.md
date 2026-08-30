# Mate List Control Leaves Mobile Visual QA Design

Date: 2026-08-30
Status: approved as the next slice of the repository-wide mobile Visual QA plan

## Scope

Register and prove three direct control leaves:

- `src/components/MateStatusTabs.tsx#MateStatusTabs`
- `src/components/MateSortDropdown.tsx#MateSortDropdown`
- `src/components/MateSeatFilterButtons.tsx#MateSeatFilterButtons`

Register two visible hosted aliases:

- `src/components/MateListControlsRuntime.tsx#MateStatusTabs`
- `src/components/MateListControlsRuntime.tsx#MateSortDropdown`

Keep `src/components/MateListControlsRuntime.tsx#MateSeatFilterButtons` pending because its only production instance is inside a desktop-only `hidden lg:block` rail and is not visible in the 320px Mate root evidence.

Preserve `MateListControlsRuntime`, its controller, sort/seat resolver data, API/auth/query semantics, shared `PlainMenu` and `Button`, and all existing root/hosted IDs.

## MateStatusTabs: exactly 21

Eight default states:

- `activeTab(all,recruiting,matched,selling) × theme(light,dark)`

Thirteen interaction states, anchored at `all/light`:

- hover `3`: inactive recruiting, matched, selling
- focus-visible `1`: recruiting
- pressed `4`: all, recruiting, matched, selling
- selected `4`: each target updates the controlled active key
- keyboard navigation `1`: all focused, Tab moves to recruiting focus-visible

Targets:

- root `mate-status-tabs`
- `mate-status-tab-all|recruiting|matched|selling`

Selected results require target `aria-pressed=true`, callback count `1`, and the exact target key. Hover/focus/pressed/resize must keep callback count `0`.

The current `h-8` 32px tabs change to the already emitted `h-11` 44px utility.

## MateSortDropdown: exactly 30

Twelve canonical states:

- `activeSort(latest,dDay,popular) × phase(closed,open) × theme(light,dark)`

Eighteen interaction states, anchored in the light theme:

- hover `4`: closed trigger plus three open options
- focus-visible `4`: trigger plus three options
- pressed `4`: trigger plus three options
- open `1`: trigger click displays the named menu
- selected `3`: latest, dDay, popular each updates the controlled key and closes the menu
- keyboard navigation `2`:
  - trigger opens, Tab focuses the first `menuitemradio`
  - open menu, Escape removes the menu

Targets:

- root `mate-sort-dropdown`
- trigger `mate-sort-trigger`
- options `mate-sort-option-latest|dDay|popular`
- `PlainMenu` accessible name `메이트 정렬`

Selection requires option `aria-checked=true`, exact callback count/value, and menu hidden. Trigger open/close, outside pointer, Escape, hover/focus/pressed/resize invoke the sort callback zero times.

Change only this leaf from `align="end"` to the existing emitted `align="start"`/`left-0` path. Actual rect checks require `menu.left >= 0` and `menu.right <= innerWidth` at 320 and 390.

## MateSeatFilterButtons: exactly 28

Eight data states, all `rail/light`:

1. `empty`: `''`, default four options, none active
2. `single`: `응원석`, default four, 응원석 active
3. `populated`: `lg 오렌지석 레드석`, Jamsil four, two active
4. `boundary-minimum`: `kt`, Suwon two, none active
5. `boundary-maximum`: `hanwha 홈 플레이트 테이블석`, Daejeon four, one active
6. `long-korean`: `삼성 블루존에서 관람할 좌석을 선택합니다`, Daegu three, 블루존 active
7. `unbroken-token`: `ssg으쓱이존UNBROKENTOKENWITHOUTSPACES`, Incheon three, 으쓱이존 active
8. `maximum-supported`: `lg 오렌지석 레드석 프리미엄석 테이블석`, Jamsil four, all active

Three additional maximum-supported canonical states:

- toolbar/light
- rail/dark
- toolbar/dark

Seventeen interactions, anchored at maximum-supported toolbar/light:

- hover `4`
- focus-visible `4`
- pressed `4`
- selected `4`: active item becomes inactive through a stateful controlled wrapper
- keyboard navigation `1`: orange focused, Tab moves to red

Targets:

- root `mate-seat-filter-buttons`
- `mate-seat-filter-orange|red|premium|table`

Selected results require the clicked label to be removed, `aria-pressed=false`, and callback count `1` with the exact label. Scroll/resize invokes callback zero times. Toolbar interactions scroll the local rail when necessary; document horizontal overflow remains absent.

The existing `Button size="touch"` keeps targets at least 44px.

## Stateful direct adapters and actual callbacks

Status and Seat selection and Sort selection use Visual QA-only stateful wrappers outside production components. The wrapper calls the normal public callback exactly once and updates the controlled prop. It exposes exact callback count/value and effective state evidence. It must:

- use unconditional hooks and scenario-key remount for reset
- fail closed for unknown target/value/action combinations
- create no new PascalCase inventory export
- remain excluded from production imports

Actual mounted Vite+ReactDOM+Chromium tests with production CSS prove:

- every intentional click invokes the correct callback once, unrelated callbacks zero
- deliberate reciprocal miswires and callback removal are RED
- StrictMode, open/close, local horizontal scroll, and 320x844 to 390x1000 resize do not replay callbacks
- Status buttons are at least 44px and do not overlap or clip
- Sort trigger/options are at least 44px; menu remains inside both viewports; outside pointer and Escape close without selecting
- Seat rail wraps, toolbar scrolls locally, later targets remain reachable, and document overflow is absent
- focus-visible, ARIA pressed/checked, Tab, and Escape reflect actual DOM state
- external API/query/auth calls are zero

## Hosted mappings and root reconciliation

Status and Sort hosted aliases each reuse exactly four existing `src/components/Mate.tsx#MateListControlsRuntime` host IDs:

1. Mate results-fallback/light
2. Mate results-fallback/dark
3. Mate runtime/light
4. Mate runtime/dark

Each hosted entry is fully host-owned/notApplicable and adds zero valid combinations.

Invariants:

- `src/components/Mate.tsx#Mate` direct remains exactly `6`, but all six screenshots are fresh-recaptured because Status touch height and Sort alignment change visible root output.
- `src/components/Mate.tsx#MateListControlsRuntime` hosted remains exactly `4` with identical IDs.
- `MateTodayCountBadge` hosted remains `11`.
- `MateListControlsRuntime` direct remains pending.
- Seat hosted remains pending for a later visible desktop-host slice.

## CSS and product constraints

Main-worktree nominal global CSS headroom starts at 35 bytes. New global selectors and new Tailwind/arbitrary utilities are forbidden. Reuse only already emitted `h-11`, `min-h-11`, `left-0`, `active:scale-[0.98]`, and `motion-reduce:transform-none`. Run build and all 153 budget gates immediately after first product GREEN.

Allowed production edits:

- Status `h-8 → h-11`
- leaf target test IDs/ARIA
- leaf target already-emitted pressed utilities
- Sort `align=end → start`

Do not edit `MateListControlsRuntime`, controller/hooks, `PlainMenu`, shared `Button`, sort/seat resolver modules, API/auth/query code, or static baseball data.

## Evidence

Fresh 320x844, `fresh`, `expand-tall-flow` reports:

- `reports/visual-qa-mate-status-tabs-mobile.json`: `21/21`
- `reports/visual-qa-mate-sort-dropdown-mobile.json`: `30/30`
- `reports/visual-qa-mate-seat-filter-buttons-mobile.json`: `28/28`
- replacement `reports/visual-qa-mate-page-mobile.json`: existing Root `6/6`

All reports require failed/recovered zero, attempts one, unique scenario IDs/paths, nonzero/hash-complete PNGs, and every interaction verified/captureVerified/viewportExpanded/revalidated. Record reproducible report and PNG aggregate SHA values and meaningful default/theme/open/selected/hover/pressed/focus/keyboard distinctions.

## Coverage arithmetic

Starting from registered `440/1,010`, pending `570`, direct `70,633`, valid `71,636`:

- registered: `445/1,010`
- pending: `565`
- direct: `70,712`
- valid: `71,715`

Three direct entries add 79 states. Two hosted aliases add entries and zero valid combinations.

## Review

One implementer owns the slice. A separate read-only reviewer validates exact matrices, stateful callback identity/count, menu/rail layout, actual 44px targets, hosted/root IDs, evidence hashes, CSS budget, clean-checkout closure, scope, and Priority 0 compliance. Critical or Important findings return to the original implementer.
