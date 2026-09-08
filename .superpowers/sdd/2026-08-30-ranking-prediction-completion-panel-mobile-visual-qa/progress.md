# RankingPredictionCompletionPanel mobile Visual QA progress

## Immutable inputs

- Design SHA-256: `35a54471027934cd7ad67ac36e6433e999d9ae9e46cc56603589858ce8af49dd`
- Plan SHA-256: `ebf1ff036c29d250d38bf6d771e193bfb8ee496e87d093f6a06b0f6bae1e4fd1`
- Constraints SHA-256: `e8df8ac8dffe048c75d1505afc70e55ad7641d5645fb9307726e341d6da926e8`
- Baseline HEAD: `1527b2bb081fdcedf296e580731994354622c609`

## TDD and implementation

- Actual product RED: the Chromium test could not find the required stable root selector. After the first leaf fix it exposed a real fast-double-complete defect: the second native click landed on the newly rendered save action (`complete=1`, `save=1`).
- Detached clean-HEAD reproduction exposed a second real RED hidden by the dirty main tree: the forbidden shared Button change supplied 44px only in main, while the committed dependency rendered 36px. Adding the already-emitted `min-h-11` class to the leaf action branches made the clean dependency pass without editing the shared primitive.
- Leaf GREEN: the component is contained at 320x844 and 390x1000, has full-width 44px actions, useful local trophy alternative text, focus treatment, dark-theme coverage, and reduced-motion suppression. The complete transition now ignores only the duplicate native click that crosses into the ready phase; independent repeated save/share activation remains unchanged.
- Callback ledger GREEN: pointer, Enter, and Space each invoke only their matching callback exactly once. Resize, theme change, hover, focus, pressed hold, Tab, Shift+Tab, StrictMode mount, and keyed remount invoke no callback. Assertions occur before every reset or remount.
- Product mutation proof: callback swap, callback duplicate, transition removal, phase mapping, saved precedence, selector removal, overflow removal, reduced-motion removal, and non-action ledger mutation each produced a behavior-level RED (`9/9`). Package omission and duplicate each produced RED (`2/2`).
- The serialized schema key `data=single` is the approved representation of the conceptual `known-static` fixture. It maps exactly to the internal static literal `HH` in the QA-only companion. No global taxonomy value was added.

## Registration and arithmetic

- Direct component: pending to registered; hosted caller remains pending; parent/root recapture remains zero.
- Canonical: `4 data x 3 legal phases x 2 themes = 24`.
- Interactions: hover 3, focus-visible 3, pressed 3, click 3, keyboard Enter/Space 6, Tab/Shift+Tab 2; total 20.
- Exact component total: 44.
- Final totals: registered `451/1010`, pending `559`, direct scenarios `70905`, valid combinations `71908`, validation errors `0`.
- Post-package counts: ranking `25`, pre-harness `167`, full harness `410`. The focused actual test is present exactly once in ranking and pre-harness and absent from the main harness command.

## Evidence and production isolation

- Final report: `reports/visual-qa-ranking-prediction-completion-panel-mobile.json`
- Report SHA-256: `2ccbae97635c44d3d26caf686e9b68fcd1896074b6d41f7d1f2c782ce41fcd16`
- PNG count: 44 non-empty files; scenario IDs and screenshot paths are unique; every row is attempt 1.
- Repo-standard PNG aggregate command `(find reports/visual-qa-ranking-prediction-completion-panel-mobile-screenshots -type f -print0 | sort -z | xargs -0 shasum -a 256) | shasum -a 256` produces SHA-256 `36c9664f8d61584d2b5aefc92ff0a70d816f2e15c474f774ca81bac061e6242f`.
- Capture: 320x844, fresh page mode, expand-tall-flow, group size 44, passed 44, failed 0, recovered 0, interaction rows 20 and all verified/capture-verified/expanded/revalidated.
- Six duplicate-image groups were reproduced from the committed PNG bytes: `f93cb62ebd22ede7ba82ae7fcbe4034a0bd91bbcd3ebc7fe5fde272df03cb2c3` is ready-default equals complete-click; `9d9ec734f0f3df90ae8e020c5a3a1a154b56b17d09a3dac495713452d018cc2d` is saved-default equals share-click; `040610fb1ab174311050c21b30a835cb9a7715786c089f4475775a15efa0de6c` is save-focus equals save-space equals shift-tab-share-save; `d3ae8efaa28a8ea68dba1baf840a34aa903401398db299b45a4036f8a65d7a25` is save-hover equals save-pressed; `38d1864f8eb076ac07df5d300d230a87615ce0b647afe82ef635abe05bdd50b1` is share-hover equals share-pressed; `81a04e9ad204b4fa3cef931c83b92c255863ab557ae90dc6704f12ae27378160` is complete-enter equals complete-space.
- Representative light/dark, optional/static/Korean/unbroken, complete/ready/saved, and focus screenshots were inspected at original resolution.
- Isolated dirty-main production compile: 5737 client modules, CSS `255429` bytes (`+0`, below `255500`), all 153 bundle budgets pass. Clean detached committed-dependency reproduction also passed all 153 budgets with CSS `252072` bytes and QA-only companion module/export/adapter production-dist hits `0`.
- Main forbidden reports stayed byte-identical: bundle SHA-256 `c990bef1b30801b3783c314805339bff44cac5ab79ba4b69ec4a94c9c884dc36`; dist SHA-256 `9a7c431e8eca1ce536c9f953f921f26e673628f52b54c36fbfdbed9de625a556`.

## Verification

- Focused actual Chromium: `2/2`.
- Ranking regression: `25/25`.
- Adapter and catalog: `273/273`.
- Shared TeamLogo/Button: `5/5`.
- Contract/state/inventory/skeleton and production isolation/import/audit/reflow unit group: `99/99`.
- Pre-harness: `167/167`; full harness without lifecycle duplication: `410/410`.
- TypeScript: `npx tsc --noEmit` exit 0.
- Priority 0 policy: `python3 scripts/validate_baseball_data_policy.py` exit 0.
- Detached committed-dependency reproduction: actual Chromium `2/2`, adapter/catalog `273/273`, totals `451/1010` and `71908`, TypeScript exit 0, production build exit 0, bundle budgets `153/153`, report/PNG hashes exact, and QA-only production hits 0.

## Preserved global residual

- `reports/visual-qa-component-inventory.json` is an ignored artifact: it is untracked at both baseline and HEAD and is ignored by `.gitignore:36` (`/reports`). During a global residual check, `npm run visual-qa:inventory:check` rewrote this path before returning `20 unclassified / 3 stale / 0 parse errors` and exit 1. Its pre-slice byte provenance cannot be attested; its current SHA-256 is `173b767af499eb6a3ff33ce78e1675b7bd4d0a9fedd9c0a5ebf2de99efdf3665`. It was never staged, restored, or included, and source code, product behavior, baseball facts, and user semantic data were not changed by the incident.
- The slice commit set contains zero inventory-report files and zero external baseball data/API/crawl/scrape/search behavior.
