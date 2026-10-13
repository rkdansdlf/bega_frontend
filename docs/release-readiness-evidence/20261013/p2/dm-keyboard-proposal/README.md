# DM keyboard occlusion: reviewable proposal

The proposed product focus patch was applied on 2026-10-14 in `66b7765c`, after
the user instructed continuation immediately following the explicit confirmation
question. The patch file preserves the reviewed proposal; it now passes
`git apply --reverse --check`. Fresh product verification is recorded in
`docs/release-readiness-20261014.md`. Historical results below remain preserved.
It scrolls the composer only when its focused bounds intersect a visible bottom
tab bar. It uses instant scrolling; no breakpoints, send handlers or API calls change.

2026-10-14 reproduction: production **4/8 pass,4/8 fail,exit1**; all four composers
are partly covered by navigation despite being inside the viewport. The QA-only
prototype is **8/8 pass,exit0**. Both use real Tab input, actual viewport equality,
focus-visible and five interior hit points (center and four inset corners).
The protocol covers 320/390px, light/dark and delete/composer controls. It uses the
existing reflow offline fixtures and blocks external HTTP/WebSocket traffic.
This is desktop Chromium keyboard behavior, not native mobile soft-keyboard proof.

Replay from bega_frontend with Node22 and the current production build:

```sh
VITE_PROXY_TARGET= VITE_ENABLE_CLOUDFLARE_PLUGIN=false npx vite preview --host 127.0.0.1 --port 5186 --strictPort
DM_KEYBOARD_OUTPUT=/private/tmp/bega-dm-product node scripts/visual-qa-dm-keyboard.integration.mjs
DM_KEYBOARD_PROTOTYPE=1 DM_KEYBOARD_OUTPUT=/private/tmp/bega-dm-prototype node scripts/visual-qa-dm-keyboard.integration.mjs
```

The product command fails on the pre-fix HEAD and passes after the fix. The prototype flag injects a QA-only
focus listener and is clearly recorded in its report; it is never evidence that
the product is fixed. For current product verification, run without that flag,
then verify send/delete/retry interactions and the required release gates.

Raw logs and eight screenshots per mode:
`artifacts/release-readiness-20261014/dm-keyboard-{product,prototype}/` and their
adjacent `.log` files. Curated reports and 320-light/390-dark Before/Prototype-After
screenshots are in this directory. Prior evidence remains preserved.
