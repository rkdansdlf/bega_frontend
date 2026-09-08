# Admin Hosted Leaf Visual QA Reconciliation Design

## Goal

Close fifteen administrator-only hosted visual symbols that are already rendered by registered direct parents and already present in preserved 320px Chromium evidence. This is a coverage-evidence reconciliation only: no production component, API, authorization, baseball-data, adapter, or browser behavior may change.

## Scope

### AdminCommunityRuntime (4)

- `AdminRoleChangeDialogContent`
- `MatesAdminPanel`
- `PostsAdminPanel`
- `UsersAdminPanel`

### AdminGameStatusRepairPanel (8)

- `AdminGameStatusBadge`
- `CleanupArtifactPaths`
- `CleanupClosureStatus`
- `MismatchDateSuggestionCard`
- `MismatchReasons`
- `NonCanonicalGameRow`
- `RepairedGameRow`
- `SummaryCard`

### AdminStadiumsRuntime (3)

- `AdminDeletePlaceDialogContent`
- `AdminPlaceDialogContent`
- `AdminStadiumsPanel`

## Evidence model

Each hosted entry remains `renderAccess: hosted` and becomes `status: registered` with `render.mode: hosted`. Its four state axes and variants are explicitly `notApplicable` because the registered parent owns those matrices. `constraints` stays empty.

Only current generated parent scenario IDs that visibly render the real child are admissible:

- Community panels use their matching `maximum-supported`, resolved-tab parent scenario; the role dialog uses the resolved super-admin dialog scenario.
- All eight game-status internals use the preserved `maximum-supported / admin / idle / active / dark` scenario, where they are simultaneously visible.
- Stadium panel uses the resolved closed-dialog maximum scenario; place content uses create-resolved and edit-resolved; delete content uses delete-resolved.

The exact IDs must exist in `AUTOMATIC_COMPONENT_STATE_SCENARIOS` and in the preserved green report for that parent.

## Explicit exclusions

- The three pending AI lazy wrappers are excluded because the current parent Visual QA path does not render each exact production lazy child in all candidate screenshots.
- `AdminModerationRuntime` lazy bindings are excluded until the direct parent contract exists.
- Module-export leaves such as `ClientErrorTrendChart`, `MatesAdminPanel`, `PostsAdminPanel`, and `UsersAdminPanel` remain pending until direct adapters are implemented.
- No external baseball data, crawling, scraping, search repair, or external baseball API work is allowed. Existing manual-required behavior remains unchanged.

## Expected contract delta

- registered: `411 -> 426`
- pending: `599 -> 584`
- total state entries: unchanged at `1,010`
- direct scenarios: unchanged at `70,354`
- hosted references: `+16` (4 community + 8 game status + 4 stadium)
- valid combinations: expected `71,357 -> 71,373`, subject to the authoritative state generator
- inventory: unchanged at 2,101 symbols, with zero unclassified/stale/provisional/parse errors

## Verification

The task is complete only when:

1. a focused catalog test fails before manifest registration and passes afterward;
2. every host ID is a current generated direct scenario for the correct parent;
3. every host ID exists and passed in its preserved Chromium report;
4. classification/inventory and state-contract gates remain clean;
5. the strict completeness gate fails only because 584 entries remain pending;
6. an independent reviewer approves the scoped diff and evidence mapping.

