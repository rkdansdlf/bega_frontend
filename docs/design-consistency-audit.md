# BEGA design consistency audit — 2026-10-13

## Basis and scope

- Repository: `rkdansdlf/bega_frontend`, starting HEAD `4b29b2e978fe91a26ba9b731c84e531937d0cb74`.
- Starting branch: `wip/frontend-uncommitted-2026-10-13`; tracked working tree clean, existing `artifacts/` untracked. Work branch: `codex/design-consistency-20261013`.
- The parent monorepo has unrelated changes; these are outside this task. No API, route, data, interaction, authorization, seat coordinates or breakpoints are to change.
- Authority: actual `src/index.css`, `tailwind.config.js`, `docs/design-tokens.md`, existing UI primitives and Visual QA contracts. CodeGraph and graphify were consulted before source exploration; CodeGraph reported a parent-worktree index, so current source is the audit evidence.
- Existing Visual QA remains partial. The initial inventory check reports **3 unclassified / 0 stale / 0 provisional**; these are pre-existing and must not be relabelled as complete by this work.

## Confirmed findings

Line references in this table refer to the starting HEAD. Priority P2 means a verified component contract discrepancy; P3 means maintainability or missing comparison evidence. Different screen layouts alone are not defects.

| ID | Screen | File:line | Current implementation | Reference implementation | Evidence | Intentional exception? | Priority | Fix | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Shared forms / Auth / Mate / Admin | `src/components/ui/input.tsx:11`, `src/components/ui/textarea.tsx:10`, `src/components/ReviewDialog.tsx:183` | `bg-input-background` used, but no matching Tailwind color or CSS utility exists | `bg-background` uses the existing `--background` surface; retain `dark:bg-input/30` | Tailwind color map lacks `input-background`; rendered light fields inherit transparent background from preflight | No | P2 | Reuse the supported surface utility, preserve height, text, focus and invalid contracts | Compile generated utility CSS; form harness; light/dark screenshots |
| DS-002 | Shared Button / PlainButton | `src/components/ui/button.tsx:5`, `src/components/ui/plain-button.tsx:12` | Duplicated variant/size definitions; plain lacks destructive dark/focus and aria-invalid styles; SVG padding and small gap differ | Existing regular Button variant/size contracts and global `.bf` containment | Direct source comparison; same named variants/sizes have different styles | Lightweight implementation is intentional; duplicate style drift is not | P2 | Share dependency-free style constants; retain plain renderer and prop/ref/asChild behavior and public size/variant subset | All common variant/size combinations; override/ref/link tests; keyboard/hover/pressed/disabled harness |
| DS-003 | StatusBadge filled | `src/components/ui/status-badge.tsx:132` | Hardcoded `bg-[#173b34]` | `src/index.css` as brand color SSOT | Color is an intentionally deeper brand shade, not equivalent to existing `primary-dark` | Shade yes, hardcoding no | P3 | Name the exact RGB shade in SSOT and reference it; keep team marker/text overrides | Generated CSS and filled badge screenshots in both themes; no pixel difference expected |
| DS-004 | Cheer navigation | `src/components/CheerRuntime.tsx:99`, `:504` | `#64748B`, `#0F172A`, `#334155`, `#F1F5F9` repeat supported slate scale values | `text-slate-500`, `hover:text-slate-900`, `text-slate-700`, `hover:bg-slate-100` | Exact RGB equivalence with Tailwind defaults | Neutral palette and screen design yes, duplicate literals no | P3 | Exact-value utility substitutions only | Cheer tab/search/anonymous/owner/loading harness and before/after screenshots |
| DS-005 | Cheer page surface | `src/components/CheerRuntime.tsx:479` | `bg-[#f7f9f9]` | Existing `--cheer-sub-card: #f7f9f9` in `src/index.css:135` | Byte-identical light value already in SSOT | Cheer surface and dark override intentional | P3 | Reference existing Cheer token, retain `dark:bg-background` | Both-theme computed colors and route screenshots |
| DS-006 | UI kit | `src/components/ui/UIKitPreview.tsx:82` | Only a few Button examples and Card samples; no form/PlainButton/badge/dialog/state comparison | Existing production primitives and state adapters | Actual JSX has no Input, Textarea, StatusBadge, PlainButton or PlainDialog specimens | No | P3 | Add representative side-by-side controls and states using existing primitives and existing harness entry | Existing UI kit interaction scenarios plus form/dialog keyboard operation; five widths and 200% |
| DS-007 | Guardrails | `scripts/uiux-policy-check.mjs:337` | Existing check validates semantic token declarations, not new hardcoded colors, unsupported utilities or arbitrary type/radius values | Existing UI UX policy command + Visual QA contract | Current policy has no source drift baseline comparison | Legacy unresolved styles must be explicit baseline; intentional files need scoped reasons and owners | P3 | Extend existing policy command with an offline source check and reviewable occurrence baseline; no second QA system | Mutation tests proving new drift fails and removals do not grow baseline; policy command |

| DS-008 | Home secondary panels | `src/components/home/HomeSecondaryPanels.tsx:519,552,607,608,619` | Five raw `#2d5f4f` brand accents | Existing SSOT pattern; exact RGB 45 95 79 | Avatar initials, trophy and own-team emphasis use the same non-team brand shade | Shade yes, duplication no | P3 | Define `primary-panel` preserving all dark overrides and alpha | Home panel harness and screenshots |
| DS-009 | Mate cards and list controls | `src/components/MatePartyCard.tsx:148,164,284`, `MateStatusTabs.tsx:26,38`, `MateTeamFilterButton.tsx:14`, `MateListControlsRuntime.tsx:45,277,298,308` | Raw black dark surfaces and ring offsets | Current dark `--card` / `--background` both black | Exact CSS value equivalence; `MateViewToggle` already uses `dark:bg-card` | Favorite `#111111` remains separate | P3 | Use card/background tokens; retain `/95`, breakpoints and transparent overrides | Card/list controls/keyboard harness |
| DS-010 | Shared loading / UI Kit | `src/components/ui/skeleton.tsx:9` | Default `dark:bg-card` equals the dark Card background; the loading Card appears blank | Existing `--input` neutral tone differs from black `--card` | Actual dark UI Kit screenshot before this fix plus CSS token resolution show invisible bars | No | P2 | Use `dark:bg-input`; preserve light color, sizes, animation and overrides | Token regression test, both-theme loading screenshots, reduced-motion matrix |

## Intentional exceptions

| Scope / owner | Reason and boundary |
| --- | --- |
| `prediction/predictionUiTokens.ts`, Prediction maintainers | Gradient header, white analysis surfaces, compact chips are feature-specific; do not flatten into Card layout. |
| `prediction/coachStyleTokens.ts`, AI Coach maintainers | Isolated LIGHT/DARK editorial palette and paper texture are documented; keep non-brand palette values. |
| `constants/teams.ts`, `utils/teamColors.ts`, Team presentation maintainers | Team identity colors and contrast derivation are not BEGA brand tokens. |
| `Retro*`, ranking retro components, Ranking maintainers | Pixel typography, neon decoration and retro radius are intentional. |
| `stadiumSeatMap/`, stadium geometry/data modules, Stadium maintainers | Precision coordinates, SVG viewboxes, seat category colors and overlays are out of presentation-token cleanup scope. |
| `ui/plain-button.tsx`, UI maintainers | Lightweight class joining and renderer remain separate; share style definitions, not renderer dependencies. |
| `ui/status-badge.tsx`, UI maintainers | Compact noninteractive badges use named size maps, single-line ellipsis and title; not button touch targets. |

## Existing layout conventions retained

- Shared `Card` already owns mobile `px-4` / desktop `px-6`, radius, contained text and wrapping footer.
- `.bf` already owns wrapping, bounded labels, disabled opacity and unsized SVG constraints. The existing 44px mobile and 32/36/40px desktop densities remain.
- `PlainDialog` already owns focus trapping, Escape/backdrop close, scroll locking, responsive placement and safe area handling. Its interaction implementation is not to be rewritten.
- Long text, loading skeleton layouts, page-specific container widths and feed borders require route evidence before being treated as defects.

## Verification record

Initial logs and screenshots: `artifacts/design-consistency-20261013/before/`. Final evidence: `artifacts/design-consistency-20261013/after/`. Screenshot changes are attributable to the finding IDs above; existing image baselines are not overwritten.

The final command outcomes, expanded reviewed-file inventory, unresolved items and evidence paths will be appended after implementation and verification.

## Deferred evidence-backed state difference

`mypage/MyPageProfileCardRuntime.tsx:74,84,96` uses `lg` two-column loading layout while resolved content at `:211,279` uses `2xl`. This source discrepancy is recorded, but changing the breakpoint would violate the requested preservation of responsive behavior. Capture loading/resolved at 1024 and 1440 before a separately authorized layout change. A CTA with no visible hover color change remains a candidate because its intended interaction was not established.

## Actual source inspection inventory

The audit covered the requested entry files and followed the actual `AppRoutes` public/query/authenticated shells. This is a source review of every route family with representative leaf components, not a claim that every state of every component was visually executed.

- Foundation: `src/index.css`, `tailwind.config.js`, `docs/design-tokens.md`, `ui/{button,plain-button,input,textarea,card,status-badge,plain-dialog,skeleton,UIKitPreview}.tsx`, shared EmptyState and ErrorFeedbackPanel.
- Shells: `Layout.tsx`, `Navbar.tsx`, `PublicNavbar.tsx`, `AppRoutes.tsx`; public Home/Prediction/Mate shells, public query Cheer/Stadium, authenticated Mate flows/MyPage/Admin.
- Home: `HomeRuntime.tsx`, HomeGameCard (partial), HomeMatchPanel styles and `home/HomeSecondaryPanels.tsx`.
- Prediction: `PredictionRuntime.tsx`, `prediction/{predictionUiTokens,coachStyleTokens,PredictionStatsPanel,PredictionLoadingView,PredictionMatchTab,PredictionMatchDetailPanel,PredictionVotePanel,AdvancedMatchCardContentRuntime}` (some leaf style portions).
- Mate: `MatePage.tsx`, Mate styles/CSS, `MatePartyCard.tsx`, `MateCreatePrimitives.tsx`, `MateApply.tsx`, MateDetailContentRuntime (partial), `MateListControlsRuntime.tsx`, `MateStatusTabs.tsx`, `MateTeamFilterButton.tsx`, `MateViewToggle.tsx`, `ReviewDialog.tsx`.
- Cheer: actual `CheerRuntime.tsx` tabs, search, sidebar, lazy loading/fallback, team accent derivation and composer/feed delegation.
- Stadium: `StadiumGuideRuntime.tsx`, `StadiumGuide.css`, precision seat-map boundaries (coordinates not changed).
- Auth/MyPage/Admin: `auth/AuthLayout.tsx`, Login, SignUp, MyPageRuntime styles, MyPageViewRuntime, MyPageProfileCardRuntime; AdminPage/CSS, AdminPageRuntimeContent, AdminPanelPrimitives, UsersAdminPanel (partial), AdminRoleChangeDialogContent and AdminPlaceDialogContent (partial).

Admin slate/amber console, OAuth provider logos, compact 10.5px navigation labels and stadium palette remain intentional. The old design-token claim of zero arbitrary typography/radius values was corrected; remaining counted legacy styles are not newly proven visual defects.

## QA limits and reproducibility

- Required runtime: Node 22 (`package.json` engines). Node 26 and sandbox-denied local port attempts are retained as infrastructure evidence and are not passing product verification.
- Original source screenshots use the exact starting HEAD extracted under `/private/tmp/bega-design-before-20261013`. The only snapshot configuration adjustment is an isolated QA cache directory; runtime source and values remain original.
- Current/original QA servers use separate `.visual-qa-cache` paths. This avoids the snapshot's shared `node_modules` cache conflicting with current QA and local unit-test Vite instances.
- The environment companion reuses registered catalog scenarios, existing readiness/interaction/offline-route/screenshot helpers and detector infrastructure. It records a bounded representative slice; full Visual QA coverage remains unchanged.
- The source style guard is conservative: global CSS token declaration existence is checked, not scoped cascade validity. Dynamic expressions and intentional geometry require actual screen evidence.


## Final changes and disposition

Confirmed DS-001–DS-010 findings were addressed: supported field surfaces; shared Button/PlainButton styles with lightweight rendering retained; exact-value badge/Home/Cheer/Mate tokens; visible default dark Skeleton; UI Kit specimens; and source drift prevention. The MyPage breakpoint discrepancy remains explicitly deferred because responsive behavior changes were prohibited.

The drift baseline records **2,577 original occurrences / 2,533 remaining occurrences** across 1,263 exact file/rule/value budgets, with 36 fully resolved budget entries (29 of them because the unmounted legacy landing components and their CSS were deleted). Legacy findings are an inventory, not 2,533 visually proven defects. Removals cannot be reintroduced under their original allowance. Both detected undefined legacy variables are resolved (`--spacing` in `Alert`, `--surface-shadow-soft` in the unmounted `LandingCapabilityShowcase`) and now fail the check if reintroduced.

## Commands and results

All final JavaScript checks used Node 22.23.3. Raw logs remain under `artifacts/design-consistency-20261013/`.

| Command / evidence | Result | Interpretation |
| --- | --- | --- |
| `npm run test:unit` | Initial runs stalled; completed run with `--test-force-exit --test-concurrency=2 --test-timeout=120000`: 2,418 pass / 5 fail / 11 cancelled of 2,434 | One new QA scenario-count assertion was corrected after adding 38 UI Kit scenarios; subsequent harness catalog 116/116 and registry checks 3/3 pass. Two transient auth/DOM failures pass in a focused 26/26 recheck. Original HEAD reproduces pending API cancellations and two failing test-file exits. Latest broad rerun stalled at test 611 and was stopped; full unit pass is **not claimed**. |
| `npm run visual-qa:contract:check` | Pass: 2 browsers / 18 viewports / 4 axes | Contract unchanged; full guarantee remains inactive. |
| `npm run visual-qa:inventory:reviewed-check` | Fail: 3 unclassified / 0 stale / 0 provisional | Same 3 starting-HEAD unclassified symbols; only the 3 removed nonvisual Button constants were removed from classification. |
| `npm run visual-qa:states:check` | Fail: 1,014/1,016 registered; 0 pending; 96,711 valid combinations | Same 2 missing Prediction entries as before; UI Kit adds 38 executable combinations. No unrelated coverage marked complete. |
| `REFLOW_BASE_URL=http://127.0.0.1:5184 npm run qa:reflow:320` | 27 pass / 0 fail / 13 untrusted; `ok:false` | Dedicated final-source static preview avoids shared-port/config conflicts. Auth spinner, redirect or incomplete data prevented 13 requested screens from being trusted. These are **not passes**. |
| `npm run build` | Vite worker/client compile completed; bundle gate failed on `/cheer`, preventing subsequent SEO stages | Final ordinary log has `/cheer` 121,794B > 121,600B. Isolated exact-env comparison: original 121,791B → final 121,780B, so the pre-existing gate remains. Password reset final 82,966B < 83,000B after removing per-render style manipulation. CSS remains within existing budget. |
| `npm run uiux:policy:test` / `npm run uiux:policy:check` | 24/24 mutation/policy tests; policy pass | New source guard is integrated into the existing command, not a second QA system. |
| `node --import tsx --test ...button... ...plain-button... ...design-tokens...` | 14/14 pass | All 30 shared variant/size contracts, exact color tokens and dark Skeleton surface. |
| UI Kit source regression + token tests | 6/6 pass | Specimens, accessible labels, shared forms and visible loading surface. |
| Existing UI Kit state harness | 48/48 pass; 0 recovered | Real hover, keyboard focus, press, theme switch, form fill, dialog open/confirm/Escape. |
| Existing Input/Textarea state harness | 158/158 pass; 0 recovered | Final stable run supersedes earlier infrastructure timeouts/module reload errors; earlier reports retained. |
| Existing harness helpers + matrix selector tests | 39/39 pass | Width parsing, interaction/readiness/capture helpers and bounded scenario selection. |
| `node --import tsx scripts/visual-qa-design-consistency.ts` | Final after 120/120; original before 16/16 | 320/390/768/1024/1440 widths, light/dark, 16/32px root text scale, requested reduced-motion, simulated 32px bottom inset and registered representative states. |
| `npx cypress run --spec cypress/e2e/mate-list-url-state.cy.ts --config baseUrl=http://127.0.0.1:5184 --browser electron` | 9/9 pass | Existing internal-fixture Mate list/filter/search/URL E2E preserved. |
| `python3 scripts/validate_baseball_data_policy.py` (parent repo) | Pass | No external baseball collection or automatic repair added. |
| `graphify update .` (parent repo) | AST graph update completed | Parser warned about 9 pre-existing/partially extracted files; no semantic external API used. |
| `git diff --check` | Pass | Scoped formatting check. |

### Existing strict-gate identifiers

- Unclassified: `admin/AdminSeatViewsPanel.tsx#AdminSeatViewPhoto`, `AppShellRuntime.tsx#AuthSessionSync`, `AuthSessionSync.tsx#AuthSessionSync`.
- Missing state entries: `prediction/PredictionGamePowerupInventory.tsx#PredictionGamePowerupInventory`, `prediction/PredictionMatchTabDetailSection.tsx#PredictionGamePowerupInventory`.

## Screenshot evidence and baseline rationale

Ten curated Before/After PNGs and a coverage summary are committed in `docs/design-consistency-evidence/20261013/`. `report.json` identifies their exact scenarios. Home/Cheer/Mate use matched original and final 1440px dark states; UI Kit compares both themes at 320px. UI Kit becomes taller because requested specimens were added, not because product routes were redesigned. Exact-value token substitutions should retain pixels; field surfaces, shared PlainButton contract and dark Skeleton intentionally change where documented.

Raw evidence includes `before/environment-matrix/report.json` (16/16), `after/environment-matrix-r2/report.json` (120/120), `after/ui-kit-final.json` (48/48) and `after/form-controls-final.json` (158/158). Earlier failed/time-out runs are retained rather than overwritten. Existing repository image baselines were not replaced.

## Remaining work and limits

- Strict inventory/state gates and `/cheer` bundle budget remain pre-existing unresolved gates. Whole-service release readiness and complete Visual QA are not asserted.
- Full unit runner has existing pending-promise/open-handle failures; targeted new checks and affected UI/E2E pass. Fixing auth/API behavior is outside this presentation-only task.
- Repair the internal auth fixture/route evidence for the 13 untrusted reflow measurements before calling the route sweep complete.
- Matrix 200% is **root text scaling**, not native browser zoom; pixel font tokens do not automatically scale. Matrix height is 900px; canonical 320×844 control/state checks also ran. Native browser zoom, soft keyboard, WebKit and the full contract Cartesian product remain outside this representative slice.
- Motion preference is verified. Screenshot helper freezes animations, so postcapture duration readings are not an independent reduced-motion behavior proof. Safe-area inset is simulated through the existing variable, not device `env()`.
- MyPage loading/resolved breakpoint alignment needs a separately authorized responsive change; team colors, AI Coach palette, Prediction header, retro styling, Admin console and precise seat maps stay preserved.
- Unrelated `scripts/postdeploy-workflow-security.test.ts` edits and shared generated reports were excluded from design commits and left intact.
