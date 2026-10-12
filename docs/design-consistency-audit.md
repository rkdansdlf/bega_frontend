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

- Shared `Card` already owns mobile `px-4` / desktop `px-6`, radius, contained text and wrapping footer. `page-primitives.tsx` already owns Container, Section, SectionHeader, Stack gaps and CTAGroup.
- `.bf` already owns wrapping, bounded labels, disabled opacity and unsized SVG constraints. The existing 44px mobile and 32/36/40px desktop densities remain.
- `PlainDialog` already owns focus trapping, Escape/backdrop close, scroll locking, responsive placement and safe area handling. Its interaction implementation is not to be rewritten.
- Long text, loading skeleton layouts, page-specific container widths and feed borders require route evidence before being treated as defects.

## Verification record

Initial logs and screenshots: `artifacts/design-consistency-20261013/before/`. Final evidence: `artifacts/design-consistency-20261013/after/`. Screenshot changes are attributable to the finding IDs above; existing image baselines are not overwritten.

The final command outcomes, expanded reviewed-file inventory, unresolved items and evidence paths will be appended after implementation and verification.
