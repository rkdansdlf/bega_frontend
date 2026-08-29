# Client Error Admin Mobile and Visual QA Design

Date: 2026-08-29  
Status: Approved in chat on 2026-08-29  
Scope owner: Frontend admin

## Summary

Register and verify the six visual symbols defined in `src/components/admin/ClientErrorAdminPanel.tsx` as one honest host cluster:

- `ClientErrorAdminPanel`
- hosted `ClientErrorAdminDetailRuntime`
- hosted `ClientErrorAdminInsightsRuntime`
- hosted `ClientErrorTrendChart`
- hosted `ClientErrorInsightsSkeleton`
- hosted `MonitoringCard`

The parent receives a direct 82-scenario mobile Visual QA contract. The five internal or lazy symbols receive hosted evidence that points only to generated parent scenario IDs. The work also removes the duplicate client-error event request that currently occurs when the panel is initially active or becomes active, and adds a regression-tested request coordinator.

This cluster is one sequential step toward repository-wide coverage. It does not claim that the remaining frontend inventory is complete.

## Current Evidence and Problem

`ClientErrorAdminPanel` owns dashboard, event-page, filter, pagination, detail, chart, and insights lifecycles. The three lazy children and two internal visual components cannot be registered honestly before their actual parent host has direct scenarios.

The current request flow has two independent effects:

1. The `active`/`windowKey` effect immediately calls `loadEvents(0)`.
2. The filter effect also runs when `active` changes and schedules `loadEvents(0)` after 300 ms.

Therefore an initially active panel and a false-to-true activation can issue two equivalent event requests. The duplicate is not an API contract problem; it is client-side scheduling overlap.

The current mobile surface also has the following risks at 320 CSS pixels:

- headings, badges, filter controls, pagination, and large monitoring values can squeeze or overflow;
- unbroken event IDs, routes, and fingerprints do not consistently wrap;
- the event table has no explicit inner horizontal-scroll boundary;
- the fingerprint inventory can grow without a bounded internal scroll area;
- native selects and inputs do not all have explicit accessible labels;
- the detail lazy boundary uses `fallback={null}`, leaving no modal, busy announcement, or blocked backdrop while its chunk loads;
- loading and error surfaces do not consistently expose `status`, `alert`, or live-region semantics.

## Goals

1. Make the entire parent surface usable and contained at a 320x844 mobile viewport.
2. Cover every legal parent-owned data, inventory, lifecycle, variant, and interaction branch without multiplying impossible or visually redundant combinations.
3. Connect all five hosted symbols to real parent scenarios.
4. Preserve the existing detail 104-scenario and insights 98-scenario direct contracts as the authoritative leaf coverage.
5. Guarantee one event request for activation and window changes, one debounced request for filter changes, and zero requests while inactive.
6. Keep the API request and response contracts unchanged.
7. Ensure Visual QA override and renderer seams cannot affect production behavior.

## Non-goals

- No backend, endpoint, payload, authentication, or authorization change.
- No new state-management library or shared Zustand store.
- No redesign of the direct detail or insights leaf contracts.
- No new external data source, crawling, scraping, web repair, or baseball-data fallback.
- No broad admin-page refactor outside the six-symbol cluster.
- No cancellation or last-response-wins redesign for already in-flight HTTP requests; this change removes duplicate scheduling only.

## Selected Architecture

### Parent-owned nonproduction Visual QA seam

Follow the existing `AdminStadiumsRuntime` pattern inside the actual parent. Add explicit Visual QA state and renderer types to `ClientErrorAdminPanel`, with optional props for deterministic nonproduction rendering.

The seam controls:

- active state;
- selected window and filters;
- dashboard and event-page inventory;
- loading and error flags;
- current page;
- detail open, loading, and selected-event state;
- chart phase;
- insights deferred, suspense, and resolved phases;
- detail suspense and resolved phases.

The parent validates impossible override combinations and fails closed with descriptive errors. Examples include a resolved detail without an open detail state, a detail fallback while the detail is closed, and a resolved child phase without its required renderer.

When `import.meta.env.PROD` is true, the component ignores all Visual QA override and renderer props and follows only live state, live effects, and real lazy imports. Production isolation tests must prove this property.

When a valid override is active outside production, the parent suppresses dashboard, event, debounce, refresh, pagination, and detail API work. Harness callbacks may update only deterministic override-visible state or no-op as required by the scenario; they must never reach the shared Axios client.

### Hosted lazy renderers

Nonproduction renderer injection makes each lazy phase deterministic while keeping the real parent binding:

- chart renderer receives the mapped `chartData` and dashboard loading flag;
- insights renderer receives the exact nullable dashboard value;
- detail renderer receives `open`, `detailLoading`, `selectedEvent`, close, and recursive-open callbacks.

The default path continues to use the existing `lazy` imports. Renderer injection is a test and harness seam, not a production component API.

### Event request coordinator

Add a small nonvisual coordinator module owned by this feature. It retains the previous active/window/filter request key and one pending filter timer. Its public behavior is:

- first sync with `active=true`: run immediately once;
- `active=false`: cancel any pending timer, record the current key, and do not run;
- false-to-true activation: run immediately once;
- window change while active: cancel any pending timer and run immediately once;
- filter change while active: cancel the previous pending timer and schedule one run after 300 ms;
- identical sync, including a React Strict Mode effect replay: do nothing;
- disposal: cancel the pending timer.

`ClientErrorAdminPanel` uses one effect for event-request coordination. The dashboard retains its separate active/window refresh effect. Manual refresh and explicit previous/next pagination continue to call the existing loaders directly.

The coordinator accepts timer operations as dependencies so Node's built-in test runner can prove call counts without installing a DOM renderer or test package.

## Mobile and Accessibility Design

### Layout containment

- Apply `min-w-0` at the root, grid children, cards, and text containers.
- Use `p-4 sm:p-5` on dense cards and sections.
- Use responsive monitoring values, starting at `text-3xl` and retaining `text-4xl` only when space allows.
- Apply `[overflow-wrap:anywhere]` to event IDs, routes, fingerprints, error copy, and any pressure fixture.
- Allow header, badge, and pagination groups to wrap without overlaying adjacent content.
- Give primary mobile controls full available width where needed and preserve a minimum 44-pixel touch target.

### Inventory containment

- Bound the fingerprint list with a documented maximum height and internal vertical scrolling.
- Wrap the event table in an `overflow-x-auto overflow-y-hidden` container.
- Give the table a stable minimum width so cells remain readable while document-level horizontal overflow stays zero.
- Keep maximum-supported fixtures within the API-supported page size and documented Visual QA inventory caps.

### Labels and state announcements

- Add explicit labels, using visible or screen-reader-only text as appropriate, for the window, bucket, source, status, route, fingerprint, and search controls.
- Give detail buttons an accessible name containing the event identifier.
- Mark request failures as `role="alert"`.
- Mark empty and loading states as `role="status"` with appropriate `aria-live` behavior.
- Preserve disabled semantics for unavailable pagination controls.

### Detail lazy fallback

Replace `fallback={null}` with an accessible modal loading shell built from the existing dialog primitives. It must:

- render a modal backdrop and prevent pointer interaction with the parent;
- expose `role="dialog"`, `aria-modal`, a title, and a busy status;
- announce that detail content is loading;
- provide a close action so a stalled lazy import does not trap the operator;
- use the same mobile width and padding constraints as the resolved detail dialog.

### Skeleton and chart fallbacks

- Make the full and compact insights skeletons independently identifiable and mobile-contained.
- Give the chart fallback an announced loading state and stable 320-pixel-height surface.
- Keep all fallbacks visually consistent with the resolved dark admin surface.

## Direct Scenario Contract: 82 Scenarios

Every scenario uses the administrator permission because this component is reachable only inside the authorized admin route. Unauthorized and non-admin behavior belongs to the existing route-guard contracts and is not a legal state of this component.

### 1. Data and inventory: 23

Data pressure values are:

- `empty`
- `populated`
- `null-optional`
- `boundary-minimum`
- `boundary-maximum`
- `long-korean`
- `unbroken-token`
- `maximum-supported`

Inventory distribution:

- `none` with `empty`: 1
- `dashboard-only` with all eight data values: 8
- `events-only` with the seven non-empty data values: 7
- `both` with the seven non-empty data values: 7

Total: 23.

This preserves the meaningful distinction between a null dashboard and a resolved but empty dashboard while excluding inventory combinations that cannot render any pressure fixture.

### 2. Parent lifecycle: 6

- inactive
- dashboard loading
- events loading
- dashboard and events refresh loading
- panel request error
- detail request error with the resolved empty-detail surface

Each lifecycle uses one canonical data and inventory fixture so transport states do not create false Cartesian coverage.

### 3. Lazy boundaries: 6

- chart suspense fallback
- insights viewport-deferred fallback
- insights suspense compact fallback
- detail suspense modal fallback
- detail resolved loading
- detail resolved populated

The closed and normally resolved chart/insights phases are already present in the data and inventory family.

### 4. Window, page, and filter values: 17

- alternative windows `1h` and `7d`: 2
- middle and last page: 2
- bucket `api` and `runtime`: 2
- source `api`, `runtime`, and `unhandled_rejection`: 3
- status `5xx`, `4xx`, and `none`: 3
- populated route: 1
- populated fingerprint: 1
- populated search: 1
- long Korean filter pressure: 1
- unbroken filter token pressure: 1

Total: 17. The canonical data family already covers the default `24h`, first page, and empty filters.

### 5. Owned-control interactions: 30

- five action controls — refresh, fingerprint card, detail open, previous, and next — each with hover, focus-visible, and pressed: 15
- four selects — window, bucket, source, and status — each with focus-visible and input/change: 8
- three text inputs — route, fingerprint, and search — each with focus-visible and input: 6
- one keyboard-navigation path across the filter group: 1

Total: 30.

Grand total: 23 + 6 + 6 + 17 + 30 = 82 direct scenarios.

## Hosted Evidence

Hosted registration never creates invented scenario IDs. Each `hostScenarioIds` entry must resolve to one of the generated 82 direct parent scenarios.

- `ClientErrorAdminDetailRuntime`: detail suspense fallback, resolved loading, resolved populated, and detail request error — 4 host scenarios.
- `ClientErrorAdminInsightsRuntime`: resolved null dashboard, resolved empty dashboard, resolved populated dashboard, and resolved maximum-supported dashboard — 4 host scenarios.
- `ClientErrorInsightsSkeleton`: viewport-deferred full fallback and suspense compact fallback — 2 host scenarios.
- `ClientErrorTrendChart`: suspense fallback, resolved loading, and resolved populated/maximum chart — 3 host scenarios.
- `MonitoringCard`: the eight dashboard-only data-pressure scenarios; each host renders all three tones — 8 host scenarios.

The direct detail and insights adapters remain authoritative for the full leaf state matrices. Hosted evidence verifies binding and ownership, not a duplicate leaf Cartesian product.

## Expected Manifest Accounting

Starting from the verified state after the insights cluster:

- registered components: 395 to 401
- pending components: 605 to 599
- direct scenarios: 70,272 to 70,354
- valid combinations: 71,275 to 71,357

These are design-time expectations. The generated manifest and strict checker are authoritative. The repository-wide strict completeness check must continue to fail while 599 components remain pending.

## Error Handling and State Integrity

- Preserve `getApiErrorMessage` and the current fallback messages.
- Do not introduce a second toast or bypass the shared Axios error behavior.
- A detail request failure keeps the loading modal resolved to the existing empty/error detail state and surfaces the parent alert.
- Closing detail clears the selected event as today.
- Visual QA overrides reject impossible phase, data, inventory, and lifecycle combinations before rendering.
- A filter debounce cleanup and coordinator disposal always cancel the pending timer.

## TDD and Verification Strategy

### RED tests first

1. Add coordinator tests that demonstrate the current missing behavior for activation, Strict Mode replay, window changes, rapid filters, inactivity, and disposal.
2. Add `ClientErrorAdminPanel.mobile.test.tsx` tests for real parent markup, mobile containment classes, labels, state announcements, lazy fallback bindings, production isolation, and fail-closed invalid states.
3. Add adapter tests for every state family and rejected unsupported combination.
4. Add catalog tests that assert exactly 82 parent scenarios, the five hosted evidence sets, all scenario uniqueness, and the expected direct count.

Run each new test in RED before writing its implementation and retain the failing output as TDD evidence.

### GREEN and local regression

- Implement only enough behavior for each failing test family, then rerun that family.
- Add the parent tests to `visual-qa:admin-primitives:test`.
- Rerun the full admin mobile suite, state adapters, harness catalog, component-state contract tests, capture and interaction executor tests, TypeScript, and the build.

### Browser evidence

- Capture all 82 direct scenarios at an initial 320x844 viewport.
- Use `VISUAL_QA_HARNESS_CAPTURE_HEIGHT_MODE=expand-tall-flow` for tall flow surfaces while retaining 320-pixel content width.
- Require 82 successful first-attempt captures, zero failures, zero recoveries, unique scenario IDs, unique output paths, and non-missing PNGs.
- Inspect representative empty, dashboard-only, events-only, maximum-supported, long Korean, unbroken token, chart fallback, both insights fallbacks, detail loading modal, detail error, table scroll, and keyboard/focus scenarios.
- Verify no document-level horizontal overflow, no badge or header overlap, no inaccessible loading gap, and no unbounded outer document growth.

### Completion gates

From `bega_frontend`:

- targeted coordinator and parent mobile tests
- `npm run visual-qa:admin-primitives:test`
- targeted state adapter and harness catalog tests
- component-state contract tests and checks
- capture and interaction executor tests
- `npx tsc --noEmit`
- `npm run build`
- production Visual QA isolation tests
- `git diff --check`

From the monorepo root:

- `python3 scripts/validate_baseball_data_policy.py`

Before any production-readiness claim, apply the `kbo-release-verification` workflow and report exact commands and results. Do not call this cluster, phase, or repository complete while required evidence is missing.

## Alternatives Rejected

### Separate exported Visual QA host

This would make lazy phases easy to render but would add another visual symbol to the inventory, increase the remaining completeness burden, and test a parallel composition instead of the production parent.

### Harness-only module replacement

Mocking lazy imports only in the harness would avoid parent changes but would not prove the actual prop binding, phase ownership, or production isolation. Hosted evidence would be weaker than the repository's current standard.

### Full parent Cartesian product

Multiplying all data, inventory, lifecycle, phase, filter, page, and interaction values would produce many impossible or visually identical combinations. The constrained 82-scenario contract covers every legal owned branch while keeping each scenario attributable to one reason.

## Definition of Done

This six-symbol cluster is done only when:

1. all six symbols are registered;
2. the parent has exactly 82 unique, valid direct scenarios;
3. every hosted ID resolves to a generated parent scenario;
4. the request coordinator tests prove no activation/filter overlap;
5. the 320-pixel browser evidence passes with no layout or accessibility issue;
6. all targeted, contract, production-isolation, TypeScript, build, and policy gates pass;
7. manifest accounting matches the generated authoritative result;
8. the global report still states the truthful remaining pending count.
