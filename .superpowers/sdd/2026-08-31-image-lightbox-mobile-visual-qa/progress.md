# Progress

## Fixed scope

- Design SHA-256: `4147d952ce2e3ca9f7aa25ab7c9c916c69e325700e99f2a454414f38f4712fe3`
- Plan SHA-256: `9d392cc5e44c60038c91952e813501d2b94adafeb561b858c3d916b312e5d52e`
- Constraints SHA-256: `cdde8da76b29a57b7cfc4c4e5f5310ae150a552d9ff27cf7e6f2deb45321182c`
- Only `src/components/ImageLightbox.tsx#ImageLightbox` moved from pending to registered. It has no hosted or root entry, so no parent/root evidence changed.
- The global data vocabulary stayed unchanged. Its existing serialized `data=populated` value maps only in this fail-closed adapter to the semantic `multiple-three` fixture, which contains exactly three images. `maximum-supported` is exactly ten and `broken-image` is the data-URI failure fixture.
- ImageGrid, Cheer parents, icons, `useFocusTrap`, shared UI, `lib/utils`, global CSS, Mate, prediction, Landing, package-lock, prior reports/PNGs, API/data paths, and baseball-data behavior were not edited by this slice.

## TDD and duplicate-call evidence

1. The real product RED was `0/1`: the production mount never exposed the required dialog target because the leaf had no dialog/test semantics. Product source was unchanged at that checkpoint.
2. The leaf-only GREEN adds Korean dialog/control semantics, initial focus and a focus loop/restore through the existing clean hook, separate keyboard and scroll effects, exact prior overflow restoration, 44px controls with 24px icons, focus/active/reduced-motion feedback, safe propagation, and a broken-image fallback that resets when source/index changes. Focused actual is `3/3` at 320x844 and 390x1000.
3. Callback ledgers are exact: close/backdrop/Escape/close Enter-Space dispatch close `1` only and hide the overlay; previous/next dispatch only their matching callback `1` and wrap to the exact index. Internal click, hover, focus, pressed, Tab/Shift-Tab, theme, viewport, StrictMode mount, and keyed remount are all `0` before reset. Fast close remains `1`; two deliberate previous actions remain legal `2`; post-unmount keys remain `0`.
4. Fourteen mutations are meaningful RED: callback swap, duplicate dispatch, wrap off-by-one, propagation, key cleanup, hardcoded overflow, focus-trap removal, initial-focus removal, fallback removal, error-reset removal, 44px removal, presentation removal, and package omission/duplication. Failures included the wrong callback, close `2`, stale/non-wrapped counters, internal click close `1`, leaked key callbacks, `auto` instead of `clip`, lost initial/wrapped focus, missing/stale fallback, a `40x40` target, missing reduced-motion/focus/pressed feedback, and package counts `0`/`2` instead of `1`. Replacement targets were asserted and no mutation relied on compilation failure.
5. Adapter/catalog began RED `0/2` because the entry was pending and `image.lightbox` was absent. The lower-camel QA-only companion and exact/fail-closed mapping now pass in the full adapter/catalog `275/275` suite.
6. The focused actual test occurs exactly once in pre-harness and remains covered by both `test:unit` globs. Incoming pre/full counts `167/167` and `410/410` are now `170/170` and `412/412`. A shared Vite optimize-cache 504 exposed by the first combined run was removed by giving this actual test an isolated temporary cache with `finally` cleanup; the repeated full gate is `412/412`.

## Matrix and evidence

- Exact matrix: `42 = 12 canonical + 30 interactions` (`hover 3`, `focus-visible 3`, `pressed 3`, `click 6`, `keyboard 15`).
- Totals: registered `452/1,010`, pending `558`, direct `70,947`, valid `71,950`; ImageLightbox contributes exactly `42` direct states. Host/root totals are unchanged.
- Warm-up outside final paths and the final capture both passed `42/42`, failed `0`, recovered `0`, every attempt `1`, at `320x844`, `fresh`, `expand-tall-flow`.
- The final report has `42` unique scenario IDs, `42` unique/nonzero/hash-complete PNG paths, and `30/30` interaction rows with `verified`, `captureVerified`, `viewportExpanded`, and `revalidatedAfterViewportExpansion` true.
- Report SHA-256: `c7b99a17320fa6e6feb06f7299b1786af3c0bb8e8f48b93168e6fb3b6b8a3cce`.
- Repo-standard sorted path+content PNG aggregate: `b54f8ba1fca80adeffc48412460c461a35f1cfafdd7db35c46bf4571c4776b96`.
- All fixtures are data URIs. The actual browser request ledger observed external image requests `0`; the leaf/companion contains no fetch, Axios, query, API, crawl, scrape, search, or repair path.
- Representative broken/light, maximum-ten/dark, middle/light, and pressed-next PNGs were inspected at original resolution. The viewport overlay, fallback, counters, control bounds, focus/pressed treatment, and reduced arrow obstruction are visible without clipping.

There are `25` distinct PNG hashes and these ten legal equal-image groups, each representing the same final UI despite a distinct executable ledger:

1. first default = ArrowRight last-to-first = ArrowLeft middle-to-first;
2. last default = ArrowLeft first-to-last = ArrowRight middle-to-last;
3. middle default = focus close = Tab next-to-close;
4. focus next = Shift-Tab close-to-next = Tab prev-to-next;
5. focus prev = Tab close-to-prev;
6. closed = Enter close = Escape = Space close = backdrop click = close click;
7. Enter next = Space next;
8. Enter previous = Space previous;
9. previous first-to-last = next middle-to-last;
10. next last-to-first = previous middle-to-first.

## Verification and isolation

- State generator tests `19/19`; adapter/catalog `275/275`; production isolation/import/audit/reflow `46/46`; DOM probe; TypeScript; Priority 0 policy; focused and scoped diff checks pass.
- The normal state writer exits zero and records exact totals. `visual-qa:states:check` intentionally exits one because that command means `requireComplete` and the repository still has exactly `558` pending entries; its errors, duplicates, missing, and stale arrays are all empty. This is the expected global incompleteness, not a hidden slice failure.
- Final isolated merged-main build passes, all `153/153` budgets pass, and global CSS is unchanged at `255,429/255,500` bytes, SHA-256 `71e44503c3f32649fa8916361780e50a7a5e316ec4c6f886c93d85d7b4868ca7` (`+0`, 71 bytes headroom).
- Main generated bundle/dist/inventory report SHA values remain exactly `c990bef1...`, `9a7c431e...`, and `173b767a...`; no writer for those reports ran.
- A detached clean worktree at commit `13637d99` reproduced actual `3/3`, totals `452/1,010`, pending `558`, direct `70,947`, valid `71,950`, TypeScript, build, report/PNG hashes, production QA identifier count `0`, and all `153` budgets. Its clean-source CSS is `252,072/255,500`, SHA-256 `0be1ddeb6a9b116a9a43d0a7798a6a5bdb480b9fa3935a4e7933a34fd8bfa750`, proving no dependency on unrelated dirty-main changes.
- Main index was kept empty through temporary scoped indexes.

## Scoped history

- `0b9e61aa`: immutable approved design, plan, and constraints
- `56c2f3b2`: leaf product hardening, actual Chromium regression, duplicate-call mutations, and exact-once package wiring
- `466b9524`: QA-only companion, fail-closed adapter/catalog, manifest, and generated state arithmetic
- `13637d99`: authoritative 42-scenario browser evidence
