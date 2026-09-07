# Module Federation Fallback Controls Mobile Visual QA Design

Date: 2026-08-30
Status: approved as the next bounded slice of the repository-wide mobile Visual QA and duplicate-call plan

## Scope

Register and prove two direct fallback design-system leaves:

- `src/components/moduleFederation/fallback/Button.tsx#FallbackDesignSystemButton`
- `src/components/moduleFederation/fallback/Modal.tsx#FallbackDesignSystemModal`

Keep these hosted aliases pending:

- `src/components/moduleFederation/ModuleFederationDesignSystemProbe.tsx#RemoteButton`
- `src/components/moduleFederation/ModuleFederationDesignSystemProbe.tsx#RemoteModal`
- `src/components/moduleFederation/ModuleFederationDesignSystemProbe.tsx#RemoteThemeProvider`
- `src/components/AppRoutes.tsx#ModuleFederationDesignSystemProbe`

The probe host itself has no registered visual scenario/report, so a generic probe screenshot is not valid hosted evidence. This slice adds no hosted valid combinations and does not recapture Mate or other roots.

Both leaves are prop-controlled UI with no API, authentication, store, query, or baseball-data dependency. Preserve the probe, AppRoutes, shared `ui/Button`, shared `PlainDialog`, all Landing/Mate/DateRail work, and all existing reports.

## Fallback Button: exactly 48

Data fixtures:

- `single`: short visible label
- `long-korean`: a legal long Korean action label
- `unbroken-token`: a long token without spaces

Fifteen single/light-or-dark presentations:

1. default/default
2. destructive/default
3. outline/default
4. secondary/default
5. ghost/default
6. link/default
7. brand/default
8. brandOutline/default
9. brand/sm
10. brand/lg
11. brand/icon
12. brand/iconTouch
13. brand/touch
14. brand/touchLg
15. disabled/default

Canonical states:

- `single`: 15 presentations × theme(light,dark) = 30
- `long-korean`: default/default × two themes = 2
- `unbroken-token`: default/default × two themes = 2
- canonical total = 34

The compatibility mappings are unit-tested without duplicating visual states:

- `primary` maps to `brand`
- `large` maps to `lg`
- unknown variant and size fail closed to the local default

Fourteen interaction states anchored at `single/light`:

- hover `8`: default, destructive, outline, secondary, ghost, link, brand, brandOutline
- focus-visible `2`: default common ring, destructive custom ring
- pressed `1`: brand/touch
- selected/click `1`: native pointer callback exact one
- keyboard navigation `2`: Enter exact one, Space exact one

Total: `34 + 14 = 48`.

Stable targets:

- stateful host `mf-fallback-button-stateful-host`
- product target `mf-fallback-button`

The host exposes callback count, last event, disabled state, and presentation. Pointer click, Enter, and Space each invoke the native callback exactly once. Disabled pointer/Enter/Space, hover, focus, pressed, resize, StrictMode mount, and keyed remount invoke it zero times.

Actual production-CSS checks at 320x844 and 390x1000 require every size to have a touch rect at least 44px in both dimensions when applicable, labels to stay inside the viewport, consumer `className` to remain effective, disabled controls to be visibly and behaviorally disabled, and long Korean/unbroken content to wrap without document horizontal overflow.

Product changes, if the initial actual RED proves them necessary, are limited to the fallback Button wrapper. Preserve variant/size mapping and native prop forwarding. Reuse only already emitted `max-w-full`, `[overflow-wrap:anywhere]`, `active:scale-[0.98]`, and `motion-reduce:transform-none`; shared Button already owns touch size, disabled, and class merging behavior.

## Fallback Modal: exactly 21

Data fixtures:

- `empty`
- `single`
- `long-korean`
- `unbroken-token`

Canonical states:

- open: four data fixtures × theme(light,dark) = 8
- closed: single × theme(light,dark) = 2
- canonical total = 10

Closed data variants are visually identical and are not duplicated. Visibility alias precedence is fixed in unit tests:

- defined `open` takes precedence over `isOpen`
- `open=false,isOpen=true` is closed
- `open=true,isOpen=false` is open
- absent `open` falls back to `isOpen`

Eleven interactions anchored at `single/open/light`:

- hover close button `1`
- focus-visible close button `1`
- pressed close button `1`
- selected/click `5`:
  1. close button with both callbacks
  2. backdrop with both callbacks
  3. close button with `onOpenChange` only
  4. close button with `onClose` only
  5. close button with no callback, leaving the controlled dialog open
- keyboard navigation `3`: Escape close, Tab focus loop, Shift+Tab reverse loop

Total: `10 + 11 = 21`.

Stable targets:

- stateful host `mf-fallback-modal-stateful-host`
- portal dialog `[role="dialog"]`
- close button `[role="dialog"] button[aria-label="닫기"]`
- actual backdrop under the fixed dialog portal

### Duplicate-call contract

`onOpenChange` and `onClose` are compatibility aliases for one close request. The current fallback invokes both, and the production probe passes two callbacks that perform the same state update. Remove this duplicate dispatch by applying the same precedence principle as visibility:

```text
if onOpenChange exists: call onOpenChange(false) once
else if onClose exists: call onClose() once
else: call neither
```

For close button, backdrop, and Escape, a single user trigger must therefore produce:

| callback mode | onOpenChange | onClose |
|---|---:|---:|
| both | 1 | 0 |
| onOpenChange only | 1 | 0 |
| onClose only | 0 | 1 |
| none | 0 | 0 |

The controlled QA host closes only when one compatibility callback is supplied. The no-callback scenario stays visible. Dialog-internal clicks invoke neither callback.

Actual production-CSS portal checks at 320x844 and 390x1000 require the content rect inside the viewport, internal vertical scrolling without document overflow, title/body wrapping for long Korean and unbroken content, 44x44 close target, pointer-safe backdrop, body scroll lock and restoration, focus trap and forward/reverse loop, Escape cleanup, and meaningful light/dark states. StrictMode initial mount and keyed remount must be asserted before any ledger reset and must replay zero callbacks/listeners.

Mutation gates must make callback dual-dispatch, two calls to the selected branch, missing onClose fallback, reversed visibility precedence, internal-click backdrop propagation, Escape listener cleanup removal, body overflow restoration removal, and focus-trap removal observable as RED.

## Stateful QA companions and production isolation

Use a lower-camel QA-only companion module outside production components, loaded through exact catalog `moduleFile` mappings while preserving original product component IDs/files. It owns controlled open state and callback ledgers but does not reproduce product logic.

The adapter/catalog must fail closed for unknown or mismatched component, module, export, data, presentation, callback mode, target, action, lifecycle, permission, or system combinations. QA companion paths and identifiers must be absent from all production chunks.

Add the new actual test file exactly once to the package pre-harness gate. Existing baseline is pre-harness `159/159` and full harness `401/401`; record the exact post-slice count and prove an inclusion mutation is RED. Do not alter the documented residual omission of `MateListControlLeaves.mobile.test.tsx` in this slice.

## Evidence

Fresh 320x844, `fresh`, `expand-tall-flow` reports:

- `reports/visual-qa-mf-fallback-button-mobile.json`: `48/48`
- `reports/visual-qa-mf-fallback-modal-mobile.json`: `21/21`

All 69 rows require failed/recovered zero, attempts one, unique scenario IDs and artifact paths, nonzero/hash-complete PNGs, and complete interaction verification flags. Modal captures must include the full portal surface, not only a trigger or state host. Record both report SHA values, a reproducible two-report aggregate, a sorted path+content 69-PNG aggregate, and only legal equal-image groups with identical final UI state.

## Coverage arithmetic

Starting from registered `447/1,010`, pending `563`, direct `70,767`, valid `71,770`:

- registered: `449/1,010`
- pending: `561`
- direct: `70,836`
- valid: `71,839`

Two direct entries add 69 states. No hosted entry or root state changes.

## CSS, concurrency, and policy constraints

Main-worktree CSS starts at `255,465/255,500` bytes, leaving 35 bytes. New global selectors, new Tailwind utilities, and new arbitrary values are forbidden. Run the production build and all 153 budgets immediately after the first product GREEN.

The shared adapter/catalog/manifest starts from the completed Mobile baseline. Add only fallback-owned hunks. Preserve the concurrent Landing selector hunk, staged 99 paths and fingerprints, all Mate/Mobile/DateRail files and report hashes, and the known Landing-only inventory residual of 15 unclassified plus one stale entry.

All data fixtures are static UI strings. No external baseball API/data, crawling, scraping, web-search repair, or guessed facts are permitted.

## Review

One implementer owns the slice. A separate read-only reviewer validates exact matrices, native and modal callback counts, duplicate-call precedence, portal/focus/body-lock behavior, touch and overflow behavior, report/PNG integrity, package regression integration, production isolation, CSS budget, clean-checkout closure, concurrent-change preservation, and Priority 0 compliance. Critical or Important findings return to the original implementer.
