# BEGA release verification — 2026-10-14

Status: **READY — all required local gates passed for the verified task commit**.
This is a local release-candidate judgment, not a deployment confirmation or a
verification of concurrent uncommitted changes.

Release work started at `c698fd7e77b0c2638c1bf8659003a184d961d5b6`.
This continuation started at `9f68b650f4cccf5bb154567d0e0e9fad537af4b0`.
Final implementation HEAD: `eaab41ee0cd86633d3b633a97a44944022137b32`.
Unit/build source HEAD: `64435fd4fc4fdbb2974776ce69195a52f534009c`; all 1,381 tracked src files
match the final implementation HEAD by SHA-256. The later commit only changes
the keyboard QA script; both final engine checks use that script.
The final verification source is frozen in
`/private/tmp/bega-release-final-20261014`. Concurrent Cheer/utils/Mate/adapters,
reflow HTTP-guard and security-test edits are preserved, excluded from task
commits and from this final immutable run. Earlier current-worktree verification
included some of those changes; its results remain separately recorded.

## Problems and changes

- DM keyboard focus: at320/390px light/dark the composer was partially behind
  fixed navigation although native Tab reached it. `66b7765c` adds conditional
  instant scrolling only when the focused textarea intersects a visible tab bar.
  Source: `src/components/dm/DirectMessageRuntime.tsx`. No API/send/delete/URL,
  breakpoint, team colors or specialized palettes changed.
- DM retry QA fixture: two initial bootstrap calls consumed a one-attempt error
  before user retry. `338f21e2` holds failure until the retry action, asserts a
  new POST response after clicking (200 normal,503 mutation), and rejects generic
  timeouts as mutation RED. Only `scripts/visual-qa-dm.integration.mjs` changed.
- Cypress clearance test originally measured an unfocused, disabled send button
  below the viewport. `fc0548d6`/`5ca54794` focus the composer before measuring;
  no spacing threshold removed (8px minimum retained). Native `.focus()` replaces
  click so Cypress auto-scroll cannot mask the defect. Existing six DM cases and
  three responsive acceptance cases remain enabled.

## Verified DM evidence

| Check | Before | After |
| --- | --- | --- |
| Production Chromium real Tab + 5 interior hit points | 4 pass/4 fail,exit1 on9f68b650 | 8/8 pass,exit0,prototype=false |
| Visible composer / hidden desktop bar no-scroll | 8/8 | 8/8 |
| Native-focus Cypress DM | 5 pass/1 fail on9f68b650 | 6/6 pass |
| DM responsive acceptance | Historical evidence retained | 3/3 pass |
| Existing Chromium/WebKit DM harness | Initial retry fixture failure retained | 8/8 flows,4/4 mutation RED,4/4 restored GREEN |

Curated reports and320-light/390-dark Before/After screenshots:
`docs/release-readiness-evidence/20261014/`.
Raw replay scripts, all logs and screenshots:
`artifacts/release-readiness-20261014/`.
The initial isolated build failed because required public URL environment values
were absent; its log remains preserved. No live env files were copied. Recheck
used documented public site/API URLs; no external requests were made.

## Final gates

The immutable full-unit rerun is **2514/2514 PASS**, fail/cancel/skip0, normal
exit0,723.7s. This is the clean task-branch source; the earlier2515-test run
included one concurrent Mate test. No test was removed to reduce this count.
Complete build (worker/client,bundle,SEO prerender,sitemap) also exits0; strict
inventory2133 symbols/523files has0 unclassified/stale/provisional/errors,
states1017/1017 has0 pending, contract and policy pass. Final production
reflow is 40/40 pass, 0 fail, 0 untrusted. Policy mutation checks pass 24/24.
The unchanged /cheer limit is 121,600B; final bundle is 119,784B.
Chromium native Tab and WebKit native Alt+Tab each pass 8/8 controls and
8/8 no-scroll checks. WebKit default Tab could not reach delete and its incomplete
run is preserved and excluded from passes. No unresolved required local gate
blocks this verified candidate; concurrent changes need their own verification.

## Remaining limits

MyPage loading/resolved lg/2xl layout shift remains the separately recorded
responsive issue, as instructed. Simulated safe-area, root font200% and desktop
WebKit do not establish native device zoom or virtual keyboard behavior. Existing
Visual QA registration completion does not imply exhaustive browser execution
of every registered combination. No baseline images or failed logs were deleted.

The authorized DM fix is applied; no further approval for that patch is pending.
Production deployment and live backend connectivity are outside this local QA
verification. Priority0 baseball-data collection prohibition remains preserved.

## Cold fixture failure and recovery

An initial immutable full run failed SeatMapLegend page.goto networkidle while
Vite scanned unrelated whole-application/Visual QA HTML imports. That already
failed run was explicitly stopped and recorded as FAILED, never as a pass.
The first isolated configuration attempt inherited strictPort and hit occupied
5173 (21/24 pass,3port failures). All failure logs remain preserved.

`64435fd4` reuses existing `vite.visual-qa.config.ts` for five stadium browser
fixtures, keeps per-test caches, overrides strictPort=false and disables watchers.
States, assertions and timeouts are unchanged. Cold verification28/28 passed,
normal exit0; then the full suite above passed. No production stadium component,
coordinate or overlay was modified.

Raw failure/recovery: `unit-final-head.log`, `unit-final-head-failed-run.json`,
`stadium-cold-fixtures-green.log`, `stadium-cold-fixtures-r2.log`,
`unit-final-head-r2.log`. Code graph AST update completed; SQL parser absence and
partial-extraction warnings are recorded tool limitations, not frontend failures.

## Reproduction and evidence index

Use Node 22 and the frozen source, not the concurrent working tree. Build uses
`VITE_SITE_URL=https://www.begabaseball.xyz` and
`VITE_API_BASE_URL=https://api.begabaseball.xyz/api` (public URL contracts).

| Command | Final result |
| --- | --- |
| `npm run test:unit` | 2,514 passed; failed/cancelled/skipped 0; normal exit 0 |
| `npm run build` | All required stages passed |
| `npm run visual-qa:contract:check` | PASS |
| `npm run visual-qa:inventory:reviewed-check` | Unclassified/stale/provisional 0 |
| `npm run visual-qa:states:check` | Registered 1,017; pending 0 |
| `npm run qa:reflow:320` | 40 passed; failed/untrusted 0 |
| `npm run uiux:policy:check` | PASS |
| `npm run uiux:policy:test` | 24/24 PASS |
| `node scripts/visual-qa-dm.integration.mjs` | 8 flows; 4 mutation RED; 4 restored GREEN |
| Cypress `dm.cy.ts`, `dm-conversation-visual-acceptance.cy.ts` | 9/9 PASS |
| `node scripts/visual-qa-dm-keyboard.integration.mjs` | Tab Chromium: 8+8 PASS; Alt+Tab WebKit: 8+8 PASS |

Keyboard replay uses `DM_KEYBOARD_BASE_URL=http://127.0.0.1:5188`; WebKit additionally
uses `DM_KEYBOARD_BROWSER=webkit DM_KEYBOARD_KEY=Alt+Tab`. Set
`DM_KEYBOARD_OUTPUT` to preserve each run separately. Prototype mode was false.
The immutable-source manifest and raw logs are in the raw evidence directory;
[verified-gates.json](release-readiness-evidence/20261014/verified-gates.json)
records source equivalence, log paths and SHA-256 hashes.

Before screenshots are the actual pre-fix production build:
[320 light](release-readiness-evidence/20261014/before-320-light.png),
[390 dark](release-readiness-evidence/20261014/before-390-dark.png).
Final immutable production screenshots:
[320 light](release-readiness-evidence/20261014/final-after-320-light.png),
[390 dark](release-readiness-evidence/20261014/final-after-390-dark.png).
Earlier after captures remain historical; final captures have distinct names.

The P0/P1 fixes, representative Home/Prediction/Cheer/Mate/MyPage/Auth flows,
5-width light/dark matrix, loading/error/empty states and MyPage breakpoint
evidence are indexed in [the prior report](release-readiness-20261013.md).
Those results are retained, not represented as a new exhaustive browser run.
Source review and regression checks preserved team colors, Prediction/AI Coach/
Retro/Admin styling, shared component contracts and stadium coordinates.
Next work: separately verify concurrent edits, track MyPage layout shift, and
perform real-device keyboard/zoom plus deployment health checks before a live launch.
