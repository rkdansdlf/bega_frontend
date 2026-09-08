# Client Error Admin Mobile and Visual QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Register and verify the six-symbol `ClientErrorAdminPanel` host cluster with exactly 82 direct mobile scenarios while eliminating duplicate activation/filter event requests.

**Architecture:** The production parent remains the only host. A nonproduction-only state/renderer seam makes its lazy boundaries deterministic, while a focused request coordinator makes activation, window, and filter scheduling independently testable without a new DOM test dependency. A constrained manifest maps 52 default presentation presets plus 30 owned-control interaction targets into the exact 82-scenario contract; hosted children reference only those generated parent IDs.

**Tech Stack:** React 18, TypeScript 5.9, Vite 7, Tailwind CSS, Node built-in test runner with `tsx`, the existing Visual QA manifest/adapter/harness, Playwright/Chromium through the existing harness smoke runner.

**Spec:** `docs/superpowers/specs/2026-08-29-client-error-admin-mobile-visual-qa-design.md`

## Global Constraints

- Never add or suggest external baseball crawling, scraping, web-search repair, or external baseball API fallback.
- Keep all client-error API endpoints, request parameters, response types, authentication, and authorization contracts unchanged.
- Production must ignore `visualQaStateOverride` and `visualQaRenderers`; a nonproduction override must suppress all live dashboard, event, refresh, pagination, and detail API work.
- The parent direct contract must contain exactly 82 unique scenarios: 52 default presentations and 30 interaction-target scenarios.
- Initial capture viewport is exactly 320x844; tall normal-flow evidence uses `VISUAL_QA_HARNESS_CAPTURE_HEIGHT_MODE=expand-tall-flow` without increasing content width.
- Existing detail 104-scenario and insights 98-scenario direct contracts remain unchanged and authoritative.
- Preserve the dirty worktree. Before every commit, inspect `git status --short` and use path-limited `git commit --only`; do not sweep unrelated staged files into a commit.
- Use `apply_patch` for source and contract edits.
- Follow TDD: add each focused test first, run it in RED, then implement and rerun GREEN. Save the RED command and failure summary for the final report.
- Do not raise bundle or CSS budgets to make verification pass; reduce or split implementation if an existing budget fails.

## File Map

- Create `src/components/admin/clientErrorAdminRequestCoordinator.ts`: nonvisual activation/window/filter scheduler.
- Create `src/components/admin/clientErrorAdminRequestCoordinator.test.ts`: exact request-count regression tests.
- Create `src/components/admin/ClientErrorAdminPanel.mobile.test.tsx`: parent composition, production-isolation source contract, mobile, accessibility, and fail-closed tests.
- Modify `src/components/admin/ClientErrorAdminPanel.tsx`: coordinator integration, Visual QA seam, accessible lazy fallbacks, and mobile containment.
- Modify `src/visual-qa/stateAdapters.ts`: deterministic parent fixtures, actual lazy-child renderers, and `admin.client-error-panel` adapter.
- Modify `src/visual-qa/stateAdapters.test.ts`: exhaustive adapter mapping and invalid-combination tests.
- Modify `contracts/visual-qa-component-states-v1.json`: one 82-scenario direct parent entry and five hosted entries.
- Modify `src/visual-qa/harnessCatalog.test.ts`: exact family counts, interaction targets, hosted IDs, and new global count.
- Modify `package.json`: include both new component tests in `visual-qa:admin-primitives:test`.
- Modify `docs/VISUAL_QA.md`: record the verified cluster result and truthful remaining count.
- Generate `reports/visual-qa-admin-client-error-panel-mobile.json` and `reports/visual-qa-admin-client-error-panel-mobile-screenshots/`: local evidence, not production source.

---

### Task 1: Request Coordinator Regression

**Files:**
- Create: `src/components/admin/clientErrorAdminRequestCoordinator.test.ts`
- Create: `src/components/admin/clientErrorAdminRequestCoordinator.ts`

**Interfaces:**
- Consumes: an `{ active, windowKey, filterKey }` snapshot, one request callback, and injectable timer functions.
- Produces: `createClientErrorEventFilterKey(filters)`, `createClientErrorEventRequestCoordinator(options)`, and a coordinator with `sync`, `cancelPending`, and `dispose` methods.

- [ ] **Step 1: Write the failing coordinator tests**

Create tests using `node:test` and `node:assert/strict`. Use this deterministic timer fixture instead of real time:

```ts
const createTimers = () => {
  let nextId = 1;
  const callbacks = new Map<number, () => void>();
  return {
    callbacks,
    clearTimer: (id: unknown) => callbacks.delete(id as number),
    flush: () => {
      const queued = [...callbacks.values()];
      callbacks.clear();
      queued.forEach((callback) => callback());
    },
    setTimer: (callback: () => void) => {
      const id = nextId++;
      callbacks.set(id, callback);
      return id;
    },
  };
};
```

Cover these assertions in named tests:

```ts
coordinator.sync({ active: true, windowKey: '24h', filterKey: 'default' }, run);
assert.equal(runs, 1); // first active sync is immediate

coordinator.sync({ active: true, windowKey: '24h', filterKey: 'default' }, run);
assert.equal(runs, 1); // identical Strict Mode replay is ignored

coordinator.sync({ active: true, windowKey: '7d', filterKey: 'default' }, run);
assert.equal(runs, 2); // window change is immediate once

coordinator.sync({ active: true, windowKey: '7d', filterKey: 'route=a' }, run);
coordinator.sync({ active: true, windowKey: '7d', filterKey: 'route=ab' }, run);
assert.equal(timers.callbacks.size, 1);
timers.flush();
assert.equal(runs, 3); // rapid filters collapse to the newest request

coordinator.sync({ active: false, windowKey: '7d', filterKey: 'route=ab' }, run);
assert.equal(timers.callbacks.size, 0);
coordinator.sync({ active: true, windowKey: '7d', filterKey: 'route=ab' }, run);
assert.equal(runs, 4); // reactivation is immediate once
```

Also assert that `cancelPending()` and `dispose()` remove the pending callback, and that `createClientErrorEventFilterKey` changes for every one of the six filter fields.

- [ ] **Step 2: Run the coordinator test in RED**

Run:

```bash
node --import tsx --test src/components/admin/clientErrorAdminRequestCoordinator.test.ts
```

Expected: FAIL because `clientErrorAdminRequestCoordinator.ts` does not exist or its exports are missing.

- [ ] **Step 3: Implement the minimal coordinator**

Use these exact public types and behavior:

```ts
export interface ClientErrorEventFilterValues {
  bucket: string;
  source: string;
  statusGroup: string;
  route: string;
  fingerprint: string;
  search: string;
}

export interface ClientErrorEventRequestSnapshot {
  active: boolean;
  windowKey: string;
  filterKey: string;
}

export interface ClientErrorEventRequestCoordinator {
  sync(snapshot: ClientErrorEventRequestSnapshot, run: () => void): void;
  cancelPending(): void;
  dispose(): void;
}

export interface ClientErrorEventRequestCoordinatorOptions {
  delayMs?: number;
  setTimer?: (callback: () => void, delayMs: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export const createClientErrorEventFilterKey = (
  filters: Readonly<ClientErrorEventFilterValues>,
) => JSON.stringify([
  filters.bucket,
  filters.source,
  filters.statusGroup,
  filters.route,
  filters.fingerprint,
  filters.search,
]);
```

`sync` must leave an already scheduled callback intact for an identical snapshot, cancel it when the snapshot changes, record inactive snapshots without running, run activation/window changes immediately, and debounce only filter-key changes. `dispose` cancels but does not reset the previous snapshot, which prevents React Strict Mode's setup-cleanup-setup replay from issuing a second immediate request.

- [ ] **Step 4: Run coordinator tests in GREEN**

Run the same command. Expected: every coordinator test passes and no real timer remains open.

- [ ] **Step 5: Commit only the coordinator files**

```bash
git status --short
git add src/components/admin/clientErrorAdminRequestCoordinator.ts src/components/admin/clientErrorAdminRequestCoordinator.test.ts
git commit --only -m "fix: deduplicate client error event requests" -- src/components/admin/clientErrorAdminRequestCoordinator.ts src/components/admin/clientErrorAdminRequestCoordinator.test.ts
```

---

### Task 2: Deterministic Parent Host and Lazy Phases

**Files:**
- Create: `src/components/admin/ClientErrorAdminPanel.mobile.test.tsx`
- Modify: `src/components/admin/ClientErrorAdminPanel.tsx`

**Interfaces:**
- Consumes: coordinator exports from Task 1 and the existing detail, insights, chart, dashboard, event-page, and event-detail types.
- Produces: `ClientErrorAdminPanelVisualQaState`, `ClientErrorAdminPanelVisualQaRenderers`, `ClientErrorAdminPanelProps`, and deterministic parent rendering for all lazy phases.

- [ ] **Step 1: Write failing parent composition tests**

In `ClientErrorAdminPanel.mobile.test.tsx`, build one complete state fixture and renderer probes:

```tsx
const renderers: ClientErrorAdminPanelVisualQaRenderers = {
  chart: (props) => createElement('div', {
    'data-chart-count': props.chartData.length,
    'data-testid': 'client-error-chart-probe',
  }),
  detail: (props) => createElement('div', {
    'data-detail-loading': props.detailLoading,
    'data-detail-open': props.open,
    'data-detail-selected': props.selectedEvent?.eventId ?? 'none',
    'data-testid': 'client-error-detail-probe',
  }),
  insights: (props) => createElement('div', {
    'data-dashboard': props.dashboard ? 'present' : 'null',
    'data-testid': 'client-error-insights-probe',
  }),
};
```

Use `renderToStaticMarkup(createElement(ClientErrorAdminPanel, ...))` and assert:

- resolved phases bind the exact chart, nullable dashboard, and detail props;
- chart fallback renders `data-testid="admin-client-error-chart-fallback"`;
- insights deferred and suspense fallbacks render distinct full/compact skeleton test IDs;
- detail suspense fallback renders the modal fallback test ID;
- closed detail renders neither fallback nor resolved detail;
- missing required renderer, resolved detail while closed, fallback detail while closed, and resolved insights without a renderer each throw a descriptive error.

- [ ] **Step 2: Run the parent test in RED**

```bash
node --import tsx --test src/components/admin/ClientErrorAdminPanel.mobile.test.tsx
```

Expected: FAIL because the Visual QA state/renderer props and fallback test IDs do not exist.

- [ ] **Step 3: Add exact Visual QA interfaces**

Export these types from `ClientErrorAdminPanel.tsx`:

```ts
export type ClientErrorAdminWindowKey = '1h' | '24h' | '7d';

export interface ClientErrorAdminEventFilters {
  bucket: 'all' | 'api' | 'runtime';
  source: 'all' | 'api' | 'runtime' | 'unhandled_rejection';
  statusGroup: 'all' | '5xx' | '4xx' | 'none';
  route: string;
  fingerprint: string;
  search: string;
}

export interface ClientErrorAdminPanelVisualQaState {
  active: boolean;
  windowKey: ClientErrorAdminWindowKey;
  filters: ClientErrorAdminEventFilters;
  dashboard: AdminClientErrorDashboard | null;
  eventsPage: AdminClientErrorEventPage;
  currentPage: number;
  loadingDashboard: boolean;
  loadingEvents: boolean;
  panelError: string | null;
  detailOpen: boolean;
  detailLoading: boolean;
  selectedEvent: AdminClientErrorEventDetail | null;
  chartPhase: 'fallback' | 'resolved';
  insightsPhase: 'deferred-fallback' | 'suspense-fallback' | 'resolved';
  detailPhase: 'closed' | 'suspense-fallback' | 'resolved';
}
```

Define renderers with `ComponentProps` of the real lazy child component types and return `ReactNode`. `ClientErrorAdminPanelProps` keeps required `active` and adds optional override/renderer props.

- [ ] **Step 4: Integrate production isolation and request coordination**

Normalize requested props exactly once:

```ts
const visualQaStateOverride = import.meta.env?.PROD === true
  ? undefined
  : requestedVisualQaStateOverride;
const visualQaRenderers = import.meta.env?.PROD === true
  ? undefined
  : requestedVisualQaRenderers;
```

Initialize live state from the override for deterministic SSR. In every dashboard, event, refresh, pagination, and detail request entry point, return before calling the API when an override exists. Replace the two overlapping event effects with the Task 1 coordinator:

```ts
const eventRequestCoordinatorRef = useRef<ClientErrorEventRequestCoordinator | null>(null);
if (!eventRequestCoordinatorRef.current) {
  eventRequestCoordinatorRef.current = createClientErrorEventRequestCoordinator();
}

useEffect(() => {
  if (visualQaStateOverride) return;
  eventRequestCoordinatorRef.current?.sync({
    active,
    windowKey,
    filterKey: createClientErrorEventFilterKey(filters),
  }, () => {
    setCurrentPage(0);
    void loadEvents(0);
  });
}, [active, filters.bucket, filters.source, filters.statusGroup,
  filters.route, filters.fingerprint, filters.search, windowKey,
  visualQaStateOverride]);

useEffect(() => () => eventRequestCoordinatorRef.current?.dispose(), []);
```

The separate active/window effect calls `loadDashboard()` only. Keep manual refresh and previous/next pagination direct.

- [ ] **Step 5: Implement deterministic lazy rendering and validation**

Create named fallback components for chart, full/compact insights skeleton, and detail modal. Build child prop objects once, validate the override before rendering, and select each branch without invoking live lazy imports when an override is active. Use the real `Suspense` wrappers only for the live path.

Required validation messages must identify the parent and invalid phase, for example:

```ts
throw new Error('ClientErrorAdminPanel Visual QA resolved chart renderer is required.');
throw new Error('ClientErrorAdminPanel Visual QA detail phase requires an open detail.');
throw new Error('ClientErrorAdminPanel Visual QA closed detail phase must not be open.');
throw new Error('ClientErrorAdminPanel Visual QA resolved insights renderer is required.');
```

- [ ] **Step 6: Run parent and coordinator tests in GREEN**

```bash
node --import tsx --test src/components/admin/clientErrorAdminRequestCoordinator.test.ts src/components/admin/ClientErrorAdminPanel.mobile.test.tsx
```

Expected: all tests pass; the parent test must render the actual parent export, not a parallel host component.

- [ ] **Step 7: Commit only the clean parent files**

```bash
git status --short
git add src/components/admin/ClientErrorAdminPanel.tsx src/components/admin/ClientErrorAdminPanel.mobile.test.tsx
git commit --only -m "feat: expose deterministic client error admin host" -- src/components/admin/ClientErrorAdminPanel.tsx src/components/admin/ClientErrorAdminPanel.mobile.test.tsx
```

---

### Task 3: Mobile Containment and Accessible Controls

**Files:**
- Modify: `src/components/admin/ClientErrorAdminPanel.mobile.test.tsx`
- Modify: `src/components/admin/ClientErrorAdminPanel.tsx`

**Interfaces:**
- Consumes: Task 2 parent state and renderers.
- Produces: stable 320-pixel DOM hooks, accessible control names, internal scroll owners, and an announced modal lazy fallback.

- [ ] **Step 1: Add failing mobile and accessibility tests**

Add tests that render empty, long Korean, unbroken token, and maximum-supported fixtures and assert all of the following:

```ts
assert.match(html, /data-testid="admin-client-error-panel"/);
assert.match(html, /class="[^"]*min-w-0[^"]*"/);
assert.match(html, /data-testid="admin-client-error-fingerprints"/);
assert.match(html, /data-vqa-max-height="480"/);
assert.match(html, /data-testid="admin-client-error-events-scroll"/);
assert.match(html, /overflow-x-auto/);
assert.match(html, /overflow-wrap:anywhere/);
assert.match(html, /aria-label="기간 선택"/);
assert.match(html, /aria-label="Bucket 필터"/);
assert.match(html, /aria-label="Source 필터"/);
assert.match(html, /aria-label="Status 필터"/);
assert.match(html, /aria-label="Route 필터"/);
assert.match(html, /aria-label="Fingerprint 필터"/);
assert.match(html, /aria-label="이벤트 검색"/);
assert.match(html, /role="alert"/);
assert.match(html, /role="status"/);
```

For the detail fallback assert `role="dialog"`, `aria-modal="true"`, `aria-busy="true"`, its accessible title, and a close button that calls the provided close handler in the resolved prop contract. Assert each detail-open button's accessible name includes its event ID and each button has at least `min-h-11`.

- [ ] **Step 2: Run the parent test in RED**

```bash
node --import tsx --test src/components/admin/ClientErrorAdminPanel.mobile.test.tsx
```

Expected: FAIL on missing labels, scroll hooks, wrapping, or modal semantics.

- [ ] **Step 3: Apply the mobile layout contract**

Make these scoped changes in `ClientErrorAdminPanel.tsx`:

- root: `min-w-0 space-y-6 overflow-x-hidden` and `data-testid="admin-client-error-panel"`;
- dense sections: `p-4 sm:p-5`;
- text/grid/card containers: `min-w-0`;
- large values: `text-3xl sm:text-4xl [overflow-wrap:anywhere]`;
- error, route, event ID, fingerprint, and metadata copy: `[overflow-wrap:anywhere]`;
- header and pagination: wrapping mobile rows with `items-start` and a full-width control group when necessary;
- all controls and action buttons: `min-h-11`, with stable `data-testid` attributes used by Task 5;
- fingerprint inventory: `max-h-[480px] overflow-x-hidden overflow-y-auto`, `data-vqa-max-height="480"`, and `data-testid="admin-client-error-fingerprints"`;
- table owner: `overflow-x-auto overflow-y-hidden` and `data-testid="admin-client-error-events-scroll"`; give the table a readable `min-w-[760px]` without applying width to the document root.

- [ ] **Step 4: Add labels and announced states**

Add explicit `aria-label` values listed in Step 1. Use `role="alert"` for `panelError`; use `role="status"`, `aria-live="polite"`, and `aria-busy` for dashboard/event/chart/insights/detail loading or empty states. Keep disabled pagination semantics native.

Build the detail fallback from the existing dialog primitives so it owns the backdrop, focus trap, modal naming, loading status, and close button. Do not render a hand-written fixed overlay alongside the real dialog primitive.

- [ ] **Step 5: Run mobile tests in GREEN**

```bash
node --import tsx --test src/components/admin/ClientErrorAdminPanel.mobile.test.tsx
```

Expected: empty, pressure, maximum, fallback, label, and invalid-state tests all pass.

- [ ] **Step 6: Commit the mobile contract**

```bash
git status --short
git add src/components/admin/ClientErrorAdminPanel.tsx src/components/admin/ClientErrorAdminPanel.mobile.test.tsx
git commit --only -m "fix: contain client error admin mobile layout" -- src/components/admin/ClientErrorAdminPanel.tsx src/components/admin/ClientErrorAdminPanel.mobile.test.tsx
```

---

### Task 4: Parent State Adapter and Deterministic Fixtures

**Files:**
- Modify: `src/visual-qa/stateAdapters.test.ts`
- Modify: `src/visual-qa/stateAdapters.ts`

**Interfaces:**
- Consumes: Task 2 parent interfaces and existing client-error detail/insights fixture builders in `stateAdapters.ts`.
- Produces: adapter ID `admin.client-error-panel`, 52 named presentation presets, deterministic renderers for the actual lazy children, and fail-closed interaction-target validation.

- [ ] **Step 1: Write the failing adapter tests**

Add `admin.client-error-panel` to the adapter ID inventory and create a table of the 52 default presets:

```ts
const dataPresets = [
  'none-empty',
  'dashboard-only-empty', 'dashboard-only-populated',
  'dashboard-only-null-optional', 'dashboard-only-boundary-minimum',
  'dashboard-only-boundary-maximum', 'dashboard-only-long-korean',
  'dashboard-only-unbroken-token', 'dashboard-only-maximum-supported',
  'events-only-populated', 'events-only-null-optional',
  'events-only-boundary-minimum', 'events-only-boundary-maximum',
  'events-only-long-korean', 'events-only-unbroken-token',
  'events-only-maximum-supported',
  'both-populated', 'both-null-optional', 'both-boundary-minimum',
  'both-boundary-maximum', 'both-long-korean',
  'both-unbroken-token', 'both-maximum-supported',
] as const;

const lifecyclePresets = [
  'inactive', 'dashboard-loading', 'events-loading', 'refresh-loading',
  'panel-error', 'detail-error',
] as const;

const lazyPresets = [
  'chart-fallback', 'insights-deferred-fallback',
  'insights-suspense-fallback', 'detail-suspense-fallback',
  'detail-resolved-loading', 'detail-resolved-populated',
] as const;

const valuePresets = [
  'window-1h', 'window-7d', 'page-middle', 'page-last',
  'filter-bucket-api', 'filter-bucket-runtime', 'filter-source-api',
  'filter-source-runtime', 'filter-source-unhandled-rejection',
  'filter-status-5xx', 'filter-status-4xx', 'filter-status-none',
  'filter-route', 'filter-fingerprint', 'filter-search',
  'filter-long-korean', 'filter-unbroken-token',
] as const;
```

Assert the arrays contain 23, 6, 6, and 17 values. For each preset, call `resolveComponentStateAdapter` with its canonical `data`, `system`, `permissions=admin`, `interactions=default`, `variant.preset`, and `variant.theme=dark`. Assert the returned override matches the intended inventory, phases, window, page, filters, loading/error flags, and detail state.

Add interaction tests for exactly these target sets:

```ts
const actionTargets = new Set(['refresh', 'fingerprint', 'detail', 'previous', 'next']);
const selectTargets = new Set(['window', 'bucket', 'source', 'status']);
const inputTargets = new Set(['route', 'fingerprint-input', 'search']);
```

Validate hover/pressed only on action targets; focus-visible on all 12 controls; input on the three text fields; change on the four selects; keyboard-navigation only on `filter-tab-path`. All non-default interactions must require `data=maximum-supported`, `system=idle`, and `variant.preset=both-maximum-supported`.

Assert unsupported permissions, undeclared variants, wrong preset/data or preset/system pairs, wrong targets, and missing renderers throw `지원하지 않는 Admin client-error panel state`.

- [ ] **Step 2: Run the adapter test in RED**

```bash
node --import tsx --test --test-name-pattern "admin client-error panel adapter" src/visual-qa/stateAdapters.test.ts
```

Expected: FAIL because `admin.client-error-panel` is not registered.

- [ ] **Step 3: Add focused fixture mapping**

Reuse `VisualQaClientErrorDataState`, `resolveVisualQaClientErrorDetail`, and `resolveVisualQaClientErrorInsightsDashboard`. Add one parent preset resolver that returns:

```ts
interface VisualQaClientErrorPanelPreset {
  data: VisualQaClientErrorDataState;
  system: 'idle' | 'inactive' | 'dashboard-loading' | 'events-loading'
    | 'refresh-loading' | 'panel-error' | 'detail-error';
  inventory: 'none' | 'dashboard-only' | 'events-only' | 'both';
  chartPhase: 'fallback' | 'resolved';
  insightsPhase: 'deferred-fallback' | 'suspense-fallback' | 'resolved';
  detailPhase: 'closed' | 'suspense-fallback' | 'resolved';
  windowKey: '1h' | '24h' | '7d';
  page: 'first' | 'middle' | 'last';
  filters: ClientErrorAdminEventFilters;
}
```

Build dashboard and event inventories at their legal limits, including nullable values, 20 event rows for maximum-supported, and the existing bounded dashboard inventories. Do not synthesize baseball facts.

Use these canonical mapping rules; no preset may rely on an inferred default outside this list:

- `none-empty`: data `empty`, system `idle`, no dashboard, no events.
- each `dashboard-only-<data>`: the suffix is the data value, system `idle`, dashboard present, events empty.
- each `events-only-<data>`: the suffix is the data value, system `idle`, dashboard null, events present.
- each `both-<data>`: the suffix is the data value, system `idle`, dashboard and events present.
- `inactive`: data `empty`, system `inactive`, no inventory, active false.
- `dashboard-loading`, `events-loading`, and `refresh-loading`: data `populated`, matching system value, both inventories present, with only the named loading flags true.
- `panel-error`: data `long-korean`, system `panel-error`, both inventories present, long Korean alert copy.
- `detail-error`: data `populated`, system `detail-error`, both inventories present, detail open/resolved with loading false and selected event null.
- all six lazy presets: data `maximum-supported`, system `idle`, both inventories present; only the named lazy/detail phase differs.
- all 17 value presets: data `populated`, system `idle`, both inventories present; start from `24h`, first page, and empty filters, then change only the value named by the preset.

- [ ] **Step 4: Add actual lazy child renderers and adapter validation**

Add lazy imports for `ClientErrorTrendChart`, `ClientErrorAdminInsightsRuntime`, and `ClientErrorAdminDetailRuntime` inside `stateAdapters.ts`, following `VisualQaAdminStadiumsPanel`. Wrap each in the existing deterministic `Suspense` pattern and pass the props received from the parent renderer callback.

Return:

```ts
{
  props: {
    active: preset.system !== 'inactive',
    visualQaStateOverride,
    visualQaRenderers: { chart, detail, insights },
  },
  captureSelector: preset.detailPhase === 'closed'
    ? '[data-testid="admin-client-error-panel"]'
    : '[role="dialog"]',
  surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-slate-950 p-4 text-slate-100 shadow-none',
  theme: 'dark',
}
```

Reject every combination that does not match the preset's canonical data/system pair or the interaction rules from Step 1.

- [ ] **Step 5: Run adapter tests in GREEN**

```bash
node --import tsx --test --test-name-pattern "admin client-error panel adapter" src/visual-qa/stateAdapters.test.ts
```

Expected: the 52 preset mappings, 30 target mappings, and fail-closed cases pass.

- [ ] **Step 6: Do not commit shared dirty files yet**

Inspect:

```bash
git status --short src/visual-qa/stateAdapters.ts src/visual-qa/stateAdapters.test.ts
git diff -- src/visual-qa/stateAdapters.ts src/visual-qa/stateAdapters.test.ts
```

These files already contain the preceding insights-cluster work. Keep them staged/dirty for the combined Visual QA contract commit in Task 5 rather than committing an incomplete shared state.

---

### Task 5: Exact 82-Scenario Manifest and Hosted Evidence

**Files:**
- Modify: `contracts/visual-qa-coverage-v1.json`
- Modify: `contracts/visual-qa-component-states-v1.json`
- Modify: `scripts/visual-qa-component-states.mjs`
- Modify: `scripts/visual-qa-component-states.test.mjs`
- Modify: `src/visual-qa/harnessCatalog.test.ts`
- Modify: `src/visual-qa/stateAdapters.test.ts`
- Modify: `src/visual-qa/stateAdapters.ts`

**Interfaces:**
- Consumes: the 52 preset adapter and 30 interaction targets from Task 4.
- Produces: 82 direct parent scenarios, five hosted registrations with real host IDs, and authoritative counts of 401 registered, 599 pending, 70,354 direct scenarios, and 71,357 valid combinations.

- [ ] **Step 1: Write failing catalog assertions**

Add a test that filters `AUTOMATIC_COMPONENT_STATE_SCENARIOS` by:

```ts
const componentId = 'src/components/admin/ClientErrorAdminPanel.tsx#ClientErrorAdminPanel';
```

Assert:

```ts
assert.equal(scenarios.length, 82);
assert.equal(scenarios.filter(({ states }) => states.interactions === 'default').length, 52);
assert.equal(scenarios.filter(({ states }) => states.interactions !== 'default').length, 30);
assert.equal(new Set(scenarios.map(({ id }) => id)).size, 82);
```

Assert default preset family counts 23/6/6/17. Assert interaction target counts hover 5, focus-visible 12, pressed 5, input 3, change 4, keyboard-navigation 1. Assert every scenario is admin/dark and every non-default interaction uses `both-maximum-supported`.

Add hosted tests that require exact counts detail 4, insights 4, skeleton 2, chart 3, and monitoring card 8; every hosted ID must be present in the 82-ID parent set.

- [ ] **Step 2: Run catalog tests in RED**

```bash
node --import tsx --test --test-name-pattern "client-error panel" src/visual-qa/harnessCatalog.test.ts
```

Expected: FAIL because the parent is pending and has no scenarios.

- [ ] **Step 3: Register the parent axes and 52 preset values**

First extend the normative coverage catalog with only the approved values that
this parent contract consumes but the catalog does not yet declare:

- interactions: `change`;
- system: `inactive`, `dashboard-loading`, `events-loading`,
  `refresh-loading`, and `detail-error`.

Preserve every existing catalog value and run `npm run visual-qa:contract:check`
and `npm run visual-qa:contract:test` after the edit.

Extend `EXPECTED_INTERACTION_ACTIONS` with `change: 'press-key'`. A validated
hosted evidence wrapper whose four axes and variants are all explicitly
`notApplicable` contributes zero independent valid combinations because it only
points to already generated direct scenario IDs. Hosted entries that declare any
applicable state or variant dimension keep their existing combination semantics.
Add a script regression test proving the mapping and this fully-not-applicable
hosted de-duplication rule.

Change only the parent entry to `status=registered`, `render.mode=direct`, and `render.adapterId=admin.client-error-panel`. Declare:

- data: the eight standard pressure values;
- permissions: `admin`;
- interactions: `default`, `hover`, `focus-visible`, `pressed`, `input`, `change`, `keyboard-navigation`;
- system: `idle`, `inactive`, `dashboard-loading`, `events-loading`, `refresh-loading`, `panel-error`, `detail-error`;
- variant `preset`: the exact 52 values from Task 4;
- variant `theme`: `dark`.

For each preset, add `excludeWhen` constraints for the seven wrong data values and six wrong system values. Generate the repetitive constraint objects to stdout from one explicit preset-to-`{data,system}` map, then add them with `apply_patch`; do not write the contract with a temporary script. Every constraint includes `owner=frontend-admin` and test evidence pointing to the parent adapter test.

- [ ] **Step 4: Add exact interaction plans**

Use the canonical `when` condition:

```json
{
  "data": "maximum-supported",
  "system": "idle",
  "variant.preset": "both-maximum-supported"
}
```

Plans:

- hover: action `hover`, five action targets;
- focus-visible: action `focus-visible`, all 12 controls;
- pressed: action `pressed`, five action targets;
- input: action `fill`, route/fingerprint/search values using Korean and unbroken pressure-safe copy;
- change: action `press-key`, four select targets with key `End`;
- keyboard-navigation: action `press-key`, target `filter-tab-path`, window selector, key `Tab`.

Selectors must use the stable `data-testid` attributes added in Task 3.

- [ ] **Step 5: Confirm the direct scenario set is exactly 82**

```bash
node --import tsx --test --test-name-pattern "client-error panel" src/visual-qa/harnessCatalog.test.ts
```

If the count is not 82, fix the manifest constraints or interaction `when` predicates. Do not alter the approved family totals.

- [ ] **Step 6: Resolve and register actual hosted IDs**

Use the generated `AUTOMATIC_COMPONENT_STATE_SCENARIOS` list to print IDs selected by these predicates:

- detail: presets `detail-suspense-fallback`, `detail-resolved-loading`, `detail-resolved-populated`, `detail-error`;
- insights: `none-empty`, `dashboard-only-empty`, `dashboard-only-populated`, `dashboard-only-maximum-supported`;
- skeleton: `insights-deferred-fallback`, `insights-suspense-fallback`;
- chart: `chart-fallback`, `dashboard-loading`, `dashboard-only-maximum-supported`;
- monitoring: the eight `dashboard-only-*` presets.

Paste those exact generated IDs into the five hosted entries' `render.hostScenarioIds`. Do not hand-construct or shorten IDs.

- [ ] **Step 7: Refresh and verify the manifest**

```bash
npm run visual-qa:states:refresh
npm run visual-qa:contract:check
npm run visual-qa:contract:test
npm run visual-qa:states:check
npm run visual-qa:states:test
node --import tsx --test src/visual-qa/stateAdapters.test.ts src/visual-qa/harnessCatalog.test.ts
```

Expected: parent 82, hosted counts 4/4/2/3/8, registered 401, pending 599, direct 70,354, valid 71,357. The strict completeness mode must still exit nonzero only because 599 entries remain pending.

- [ ] **Step 8: Commit the cohesive shared contract**

First inspect the staged and unstaged versions so the preceding insights work is not lost:

```bash
git status --short
git diff --cached -- contracts/visual-qa-component-states-v1.json src/visual-qa/stateAdapters.ts src/visual-qa/harnessCatalog.test.ts
git diff -- contracts/visual-qa-component-states-v1.json src/visual-qa/stateAdapters.ts src/visual-qa/stateAdapters.test.ts src/visual-qa/harnessCatalog.test.ts
```

Then commit only the four cohesive Visual QA files:

```bash
git add contracts/visual-qa-coverage-v1.json contracts/visual-qa-component-states-v1.json scripts/visual-qa-component-states.mjs scripts/visual-qa-component-states.test.mjs src/visual-qa/stateAdapters.ts src/visual-qa/stateAdapters.test.ts src/visual-qa/harnessCatalog.test.ts
git commit --only -m "test: register client error admin host states" -- contracts/visual-qa-coverage-v1.json contracts/visual-qa-component-states-v1.json scripts/visual-qa-component-states.mjs scripts/visual-qa-component-states.test.mjs src/visual-qa/stateAdapters.ts src/visual-qa/stateAdapters.test.ts src/visual-qa/harnessCatalog.test.ts
```

---

### Task 6: Suite Integration and Static Verification

**Files:**
- Modify: `package.json`
- Modify: `docs/VISUAL_QA.md`

**Interfaces:**
- Consumes: all implementation and contract work from Tasks 1-5.
- Produces: repeatable admin-suite execution and a truthful cluster audit record.

- [ ] **Step 1: Add both new tests to the admin suite**

Append these paths to `visual-qa:admin-primitives:test`:

```text
src/components/admin/clientErrorAdminRequestCoordinator.test.ts
src/components/admin/ClientErrorAdminPanel.mobile.test.tsx
```

Do not reorder or remove existing tests.

- [ ] **Step 2: Run focused and aggregate unit gates**

```bash
node --import tsx --test src/components/admin/clientErrorAdminRequestCoordinator.test.ts src/components/admin/ClientErrorAdminPanel.mobile.test.tsx
npm run visual-qa:admin-primitives:test
node --import tsx --test src/visual-qa/stateAdapters.test.ts src/visual-qa/harnessCatalog.test.ts
node --test scripts/visual-qa-component-states.test.mjs
node --import tsx --test scripts/visual-qa-harness-interactions.test.ts scripts/visual-qa-harness-smoke.test.ts
```

Expected: all commands pass; record exact passed test totals.

- [ ] **Step 3: Run production isolation, type, policy, and build gates**

From `bega_frontend`:

```bash
node --test scripts/lib/visual-qa-production-isolation.test.mjs scripts/visual-qa-import-graph.test.mjs
npx tsc --noEmit
npm run build
git diff --check
```

From `/Users/mac/project/KBO_platform`:

```bash
python3 scripts/validate_baseball_data_policy.py
```

Expected: production isolation has zero violations, TypeScript exits 0, build and all bundle/CSS budgets pass without budget increases, diff check is clean, and baseball policy reports OK.

- [ ] **Step 4: Commit suite wiring; leave measured docs for Task 7**

```bash
git status --short
git add package.json
git commit --only -m "test: add client error admin host regression suite" -- package.json
```

---

### Task 7: Chromium Evidence and Release Verification

**Files:**
- Generate: `reports/visual-qa-admin-client-error-panel-mobile.json`
- Generate: `reports/visual-qa-admin-client-error-panel-mobile-screenshots/`
- Modify: `docs/VISUAL_QA.md`

**Interfaces:**
- Consumes: the exact 82-scenario catalog and the existing harness server/smoke runner.
- Produces: first-attempt Chromium evidence, inspected representative PNGs, final documentation, and release-gate results.

- [ ] **Step 1: Run all 82 parent scenarios in fresh Chromium pages**

From `bega_frontend`:

```bash
VISUAL_QA_HARNESS_COMPONENT_IDS='src/components/admin/ClientErrorAdminPanel.tsx#ClientErrorAdminPanel' \
VISUAL_QA_HARNESS_CAPTURE_HEIGHT_MODE=expand-tall-flow \
VISUAL_QA_HARNESS_PAGE_MODE=fresh \
VISUAL_QA_HARNESS_REPORT=reports/visual-qa-admin-client-error-panel-mobile.json \
VISUAL_QA_HARNESS_SCREENSHOTS_DIR=reports/visual-qa-admin-client-error-panel-mobile-screenshots \
npm run visual-qa:harness:component-states
```

Expected: expected 82, actual 82, passed 82, failed 0, recovered 0, and every result succeeds on attempt 1.

- [ ] **Step 2: Verify report and PNG integrity**

Use a Node assertion command to verify:

- 82 unique scenario IDs;
- 82 unique screenshot paths;
- every screenshot exists and has a nonzero size;
- every result belongs to the parent component;
- capture mode is `expand-tall-flow` and page mode is `fresh`;
- missing and stale scenario arrays are empty;
- SHA-256 hashes are unique except where a documented visually identical fallback is intentional; any identical hash must be investigated before acceptance.

- [ ] **Step 3: Inspect representative images**

Open with the local image viewer at least these scenario PNGs:

- `none-empty`;
- `dashboard-only-empty` and `dashboard-only-maximum-supported`;
- `events-only-maximum-supported` and `both-maximum-supported`;
- long Korean and unbroken token;
- chart fallback;
- both insights fallbacks;
- detail suspense modal, resolved loading, populated, and error;
- middle-page table with previous/next enabled;
- fingerprint, detail, select, text-input, and keyboard focus evidence.

Reject the run for document-level horizontal overflow, clipped text outside its owning scroll region, badge/header overlap, table escaping its inner scroller, unbounded fingerprint growth, missing modal backdrop, background pointer access, missing focus indication, or an incorrect tall-element tile.

- [ ] **Step 4: Rerun all completion gates after browser findings**

Repeat Task 6 Steps 2 and 3 after any browser-driven adjustment. Then run:

```bash
npm run visual-qa:contract:test
npm run visual-qa:contract:check
npm run visual-qa:inventory:test
npm run visual-qa:inventory:check
npm run visual-qa:states:test
npm run visual-qa:states:check
```

Expected: all non-strict gates pass. Run the strict completeness check separately and record its expected nonzero exit due exactly 599 pending entries; never present that failure as a cluster defect or as global completion.

- [ ] **Step 5: Apply the release-verification workflow**

Read and follow `.codex/skills/kbo-release-verification/SKILL.md`. Report exact command results, build module count, CSS size/budget, relevant chunk size/budget, bundle budget count, and production-isolation violation count. Do not claim deployment or repository-wide readiness.

- [ ] **Step 6: Finalize and commit measured documentation**

Update `docs/VISUAL_QA.md` with only the values proven in Steps 1-5. After the Task 7A source-inventory reconciliation, record the authoritative `411/1010 registered` and `599 pending` counts if the refreshed reports match them.

```bash
git add docs/VISUAL_QA.md
git commit --only -m "docs: record client error admin mobile QA" -- docs/VISUAL_QA.md
```

- [ ] **Step 7: Final worktree audit**

```bash
git status --short
git diff --check
git log --oneline -6
```

Confirm no unrelated file was modified, staged, or committed; report any pre-existing dirty files separately. State clearly that this cluster is complete only if all evidence above passes, while the full source-inventory objective remains active with 599 pending.

---

### Task 7A: Classify and Register Ten Hosted Admin Internals

**Files:**
- Modify: `contracts/visual-qa-component-classifications-v1.json`
- Modify: `contracts/visual-qa-component-states-v1.json`
- Modify: `src/visual-qa/harnessCatalog.test.ts`

**Interfaces:**
- Consumes: existing direct scenarios for the four administrator parent hosts.
- Produces: reviewed visual classifications and hosted evidence for all ten JSX callables discovered by the final inventory gate, without adding direct scenarios or independent valid combinations.

- [ ] Add a failing contract test for the exact ten inventory IDs. Assert reviewed `visual`/`hosted` classifications, registered fully-not-applicable hosted state entries, generated host-ID membership, and host counts `4/4/1/3/4/3/1/1/3/1`.
- [ ] Capture RED with the focused test and `npm run visual-qa:inventory:check`, which must report exactly ten unclassified symbols.
- [ ] Run `node scripts/visual-qa-component-inventory.mjs --refresh-classifications`; structural comparison must show only the ten reviewed JSX visual/hosted additions and no exclusions or provisional classifications.
- [ ] Run `npm run visual-qa:states:refresh`, then replace only the ten new pending entries with fully-not-applicable hosted registrations. Select full generated IDs using the approved predicates in `task-7a-brief.md`; never hand-construct IDs.
- [ ] Verify inventory test/check, state test/non-strict/strict, and the focused harness test. Expected: 2,101 classified symbols, zero unclassified/stale/provisional/parse errors, 411/1,010 registered, 599 pending, 70,354 direct, and 71,357 valid. Strict completeness remains nonzero only for pending.
- [ ] Commit only the three paths with `test: register admin fallback host evidence`.
