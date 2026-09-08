# Image Lightbox Mobile Visual QA Design

Date: 2026-08-31
Status: approved as the next bounded slice of the repository-wide mobile Visual QA and duplicate-call plan

## Scope

Register and prove one clean direct leaf:

- `src/components/ImageLightbox.tsx#ImageLightbox`

There is no hosted inventory entry. `ImageGrid.tsx` and dirty Cheer parents remain untouched and no host or root is recaptured. The leaf has no API, auth, store, query, permission, or baseball-data dependency. Fixtures use data URIs or checked-in local assets only; external image URLs are forbidden.

## Legal data and exact matrix: 42

Mounted `ImageLightbox` is the open lifecycle. Legal arrays contain 1 through the internal upload limit of 10 images, and `currentIndex` is always in bounds.

Canonical states are exactly twelve:

- `single/only × light,dark = 2`
- `multiple-three/first,middle,last × light,dark = 6`
- `maximum-supported/last × light,dark = 2`
- `broken-image/only × light,dark = 2`

Broken asset behavior belongs to the data fixture rather than a transport-system axis. Permission and transport axes are N/A.

Thirty interactions use `multiple-three/middle/light` unless the wrap result requires first or last:

- hover `3`: close, previous, next
- focus-visible `3`: close, previous, next
- pressed `3`: close, previous, next
- click `6`: close, backdrop, previous first-to-last, previous middle-to-first, next middle-to-last, next last-to-first
- keyboard `15`: Escape; ArrowLeft first-to-last and middle-to-first; ArrowRight middle-to-last and last-to-first; Tab close-to-prev, prev-to-next, next-to-close; Shift+Tab close-to-next; Enter close/prev/next; Space close/prev/next

Total: `12 + 30 = 42`.

Stable selectors:

- `[data-testid="image-lightbox"]`
- `[data-testid="image-lightbox-close"]`
- `[data-testid="image-lightbox-prev"]`
- `[data-testid="image-lightbox-next"]`
- `[data-testid="image-lightbox-error"]`
- `[data-testid="image-lightbox-stateful-host"]`

The adapter and catalog must fail closed for unknown or mismatched component, file, export, data, index, theme, interaction, target, action, permission, or system values.

## Callback and duplicate-call contract

- close button, backdrop, Escape, close Enter/Space: close `1`, previous/next `0`, overlay hidden
- previous activation: previous `1`, close/next `0`, stateful index moves middle-to-first or first-to-last
- next activation: next `1`, close/previous `0`, stateful index moves middle-to-last or last-to-first
- image/content internal click: all callbacks `0`
- hover/focus/pressed/Tab/ShiftTab/theme/viewport/StrictMode mount/keyed remount: all callbacks `0`

Close unmounts after the first request, so a fast follow-up close remains one. Two deliberate previous or next actions remain two legal moves; the regression contract only forbids one DOM event from dispatching its callback twice. All non-action and lifecycle ledgers are asserted before reset or remount.

## Product behavior

The current leaf lacks dialog semantics, accessible Korean labels, focus containment, exact body-overflow restoration, and broken-image fallback. Its 64px arrow controls also obscure too much content on a 320px viewport.

Bounded leaf-only corrections:

- dialog `ref`, `role="dialog"`, `aria-modal`, Korean accessible title, and focusable container;
- clean `useFocusTrap` integration with initial close focus, forward/reverse wrap, and focus restoration;
- separate scroll-lock and key-listener effects, preserving the exact prior body overflow value;
- Korean close/previous/next labels and `이미지 n` alt text;
- 44px close/previous/next targets with smaller 24px icons;
- visible focus, active, and reduced-motion behavior using only already emitted classes;
- error state reset on image/index change and a visible `이미지를 불러올 수 없습니다` fallback;
- internal click/pointer isolation and pointer-safe backdrop behavior.

Key cleanup must make Escape/Arrow input after unmount call nothing. Scroll-lock restoration must preserve values such as `clip`, not hardcode `auto`.

## Mobile actual behavior

Production-CSS browser checks run at 320x844 and 390x1000 and require:

- overlay rect equal to the visual viewport and document x-overflow zero;
- content/image within 90vw/90vh bounds;
- close, previous, and next targets at least 44x44 and inside the viewport;
- reduced arrow obstruction compared with the current 64px controls;
- no previous/next controls for one image;
- correct counters for 3 and 10 images and exact first/last wrapping;
- broken fallback visible without covering remaining controls;
- backdrop close separated from image/content internal click;
- body overflow hidden while open and exact prior value restored on close/unmount;
- initial close focus, forward/reverse focus wrap, and external-focus restoration;
- light/dark and reduced-motion states;
- resize/theme/non-action callback ledgers zero before reset;
- listener cleanup verified after unmount.

Product edits require actual RED and are limited to `ImageLightbox.tsx`. Do not edit ImageGrid, Cheer parents, shared icons, focus hook, shared UI, or global CSS. Reuse only already emitted utilities; compiled CSS must not grow.

## Mutation resistance

Behavior-level mutations must cover callback swap and duplicate dispatch, previous/next wrap off-by-one, backdrop/internal propagation, keydown cleanup, hardcoded overflow restoration, focus trap and initial-focus removal, broken fallback and error-reset removal, 44px touch removal, focus/pressed/reduced-motion removal, and focused-test package omission/duplication. Each mutation must prove its replacement applied and must fail a meaningful assertion, not merely fail to compile or find a token.

## QA companion and package integration

Use a lower-camel QA-only companion module/export mapped exactly to the original component. It owns controlled open/index state and callback ledgers without reproducing product rendering. QA paths and identifiers must be absent from production chunks.

The focused actual test is discovered by `test:unit` and is added exactly once to `previsual-qa:harness:test`. Do not create a new Cheer package script and do not duplicate it in the main harness body. Incoming dirty-main baselines are pre `167/167` and full `410/410`; record exact post counts. Do not repair global clean-package residuals.

## Evidence and arithmetic

Produce one fresh 320x844, `fresh`, `expand-tall-flow` report:

- `reports/visual-qa-image-lightbox-mobile.json`: `42/42`

All rows require failed/recovered zero, attempt one, unique scenario IDs and paths, nonzero/hash-complete PNGs, complete 30-row interaction verification, and no external image request. Record the report SHA, repo-standard sorted path+content 42-PNG aggregate, and the exact legal equal-image groups.

Starting from registered `451/1,010`, pending `559`, direct `70,905`, valid `71,908`:

- registered: `452/1,010`
- pending: `558`
- direct: `70,947`
- valid: `71,950`

One direct entry adds 42 states. Host and root counts remain unchanged.

## CSS, concurrency, and policy

Incoming main CSS is `255,429/255,500`, leaving 71 bytes. Use a direct/isolated compile and budget path that does not write main reports. Never run main report writers or stage/restore bundle, dist, inventory, or classification reports.

At selection time the source, icon dependency, and `useFocusTrap` are clean, while ImageGrid parents and shared UI dependencies are dirty. Preserve ImageGrid, Cheer parents, dirty `lib/utils`, Button/Card/TeamLogo, Mate, prediction, Landing, package-lock, prior reports/PNGs, and every unrelated path. Re-check scope before each commit.

No baseball data is used. No external image, API, crawling, scraping, web search, or repair path is allowed.

## Review

One implementer owns the slice. A separate read-only reviewer validates exact 42 states, callback ledgers and mutations, dialog/focus/scroll/error behavior, touch and obstruction, artifact integrity, package and production isolation, CSS, clean scope, concurrency preservation, and Priority 0 compliance. Critical or Important findings return to the original implementer.
