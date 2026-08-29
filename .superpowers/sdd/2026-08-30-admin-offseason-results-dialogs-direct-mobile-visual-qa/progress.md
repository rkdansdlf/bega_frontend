# Progress

- Verified the immutable design, plan, and constraints SHA-256 values before implementation.
- Preserved the pre-existing staged 110-path baseline and the concurrent out-of-scope Landing selector change.
- Initial adapter/catalog RED was 254 pass / 5 intended failures for the missing exact 25/41 direct registrations and adapter IDs; GREEN was 259/259.
- Meaningful-state RED added intended failures for an empty dialog fixture that matched populated and leaf actions without pressed feedback. GREEN separates the empty form and gives only the owned Results/Dialog controls a pressed state; shared primitives remain unchanged.
- Actual ReactDOM+Playwright tests mount both exports with production CSS. Every Results and Dialog action resets its page-side delta log before the click and asserts intended callback one, all unrelated callbacks zero; Results reference identity is checked inside the browser. Reciprocal Results edit/delete and Dialog cancel/submit mutations both RED, while restored code is 3/3 GREEN.
- The create dialog has an outside sentinel moved after its portal. Submit then Tab must focus the exact close button and remain inside the dialog; a test-only no-op focus trap mutation exits to the sentinel and RED. The full callback history remains unchanged after 320x844 to 390x1000 resize.
- Warm-up was excluded from evidence. A 41/41 Dialog run with three transient harness-timeout recoveries was discarded; only the later fresh run with recovered zero is final.
- Final Results evidence is 25/25 pass, failed/recovered 0, all attempt 1, 25 unique IDs/paths/nonzero PNG/actual SHA-256 values, and 9/9 interaction records with all four verification flags true.
- Final Dialogs evidence is 41/41 pass, failed/recovered 0, all attempt 1, 41 unique IDs/paths/nonzero PNG/actual SHA-256 values, and 28/28 interaction records with all four verification flags true.
- Final report/PNG aggregate SHA-256 values are Results `80ac66fa...` / `366a8d5f...` and Dialogs `42f97b40...` / `2d149561...`.
- Final state totals are 437/1,010 registered, 573 pending, 70,576 direct, and 71,579 valid combinations.
- Content 36/root 44 direct IDs and hosted Content 43/Results 42/Dialogs 11 IDs remain unchanged; their existing report files have diff zero.
- Final focused verification is 338/338 when the two Vite actual-mount suites are serialized (335/335 root/Content/coordinator/adapter/catalog/harness plus 3/3 Results/Dialogs). A combined parallel run was discarded after Vite returned `504 Outdated Optimize Dep`; no product assertion failed in the serialized final run.
- Final gates: admin 85/85, contract 13/13, inventory unit 17/17, state 19/19, pre-harness 157/157, harness 391/391, isolation/import/audit/reflow 46/46, DOM probe, TypeScript, production build, 153 budgets, policy, and diff checks.
- The first production build exposed the intended budget RED at global CSS 255,932 bytes. Moving pressed feedback to owned scoped styles first produced 255,495/255,500 bytes. Review then moved the sole `max-w-[45%]` utility to an equivalent owned 45% scoped rule, producing 255,465/255,500 bytes and increasing nominal headroom from 5 to 35 bytes; Dialog evidence was recaptured afterward.
- The final full `visual-qa:test` retry passes contract 13/13 and inventory unit 17/17, then stops at the known out-of-scope Landing inventory result: 15 unclassified and one stale, with zero provisional or parse errors. Results and Dialogs each contribute zero unclassified symbols.
- Existing Content/root report SHA-256 values remain `e016a716...` / `6ea759b1...` with diff zero.
- The real staged index remains exactly 110 paths with sorted-name SHA-256 `6f90df13...` and raw SHA-256 `608a61c1...`.
